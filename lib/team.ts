import { now } from './constants';
import { prisma } from './db';
import { blockers, buildRows, weightedScoreOf } from './entries';
import { getEmployeeCycleScoresBatch, pointsFromCycleScores } from './employee-year';
import type { MonthPoint } from './types';

/* ---------------------------------------------------------------------------
   A manager's own team — Home's "My Team" table, the Performance Log rail,
   and the due-now/score-trend numbers on Home all read from here. The scope
   is `leadId: managerId`: a direct-report query can only ever return this
   manager's own reports, which is the same guarantee canAccessEmployee()'s
   MANAGER branch checks — there is no external employeeId input here to
   validate against.
   --------------------------------------------------------------------------- */

export type TeamMemberStatus = 'submitted' | 'note-pending' | 'in-progress' | 'not-started';

export const STATUS_CHIP: Record<
  TeamMemberStatus,
  { label: string; tone: 'green' | 'amber' | 'cyan' | 'grey' }
> = {
  submitted: { label: 'Submitted', tone: 'green' },
  'note-pending': { label: 'Note pending', tone: 'amber' },
  'in-progress': { label: 'In progress', tone: 'cyan' },
  'not-started': { label: 'Not started', tone: 'grey' },
};

export type TeamMemberRow = {
  id: string;
  name: string;
  title: string;
  status: TeamMemberStatus;
  /** The open cycle's weighted score, once there is one to show. */
  score: number | null;
  /** Apr → Mar, from real Submission rows. */
  points: MonthPoint[];
};

export type ManagerTeam = {
  team: TeamMemberRow[];
  /** This fiscal year's cycles — already fetched to build `team`; reuse this instead of querying again. */
  cycles: Awaited<ReturnType<typeof prisma.cycle.findMany>>;
};

