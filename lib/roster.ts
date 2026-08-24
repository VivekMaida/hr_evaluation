import type { Actor } from './access';
import { prisma } from './db';
import {
  eligibleFromMonthIndex,
  eligibleMonthCount,
  getEmployeeCycleScoresBatch,
  monthsLogged as countMonthsLogged,
  pointsFromCycleScores,
  yearAverage as computeYearAverage,
} from './employee-year';
import type { MonthPoint } from './types';

/* ---------------------------------------------------------------------------
   The people a signed-in person may open a record for — the list behind the
   team-scoped /scorecard and /reviews index screens.

   The scope here is deliberately the same boundary canAccessEmployee() draws,
   read the other way round: that function answers "may this actor see this
   id", this one answers "which ids are those". A manager gets their direct
   reports (`leadId: actor`), HR gets the whole roster, an employee gets
   nobody — they have no team, and their own record is not a list. Keeping the
   two in step matters because the index links straight into the [employeeId]
   routes, which check canAccessEmployee themselves: anything this returned
   that that rejected would render as a row leading to a 403.

   Every figure here is the same figure the record screens compute, from the
   same helpers — `eligibleMonths` is the whole remaining year exactly as
   getReviewData()'s is, and the average is over every logged month. A row
   that disagreed with the page it links to would be worse than no row.
   --------------------------------------------------------------------------- */

export type RosterRow = {
  id: string;
  name: string;
  title: string;
  department: string;
  /**
   * Who this person reports to, by name. Null when the lead is not in the
   * fetched set — which for a manager's own team is always, since the lead is
   * the viewer. Only the HR roster has a column worth showing it in.
   */
  leadName: string | null;
  /** Apr → Mar, from real Submission rows. */
  points: MonthPoint[];
  /** The open cycle's weighted score, once it has been submitted. */
  openScore: number | null;
  /** Average of the months on record — the figure Reviews rates. */
  yearAverage: number | null;
  monthsLogged: number;
  /** Eligible months in the year, the denominator coverage is judged against. */
  eligibleMonths: number;
};

export type VisibleRoster = {
  rows: RosterRow[];
  /** The open cycle's label, for the "this month" column heading. */
  openCycleLabel: string | null;
};

/**
 * Everyone `actor` can open a record for, by name.
 *
 * Three queries for a roster of any size — employees, departments, and the
 * one batched Cycle/Submission pair — not three per person. HR's roster is
 * the whole company, so an N+1 here would be an N+1 at its worst.
 */
export async function getVisibleRoster(
  actor: Actor,
  fiscalYear: string,
): Promise<VisibleRoster> {
  if (actor.role === 'EMPLOYEE') return { rows: [], openCycleLabel: null };
  const isHr = actor.role === 'HR';

  // Department is a handful of rows; fetching all of them and joining in
  // memory costs one round trip, where a nested relation select costs one
  // more query on top of this one. Same reasoning as getLeadHomeData().
  const [people, departments] = await Promise.all([
    prisma.employee.findMany({
      where: isHr ? {} : { leadId: actor.employeeId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        title: true,
        joinedOn: true,
        leadId: true,
        departmentId: true,
      },
    }),
    prisma.department.findMany({ select: { id: true, name: true } }),
  ]);

  const departmentName = new Map(departments.map((d) => [d.id, d.name]));
  // Built before the viewer is filtered out, so an HR user who is somebody's
  // lead still resolves as that person's lead in the column.
  const nameById = new Map(people.map((p) => [p.id, p.name]));

  // HR's query is unfiltered, so it returns the viewer too; their own record
  // is reached from "My record", not from a row in their own team list.
  const subjects = people.filter((p) => p.id !== actor.employeeId);
  if (subjects.length === 0) return { rows: [], openCycleLabel: null };

  const { scoresByEmployee, cycles } = await getEmployeeCycleScoresBatch(
    subjects.map((p) => p.id),
    fiscalYear,
  );
  const openCycle = cycles.find((c) => c.state === 'OPEN') ?? null;

  const rows = subjects.map((person) => {
    const scores = scoresByEmployee.get(person.id) ?? [];
    const fromIndex = eligibleFromMonthIndex(person.joinedOn, fiscalYear);
    const openScore = scores.find((s) => s.state === 'OPEN')?.weightedScore ?? null;

    return {
      id: person.id,
      name: person.name,
      title: person.title,
      department: departmentName.get(person.departmentId) ?? '—',
      leadName: person.leadId ? (nameById.get(person.leadId) ?? null) : null,
      points: pointsFromCycleScores(scores, fromIndex),
      openScore,
      yearAverage: computeYearAverage(scores),
      monthsLogged: countMonthsLogged(scores, fromIndex),
      eligibleMonths: eligibleMonthCount(fromIndex),
    };
  });

  return { rows, openCycleLabel: openCycle?.label ?? null };
}
