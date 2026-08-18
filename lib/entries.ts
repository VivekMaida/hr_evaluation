import type { KpiRow } from './kpi';

/** A context note is required when achievement lands outside this band. */
export const NOTE_BAND = { low: 70, high: 120 } as const;

export type EntryInput = {
  kpiId: string;
  actual: number | null;
  contextNote: string | null;
};

export type EntryRow = {
  kpiId: string;
  name: string;
  basis: string;
  weight: number;
  target: number;
  lowerIsBetter: boolean;
  actual: number | null;
  contextNote: string | null;
  achievement: number | null;
  needsNote: boolean;
};

/**
 * Achievement against target, uncapped. "Lower is better" KPIs (TAT,
 * escalations) invert the maths — target divided by actual.
 */
export function achievementOf(
  target: number,
  actual: number | null,
  lowerIsBetter: boolean,
): number | null {
  if (actual === null || !Number.isFinite(actual)) return null;
  if (lowerIsBetter) return actual === 0 ? null : (target / actual) * 100;
  return target === 0 ? null : (actual / target) * 100;
}

export function outsideBand(achievement: number | null): boolean {
  if (achievement === null) return false;
  return achievement < NOTE_BAND.low || achievement > NOTE_BAND.high;
}

/**
 * Weighted achievement percentage out of the KPIs that have an actual. A
 * part-entered month reads as a score of what has been logged rather than a
 * collapse to zero.
 */
export function weightedScoreOf(
  rows: { weight: number; achievement: number | null }[],
): number | null {
  let weighted = 0;
  let base = 0;
  for (const row of rows) {
    if (row.achievement === null) continue;
    weighted += row.achievement * row.weight;
    base += row.weight;
  }
  return base === 0 ? null : weighted / base;
}

/** Rows that would block a submit, and why. */
export function blockers(rows: EntryRow[]): {
  missingActuals: number;
  missingNotes: number;
  blocked: boolean;
} {
  const missingActuals = rows.filter((r) => r.achievement === null).length;
  const missingNotes = rows.filter(
    (r) => r.needsNote && !(r.contextNote ?? '').trim(),
  ).length;
  return {
    missingActuals,
    missingNotes,
    blocked: missingActuals > 0 || missingNotes > 0,
  };
}

type EntryRecord = { kpiId: string; actual: unknown; contextNote: string | null };

/** Join the KPI set to whatever has been entered so far. */
export function buildRows(kpis: KpiRow[], entries: EntryRecord[]): EntryRow[] {
  const byKpi = new Map(entries.map((e) => [e.kpiId, e]));

  return kpis.map((kpi) => {
    const entry = byKpi.get(kpi.id);
    const actual =
      entry?.actual === null || entry?.actual === undefined ? null : Number(entry.actual);
    const achievement = achievementOf(kpi.target, actual, kpi.lowerIsBetter);

    return {
      kpiId: kpi.id,
      name: kpi.name,
      basis: kpi.basis,
      weight: kpi.weight,
      target: kpi.target,
      lowerIsBetter: kpi.lowerIsBetter,
      actual,
      contextNote: entry?.contextNote ?? null,
      achievement,
      needsNote: outsideBand(achievement),
    };
  });
}
