import type { Role } from '@prisma/client';
import { getAcknowledgements, type AcknowledgementItem } from './acknowledgements';
import { FISCAL_YEAR, FY_LABEL, SHOW_PROFILE_RECORD } from './constants';
import { prisma } from './db';
import { getEmployeeCycleScores } from './employee-year';
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

/** 1 = April of the fiscal year's start year, 12 = March of the next. */
function eligibleFromMonthIndex(joinedOn: Date | null, fiscalYear: string): number {
  if (!joinedOn) return 1;
  const [startYear] = fiscalYear.split('-').map(Number);
  const fyStart = new Date(startYear, 3, 1);
  if (joinedOn <= fyStart) return 1;
  const monthsSinceStart =
    (joinedOn.getFullYear() - fyStart.getFullYear()) * 12 + (joinedOn.getMonth() - fyStart.getMonth());
  return Math.min(12, Math.max(1, monthsSinceStart + 1));
}

/** Returns null only when the employee (or their account) doesn't exist. */
export async function getProfileData(employeeId: string): Promise<ProfileData | null> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { department: true, lead: true, user: true },
  });
  if (!employee || !employee.user) return null;

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
      email: employee.user.email,
      title: employee.title,
      departmentId: employee.departmentId,
      department: employee.department.name,
      leadId: employee.leadId,
      managerName: employee.lead?.name ?? null,
      joinedOn: employee.joinedOn,
      location: employee.location,
      role: employee.user.role,
    },
    thisCycle,
    kpis,
    acknowledgements,
    record,
    lastLoginAtLabel: employee.user.lastLoginAt
      ? employee.user.lastLoginAt.toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: 'numeric',
          minute: '2-digit',
        })
      : null,
    mustSetPassword: employee.user.mustSetPassword,
  };
}
