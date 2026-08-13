import { prisma } from './db';

/* ---------------------------------------------------------------------------
   Org-wide numbers for HR's Home — the completeness heatmap and the
   exception-request queue. "Eligible" below means "has a Kpi row for the
   fiscal year" — a lead or HR person doesn't log against KPIs themselves in
   this scheme, so they're not part of the denominator any completeness
   percentage is computed over.
   --------------------------------------------------------------------------- */

export type DepartmentCompleteness = {
  name: string;
  staff: number;
  /** Apr → Jan, percentage of eligible staff submitted. */
  closed: number[];
  /** The open cycle. */
  february: number;
  ytd: number;
};

/** Four steps, not a continuous ramp — the eye should count bands, not judge shades. */
export function completenessCell(value: number): {
  background: string;
  color: string;
  fontWeight: number;
} {
  if (value >= 100)
    return { background: 'var(--green)', color: 'var(--white)', fontWeight: 700 };
  if (value >= 85)
    return { background: 'var(--tint-green)', color: 'var(--navy)', fontWeight: 400 };
  if (value >= 60)
    return { background: 'var(--tint-amber)', color: 'var(--amber)', fontWeight: 400 };
  return { background: 'var(--tint-red)', color: 'var(--red)', fontWeight: 400 };
}

export type OrgCompleteness = {
  totals: {
    employees: number;
    leads: number;
    februaryPercent: number;
    februaryLogged: number;
    februaryEligible: number;
    daysLeftLabel: string | null;
    ytdPercent: number;
    departmentsUnder80: number;
    departmentsUnder80Names: string;
  };
  /** Only departments with at least one eligible (KPI-bearing) employee. */
  departments: DepartmentCompleteness[];
  total: DepartmentCompleteness;
};

export async function getOrgCompleteness(fiscalYear: string): Promise<OrgCompleteness> {
  const [employeesCount, leadsCount, departments, cycles] = await Promise.all([
    prisma.employee.count(),
    prisma.user.count({ where: { role: 'MANAGER' } }),
    prisma.department.findMany({
      include: {
        employees: {
          select: { id: true, kpis: { where: { fiscalYear }, select: { id: true } } },
        },
      },
    }),
    prisma.cycle.findMany({ where: { fiscalYear }, orderBy: { monthIndex: 'asc' } }),
  ]);

  const openCycle = cycles.find((c) => c.state === 'OPEN') ?? null;
  const lockedCycles = cycles.filter((c) => c.state === 'LOCKED');

  const eligibleByDept = departments
    .map((d) => ({
      name: d.name,
      employeeIds: d.employees.filter((e) => e.kpis.length > 0).map((e) => e.id),
    }))
    .filter((d) => d.employeeIds.length > 0);

  const allEligibleIds = eligibleByDept.flatMap((d) => d.employeeIds);

  const submissions = allEligibleIds.length
    ? await prisma.submission.findMany({
        where: { employeeId: { in: allEligibleIds }, state: 'SUBMITTED', cycle: { fiscalYear } },
        select: { employeeId: true, cycleId: true },
      })
    : [];
  const submittedSet = new Set(submissions.map((s) => `${s.employeeId}:${s.cycleId}`));

  function completenessFor(employeeIds: string[], cycleId: string): number {
    if (employeeIds.length === 0) return 0;
    const done = employeeIds.filter((id) => submittedSet.has(`${id}:${cycleId}`)).length;
    return Math.round((done / employeeIds.length) * 100);
  }

  function ytdOf(closed: number[]): number {
    return closed.length === 0 ? 0 : Math.round(closed.reduce((a, b) => a + b, 0) / closed.length);
  }

  const departmentRows: DepartmentCompleteness[] = eligibleByDept.map((d) => {
    const closed = lockedCycles.map((c) => completenessFor(d.employeeIds, c.id));
    return {
      name: d.name,
      staff: d.employeeIds.length,
      closed,
      february: openCycle ? completenessFor(d.employeeIds, openCycle.id) : 0,
      ytd: ytdOf(closed),
    };
  });

  const totalClosed = lockedCycles.map((c) => completenessFor(allEligibleIds, c.id));
  const total: DepartmentCompleteness = {
    name: 'All departments',
    staff: allEligibleIds.length,
    closed: totalClosed,
    february: openCycle ? completenessFor(allEligibleIds, openCycle.id) : 0,
    ytd: ytdOf(totalClosed),
  };

  const under80 = departmentRows.filter((d) => d.ytd < 80);
  const februaryLogged = openCycle
    ? allEligibleIds.filter((id) => submittedSet.has(`${id}:${openCycle.id}`)).length
    : 0;
  const daysLeftLabel = openCycle?.locksOn
    ? `locks in ${Math.max(
        0,
        Math.ceil((openCycle.locksOn.getTime() - Date.now()) / 86_400_000),
      )} days`
    : null;

  return {
    totals: {
      employees: employeesCount,
      leads: leadsCount,
      februaryPercent: total.february,
      februaryLogged,
      februaryEligible: allEligibleIds.length,
      daysLeftLabel,
      ytdPercent: total.ytd,
      departmentsUnder80: under80.length,
      departmentsUnder80Names: under80.length ? under80.map((d) => d.name).join(' · ') : '—',
    },
    departments: departmentRows,
    total,
  };
}

export type PendingException = {
  id: string;
  employeeName: string;
  department: string;
  detail: string;
  daysWaiting: number;
};

export async function getPendingExceptions(): Promise<PendingException[]> {
  const rows = await prisma.exceptionRequest.findMany({
    where: { state: 'PENDING' },
    include: { employee: { select: { name: true, department: { select: { name: true } } } } },
    orderBy: { raisedAt: 'asc' },
  });

  return rows.map((r) => ({
    id: r.id,
    employeeName: r.employee.name,
    department: r.employee.department.name,
    detail: r.detail,
    daysWaiting: Math.max(
      0,
      Math.round((Date.now() - r.raisedAt.getTime()) / 86_400_000),
    ),
  }));
}
