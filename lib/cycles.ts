import type { CycleState } from '@prisma/client';

/* ---------------------------------------------------------------------------
   Real-clock cycle windows and state — the replacement for a static
   stateFor(index). A month's entry window opens the instant that calendar
   month ends and locks on the 7th of the month after; state is FUTURE before
   the window opens, OPEN inside it, LOCKED once locksOn has passed. Used by
   prisma/seed-pilot.ts; prisma/seed.ts's fixture scenario is untouched and
   keeps its own static, demo-only state assignment.
   --------------------------------------------------------------------------- */

/** Zero-padded ISO datetime in IST — the timezone every scheduled date in this app is written against. */
function ist(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date {
  const pad = (n: number) => String(n).padStart(2, '0');
  return new Date(
    `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}+05:30`,
  );
}

/** 1 = April of the fiscal year's start year, 12 = March of the next. */
export function calendarMonthFor(
  monthIndex: number,
  fyStartYear: number,
): { year: number; month: number } {
  return monthIndex <= 9
    ? { year: fyStartYear, month: monthIndex + 3 }
    : { year: fyStartYear + 1, month: monthIndex - 9 };
}

function nextCalendarMonth({ year, month }: { year: number; month: number }): {
  year: number;
  month: number;
} {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

/**
 * The real-clock window for one fiscal-year month. The entry window opens
 * the instant the month itself ends and locks on the 7th of the following
 * month, 23:59:59 IST — August 2026 opens 1 September, locks 7 September.
 */
export function cycleWindowFor(
  monthIndex: number,
  fyStartYear: number,
): { opensOn: Date; locksOn: Date } {
  const next = nextCalendarMonth(calendarMonthFor(monthIndex, fyStartYear));
  return {
    opensOn: ist(next.year, next.month, 1),
    locksOn: ist(next.year, next.month, 7, 23, 59, 59),
  };
}

/**
 * Derives a cycle's state from the real clock and its own window — not a
 * static position in an array. FUTURE before the entry window opens, OPEN
 * from then until locksOn, LOCKED once locksOn has passed.
 */
export function cycleStateFor(window: { opensOn: Date; locksOn: Date }, now: Date): CycleState {
  if (now < window.opensOn) return 'FUTURE';
  if (now <= window.locksOn) return 'OPEN';
  return 'LOCKED';
}

/* ---------------------------------------------------------------------------
   Read-time state derivation.

   The stored `Cycle.state` column is a snapshot written by the seed; it is
   never read by the application. State is derived from `opensOn`/`locksOn`
   against the real clock every time a cycle is read, so a month opens and
   locks on its own schedule with nothing to run and nothing to remember.
   The alternative — a scheduled job writing the column — can silently stop,
   and until it next fires the database disagrees with reality. For a product
   whose claim is that a locked month is evidence, that gap is the whole
   problem, so there must not be one.

   Every `prisma.cycle` read in the app passes its rows through
   `deriveCycles()` (or `deriveCycle()`), which overwrites `state` with the
   derived value. Downstream `state === 'OPEN'` checks then keep working
   unchanged.
   --------------------------------------------------------------------------- */

/** The minimum a row needs for its state to be derivable. */
type DerivableCycle = {
  state: CycleState;
  opensOn: Date | null;
  locksOn: Date | null;
};

/**
 * A cycle's real state right now. Falls back to the stored column only when
 * the row has no window at all to derive from — the fixture seed leaves
 * `opensOn` null on most of its demo cycles, and those must not all collapse
 * to FUTURE.
 */
export function resolveCycleState<T extends DerivableCycle>(cycle: T, now: Date): CycleState {
  if (!cycle.opensOn || !cycle.locksOn) return cycle.state;
  return cycleStateFor({ opensOn: cycle.opensOn, locksOn: cycle.locksOn }, now);
}

export function deriveCycle<T extends DerivableCycle>(cycle: T, now: Date): T {
  return { ...cycle, state: resolveCycleState(cycle, now) };
}

export function deriveCycles<T extends DerivableCycle>(cycles: T[], now: Date): T[] {
  return cycles.map((c) => deriveCycle(c, now));
}

/* ---------------------------------------------------------------------------
   Early opening.

   August 2026 is the pilot's first loggable month. Its natural window would
   not open until 1 September, but the team needs the form before then, so it
   is opened early — while still locking on its normal date, 7 September, so
   the month is no longer than any other.

   This lives here rather than as a hand-edited database row so that
   re-running the seed cannot silently undo it.
   --------------------------------------------------------------------------- */

export type EarlyOpen = {
  fiscalYear: string;
  monthIndex: number;
  /** Replaces the natural opensOn. locksOn is left at its normal date. */
  opensOn: Date;
  /** Shown in the UI wherever the open cycle is named. */
  note: string;
};

export const EARLY_OPEN: EarlyOpen[] = [
  {
    fiscalYear: '2026-27',
    monthIndex: 5, // August 2026
    opensOn: ist(2026, 8, 21),
    note: 'opened early for the pilot',
  },
];

export function earlyOpenFor(fiscalYear: string, monthIndex: number): EarlyOpen | null {
  return EARLY_OPEN.find((e) => e.fiscalYear === fiscalYear && e.monthIndex === monthIndex) ?? null;
}

/**
 * The window a cycle should actually be written with — the natural one, with
 * `opensOn` pulled earlier if this month has an early-open override.
 */
export function effectiveCycleWindow(
  fiscalYear: string,
  monthIndex: number,
  fyStartYear: number,
): { opensOn: Date; locksOn: Date } {
  const natural = cycleWindowFor(monthIndex, fyStartYear);
  const early = earlyOpenFor(fiscalYear, monthIndex);
  return early ? { opensOn: early.opensOn, locksOn: natural.locksOn } : natural;
}

/**
 * True when this cycle's stored window opens earlier than its natural one —
 * what the UI keys the "open early" note off, so the note follows the data
 * rather than hardcoding a month name in a component.
 */
export function isEarlyOpened(
  cycle: { fiscalYear: string; monthIndex: number; opensOn: Date | null },
): boolean {
  if (!cycle.opensOn) return false;
  const [fyStartYear] = cycle.fiscalYear.split('-').map(Number);
  return cycle.opensOn < cycleWindowFor(cycle.monthIndex, fyStartYear).opensOn;
}

/** The early-open note for a cycle, or null when it opened on its normal date. */
export function earlyOpenNote(
  cycle: { fiscalYear: string; monthIndex: number; opensOn: Date | null },
): string | null {
  if (!isEarlyOpened(cycle)) return null;
  return earlyOpenFor(cycle.fiscalYear, cycle.monthIndex)?.note ?? 'opened early';
}
