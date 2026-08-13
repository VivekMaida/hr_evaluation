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