/** This manager's direct reports, with each one's status for the open cycle. */
export async function getManagerTeam(managerId: string, fiscalYear: string): Promise<ManagerTeam> {
  const reports = await prisma.employee.findMany({
    where: { leadId: managerId },
    orderBy: { id: 'asc' },
    select: { id: true, name: true, title: true },
  });
  const reportIds = reports.map((r) => r.id);

  // One Cycle query and one Submission query for the whole team, not one
  // pair per report — see getEmployeeCycleScoresBatch's own comment for why
  // that matters here specifically.
  const [{ scoresByEmployee, cycles }, kpis] = await Promise.all([
    getEmployeeCycleScoresBatch(reportIds, fiscalYear),
    prisma.kpi.findMany({
      where: { employeeId: { in: reportIds }, fiscalYear },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  if (reports.length === 0) return { team: [], cycles };

  // Every report's score list carries every cycle for the year — read the
  // open one off the shared cycle list rather than running a separate query.
  const openCycleId = cycles.find((c) => c.state === 'OPEN')?.id ?? null;

  const entries = openCycleId
    ? await prisma.monthlyEntry.findMany({
        where: { employeeId: { in: reportIds }, cycleId: openCycleId },
      })
    : [];

  const kpisByEmployee = new Map<string, typeof kpis>();
  for (const kpi of kpis) {
    kpisByEmployee.set(kpi.employeeId, [...(kpisByEmployee.get(kpi.employeeId) ?? []), kpi]);
  }
  const entriesByEmployee = new Map<string, typeof entries>();
  for (const entry of entries) {
    entriesByEmployee.set(entry.employeeId, [
      ...(entriesByEmployee.get(entry.employeeId) ?? []),
      entry,
    ]);
  }

  const team = reports.map((report) => {
    const scores = scoresByEmployee.get(report.id) ?? [];
    const points = pointsFromCycleScores(scores);
    const openScore = scores.find((s) => s.state === 'OPEN');

    if (openScore && openScore.weightedScore !== null) {
      return {
        id: report.id,
        name: report.name,
        title: report.title,
        status: 'submitted' as const,
        score: openScore.weightedScore,
        points,
      };
    }

    const rows = buildRows(kpisByEmployee.get(report.id) ?? [], entriesByEmployee.get(report.id) ?? []);
    const someEntered = rows.some((r) => r.achievement !== null);
    if (!someEntered) {
      return { id: report.id, name: report.name, title: report.title, status: 'not-started' as const, score: null, points };
    }

    const { missingNotes } = blockers(rows);
    if (missingNotes > 0) {
      return {
        id: report.id,
        name: report.name,
        title: report.title,
        status: 'note-pending' as const,
        score: weightedScoreOf(rows),
        points,
      };
    }

    return { id: report.id, name: report.name, title: report.title, status: 'in-progress' as const, score: null, points };
  });

  return { team, cycles };
}

function teamAverageForMonth(team: TeamMemberRow[], monthIndex: number): number | null {
  const scores = team
    .map((m) => m.points[monthIndex - 1])
    .filter((p): p is MonthPoint & { status: 'scored'; score: number } => p?.status === 'scored')
    .map((p) => p.score);
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export type LeadHomeData = {
  manager: { id: string; name: string; department: string; location: string | null };
  openCycle: { label: string; locksOnLabel: string; daysLeft: number | null } | null;
  team: TeamMemberRow[];
  dueNow: { logged: number; total: number; outstandingNames: string[] };
  scoreTrend: {
    current: { label: string; average: number | null };
    previous: { label: string; average: number | null };
  } | null;
  awaitingNoteCount: number;
  recentActivity: { who: string | null; what: string; when: string; by: string }[];
};

/** Returns null only when the manager's own Employee record doesn't exist. */
export async function getLeadHomeData(
  managerId: string,
  fiscalYear: string,
): Promise<LeadHomeData | null> {
  // Department only ever has a couple of rows — fetching all of them
  // alongside the manager and looking one up in memory is one real round
  // trip cheaper than `include: { department: true }`, which isn't a SQL
  // join here: it's a second, sequential query hidden behind one line.
  const [manager, departments] = await Promise.all([
    prisma.employee.findUnique({ where: { id: managerId } }),
    prisma.department.findMany(),
  ]);
  if (!manager) return null;
  const departmentName = departments.find((d) => d.id === manager.departmentId)?.name ?? '—';

  // getManagerTeam already fetches this fiscal year's cycles to build the
  // team — reuse them instead of a second, identical query.
  const { team, cycles } = await getManagerTeam(managerId, fiscalYear);

  const openCycleRow = cycles.find((c) => c.state === 'OPEN') ?? null;
  const openCycle = openCycleRow
    ? {
        label: openCycleRow.label,
        locksOnLabel: openCycleRow.locksOn
          ? openCycleRow.locksOn.toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })
          : 'when HR closes the cycle',
        daysLeft: openCycleRow.locksOn
          ? Math.max(0, Math.ceil((openCycleRow.locksOn.getTime() - now().getTime()) / 86_400_000))
          : null,
      }
    : null;

  const logged = team.filter((m) => m.status === 'submitted').length;
  const outstandingNames = team.filter((m) => m.status !== 'submitted').map((m) => m.name);
  const awaitingNoteCount = team.filter((m) => m.status === 'note-pending').length;

  const lockedCycles = cycles.filter((c) => c.state === 'LOCKED').sort((a, b) => b.monthIndex - a.monthIndex);
  const scoreTrend =
    lockedCycles.length > 0
      ? {
          current: {
            label: lockedCycles[0].label,
            average: teamAverageForMonth(team, lockedCycles[0].monthIndex),
          },
          previous: lockedCycles[1]
            ? { label: lockedCycles[1].label, average: teamAverageForMonth(team, lockedCycles[1].monthIndex) }
            : { label: '—', average: null },
        }
      : null;

  const reportIds = team.map((m) => m.id);
  const logs = await prisma.activityLog.findMany({
    where: { OR: [{ employeeId: { in: reportIds } }, { actorId: managerId }] },
    include: { employee: { select: { name: true } } },
    orderBy: { at: 'desc' },
    take: 6,
  });

  const actorIds = Array.from(new Set(logs.map((l) => l.actorId).filter((id): id is string => Boolean(id))));
  const actors = actorIds.length
    ? await prisma.employee.findMany({
        where: { id: { in: actorIds } },
        include: { user: { select: { role: true } } },
      })
    : [];
  const actorById = new Map(actors.map((a) => [a.id, a]));

  const recentActivity = logs.map((log) => {
    const who = log.employee?.name ?? null;
    const when = log.at.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
    let by = 'System';
    if (log.actorId === managerId) {
      by = 'by you';
    } else if (log.actorId) {
      const actor = actorById.get(log.actorId);
      by = actor ? (actor.user?.role === 'HR' ? `${actor.name}, HR` : actor.name) : log.actorId;
    }
    return { who, what: log.summary, when, by };
  });

  return {
    manager: {
      id: manager.id,
      name: manager.name,
      department: departmentName,
      location: manager.location,
    },
    openCycle,
    team,
    dueNow: { logged, total: team.length, outstandingNames },
    scoreTrend,
    awaitingNoteCount,
    recentActivity,
  };
}
