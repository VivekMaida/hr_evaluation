import type { Cycle, CycleState, Kpi, KpiType } from '@prisma/client';
import { prisma } from './db';

/* ---------------------------------------------------------------------------
   KPI effective-dating — the one place that decides which version of an
   employee's KPI set applies to a given month, and where an edit lands.
   Editing a KPI never mutates a row a month has already been scored against:
   the old row is closed out (effectiveTo set) and a new row picks up from the
   next editable month (effectiveFrom). A row with effectiveTo: null is either
   the live set (effectiveFrom at or before the current cycle) or a pending
   edit not yet in force (effectiveFrom in the future) — nextEditableMonthIndex
   is what draws that line, everything else here builds on it.
   --------------------------------------------------------------------------- */

export type KpiRow = {
  id: string;
  lineageId: string;
  name: string;
  basis: string;
  unit: string | null;
  weight: number;
  target: number;
  type: KpiType;
  lowerIsBetter: boolean;
  sortOrder: number;
  effectiveFrom: number;
  effectiveTo: number | null;
};

function toKpiRow(k: Kpi): KpiRow {
  return {
    id: k.id,
    lineageId: k.lineageId,
    name: k.name,
    basis: k.basis,
    unit: k.unit,
    weight: Number(k.weight),
    target: Number(k.target),
    type: k.type,
    lowerIsBetter: k.lowerIsBetter,
    sortOrder: k.sortOrder,
    effectiveFrom: k.effectiveFrom,
    effectiveTo: k.effectiveTo,
  };
}

/**
 * Every id a KRA lineage has ever used for this employee/fiscalYear, keyed by
 * lineageId — lets a caller holding only the *current* version's row still
 * find a locked month's entries, which were recorded against whichever
 * version was actually live that month.
 */
export async function getKpiIdsByLineage(
  employeeId: string,
  fiscalYear: string,
): Promise<Map<string, string[]>> {
  const rows = await prisma.kpi.findMany({
    where: { employeeId, fiscalYear },
    select: { id: true, lineageId: true },
  });
  const byLineage = new Map<string, string[]>();
  for (const row of rows) {
    byLineage.set(row.lineageId, [...(byLineage.get(row.lineageId) ?? []), row.id]);
  }
  return byLineage;
}

/**
 * The first month not yet frozen by an OPEN or LOCKED cycle — where a KPI
 * edit takes effect. If a cycle is OPEN, that's the month after it; failing
 * that, the month after the highest LOCKED one (the brief gap between one
 * month locking and the next opening). If neither exists — everything is
 * still FUTURE, or no Cycle rows exist yet — nothing has been scored yet, so
 * an edit takes effect immediately, month 1. Null means the fiscal year is
 * already spent: the last cycle is open or locked and there is no month left
 * to schedule an edit into.
 */
export function nextEditableMonthIndex(
  cycles: { monthIndex: number; state: CycleState }[],
): number | null {
  const open = cycles.find((c) => c.state === 'OPEN');
  if (open) return open.monthIndex + 1 > 12 ? null : open.monthIndex + 1;

  const lockedMax = cycles
    .filter((c) => c.state === 'LOCKED')
    .reduce((max, c) => Math.max(max, c.monthIndex), 0);
  if (lockedMax > 0) return lockedMax + 1 > 12 ? null : lockedMax + 1;

  return 1;
}

/** The KPI set that was (or will be) in force for one specific fiscal-year month. */
export async function getKpiSetForCycle(
  employeeId: string,
  fiscalYear: string,
  monthIndex: number,
): Promise<KpiRow[]> {
  const rows = await prisma.kpi.findMany({
    where: {
      employeeId,
      fiscalYear,
      effectiveFrom: { lte: monthIndex },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: monthIndex } }],
    },
    orderBy: { sortOrder: 'asc' },
  });
  return rows.map(toKpiRow);
}

/**
 * Same as getKpiSetForCycle, batched for many employees against the same
 * month — one query for the whole team, not one per report. See
 * getEmployeeCycleScoresBatch in lib/employee-year.ts for why that matters.
 */
export async function getKpiSetForCycleBatch(
  employeeIds: string[],
  fiscalYear: string,
  monthIndex: number,
): Promise<Map<string, KpiRow[]>> {
  const rows = await prisma.kpi.findMany({
    where: {
      employeeId: { in: employeeIds },
      fiscalYear,
      effectiveFrom: { lte: monthIndex },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: monthIndex } }],
    },
    orderBy: { sortOrder: 'asc' },
  });

  const byEmployee = new Map<string, KpiRow[]>();
  for (const row of rows) {
    const list = byEmployee.get(row.employeeId) ?? [];
    list.push(toKpiRow(row));
    byEmployee.set(row.employeeId, list);
  }
  return byEmployee;
}

