import type { Role } from '@prisma/client';
import { getAcknowledgements, type AcknowledgementItem } from './acknowledgements';
import { FISCAL_YEAR, FY_LABEL, SHOW_PROFILE_RECORD } from './constants';
import { prisma } from './db';
import { eligibleFromMonthIndex, getEmployeeCycleScores } from './employee-year';
import { getScorecardData } from './scorecard';
import type { ScorecardSubject } from './scorecard';

/* ---------------------------------------------------------------------------
   Profile — one screen, all roles, scoped to a single employeeId. The caller
   (the page) decides who that employeeId belongs to and whether they're
   allowed to see it; everything here just reads for whichever id it's given.
   --------------------------------------------------------------------------- */

export type ProfileIdentity = {
  id: string;
  name: string;
  email: string;
  title: string;
  departmentId: string;
  department: string;
  leadId: string | null;
  managerName: string | null;
  joinedOn: Date | null;
  location: string | null;
  role: Role;
};

export type ThisCycle = {
  fiscalYearLabel: string;
  eligibleFromLabel: string;
  eligibleToLabel: string;
  eligibleCount: number;
  logged: number;
  /** Set only when eligibility is narrower than the full twelve months. */
  joinerNote: string | null;
};

export type KpiSetItem = {
  id: string;
  name: string;
  basis: string;
  weight: number;
  target: number;
  lowerIsBetter: boolean;
};

export type KpiSet = {
  items: KpiSetItem[];
  fiscalYearLabel: string;
  effectiveDateLabel: string | null;
};

export type ProfileData = {
  identity: ProfileIdentity;
  thisCycle: ThisCycle;
  kpis: KpiSet;
  acknowledgements: AcknowledgementItem[];
  /** null when the flag is off; { subject: null } when on but nothing logged. */
  record: { subject: ScorecardSubject | null } | null;
  lastLoginAtLabel: string | null;
  mustSetPassword: boolean;
};

/** First name only, for a one-line explanatory sentence — not a display field. */
function firstName(name: string): string {
  return name.split(' ')[0] ?? name;
}

/** Returns null only when the employee (or their account) doesn't exist. */
export async function getProfileData(employeeId: string): Promise<ProfileData | null> {
  // department/lead/user as their own parallel queries rather than a nested
  // `include` — that isn't a SQL join here, it's three more sequential round
  // trips hidden behind one line. Department has only a couple of rows;
  // fetching all of them is cheaper than the include either way. `user` and
  // `departments` don't depend on `employee` resolving, so all three run
  // together; only `lead` genuinely needs employee.leadId first.
  const [employee, user, departments] = await Promise.all([
    prisma.employee.findUnique({ where: { id: employeeId } }),
    prisma.user.findUnique({ where: { employeeId } }),
    prisma.department.findMany(),
  ]);
  if (!employee || !user) return null;
  const department = departments.find((d) => d.id === employee.departmentId);
  const lead = employee.leadId
    ? await prisma.employee.findUnique({ where: { id: employee.leadId }, select: { name: true } })
    : null;

  const [scores, kpiRows, acknowledgements] = await Promise.all([
    getEmployeeCycleScores(employeeId, FISCAL_YEAR),
    prisma.kpi.findMany({ where: { employeeId, fiscalYear: FISCAL_YEAR }, orderBy: { sortOrder: 'asc' } }),
    getAcknowledgements(employeeId),
  ]);

  const fromIndex = eligibleFromMonthIndex(employee.joinedOn, FISCAL_YEAR);
  const eligibleScores = scores.filter((s) => s.monthIndex >= fromIndex);
  const logged = eligibleScores.filter((s) => s.weightedScore !== null).length;

  const thisCycle: ThisCycle = {
    fiscalYearLabel: FY_LABEL,
    eligibleFromLabel: eligibleScores[0]?.label ?? '—',
    eligibleToLabel: eligibleScores[eligibleScores.length - 1]?.label ?? '—',
    eligibleCount: eligibleScores.length,
    logged,
    joinerNote:
      fromIndex > 1
        ? `${firstName(employee.name)} joined in ${eligibleScores[0]?.label ?? 'the fiscal year'}, so only ${eligibleScores.length} month${eligibleScores.length === 1 ? '' : 's'} of ${FY_LABEL} count toward coverage — not the full twelve.`
        : null,
  };

  const effectiveDate = kpiRows.length
    ? new Date(Math.min(...kpiRows.map((k) => k.createdAt.getTime())))
    : null;
  const kpis: KpiSet = {
    items: kpiRows.map((k) => ({
      id: k.id,
      name: k.name,
      basis: k.basis,
      weight: Number(k.weight),
      target: Number(k.target),
      lowerIsBetter: k.lowerIsBetter,
    })),
    fiscalYearLabel: FY_LABEL,
    effectiveDateLabel: effectiveDate
      ? effectiveDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : null,
  };

  let record: ProfileData['record'] = null;
  if (SHOW_PROFILE_RECORD) {
    const scorecard = await getScorecardData(employeeId);
    record = { subject: scorecard?.subject ?? null };
  }

  return {
    identity: {
      id: employee.id,
      name: employee.name,
      email: user.email,
      title: employee.title,
      departmentId: employee.departmentId,
      department: department?.name ?? '—',
      leadId: employee.leadId,
      managerName: lead?.name ?? null,
      joinedOn: employee.joinedOn,
      location: employee.location,
      role: user.role,
    },
    thisCycle,
    kpis,
    acknowledgements,
    record,
    lastLoginAtLabel: user.lastLoginAt
      ? user.lastLoginAt.toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: 'numeric',
          minute: '2-digit',
        })
      : null,
    mustSetPassword: user.mustSetPassword,
  };
}