export type CurrentAndPendingKpiSets = {
  current: KpiRow[];
  /** Empty unless someone has already saved an edit not yet in force. */
  pending: KpiRow[];
  /** Null unless `pending` is non-empty. */
  pendingFromMonthIndex: number | null;
  pendingFromCycle: Cycle | null;
  /** This fiscal year's cycles — already fetched to split current/pending; reuse instead of querying again. */
  cycles: Cycle[];
};

/**
 * What's live right now vs what's scheduled to take over next — the "live
 * now" / "takes effect from" split the KPI editor and Profile render.
 *
 * "Current" is NOT simply "effectiveTo: null" — the moment an edit closes a
 * row out (effectiveTo set to pendingFrom - 1), it's still the live set for
 * every cycle up to and including that month, so it has to be looked up the
 * same range-scoped way getKpiSetForCycle finds any other month's set. Only
 * "pending" (still effectiveTo: null, but not due to start until pendingFrom)
 * can be found with a flat filter.
 */
export async function getCurrentAndPendingKpiSets(
  employeeId: string,
  fiscalYear: string,
): Promise<CurrentAndPendingKpiSets> {
  const cycles = await prisma.cycle.findMany({ where: { fiscalYear } });
  const pendingFrom = nextEditableMonthIndex(cycles);

  // Nothing has ever gone live (pre-season), or the fiscal year is spent —
  // either way there is no live/pending split to draw: whatever is still
  // active is simply "current."
  if (pendingFrom === null || pendingFrom === 1) {
    const rows = await prisma.kpi.findMany({
      where: { employeeId, fiscalYear, effectiveTo: null },
      orderBy: { sortOrder: 'asc' },
    });
    return {
      current: rows.map(toKpiRow),
      pending: [],
      pendingFromMonthIndex: null,
      pendingFromCycle: null,
      cycles,
    };
  }

  const [current, pendingRows] = await Promise.all([
    getKpiSetForCycle(employeeId, fiscalYear, pendingFrom - 1),
    prisma.kpi.findMany({
      where: { employeeId, fiscalYear, effectiveTo: null, effectiveFrom: { gte: pendingFrom } },
      orderBy: { sortOrder: 'asc' },
    }),
  ]);

  return {
    current,
    pending: pendingRows.map(toKpiRow),
    pendingFromMonthIndex: pendingRows.length > 0 ? pendingFrom : null,
    pendingFromCycle: pendingRows.length > 0 ? (cycles.find((c) => c.monthIndex === pendingFrom) ?? null) : null,
    cycles,
  };
}

export function weightTotal(items: { weight: number }[]): number {
  return items.reduce((sum, i) => sum + i.weight, 0);
}

/* ---------------------------------------------------------------------------
   The change log — every KPI field edit, add and removal, for Profile's
   "Recent changes" list. Written by saveKpiSet in
   app/profile/[employeeId]/actions.ts.
   --------------------------------------------------------------------------- */

export const KPI_CHANGE_KINDS = ['KPI_FIELD_EDITED', 'KPI_ADDED', 'KPI_REMOVED'] as const;

export type KpiChangeItem = {
  atLabel: string;
  actorName: string;
  summary: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  effectiveFromLabel: string | null;
};

type KpiChangeMeta = { field?: string; oldValue?: string; newValue?: string };

/** Last few KPI edits for one employee, newest first — same actor-batching pattern as getLeadHomeData's recentActivity. */
export async function getRecentKpiChanges(employeeId: string, take = 10): Promise<KpiChangeItem[]> {
  const logs = await prisma.activityLog.findMany({
    where: { employeeId, kind: { in: [...KPI_CHANGE_KINDS] } },
    include: { cycle: { select: { label: true } } },
    orderBy: { at: 'desc' },
    take,
  });

  const actorIds = Array.from(new Set(logs.map((l) => l.actorId).filter((id): id is string => Boolean(id))));
  const actors = actorIds.length
    ? await prisma.employee.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } })
    : [];
  const actorNameById = new Map(actors.map((a) => [a.id, a.name]));

  return logs.map((log) => {
    const meta = (log.meta ?? {}) as KpiChangeMeta;
    return {
      atLabel: log.at.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      }),
      actorName: (log.actorId && actorNameById.get(log.actorId)) || 'System',
      summary: log.summary,
      field: meta.field ?? null,
      oldValue: meta.oldValue ?? null,
      newValue: meta.newValue ?? null,
      effectiveFromLabel: log.cycle?.label ?? null,
    };
  });
}
