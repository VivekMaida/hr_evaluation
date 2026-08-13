/**
 * Pilot-wide scenario constants — the shared fiscal year every viewer sees,
 * not data about any person or team. Nothing here should ever need
 * `canAccessEmployee()`; if a constant here starts describing someone's
 * record instead of the calendar, it belongs in a DB-backed module instead.
 *
 * The pilot runs on real wall-clock time — there is no fixed "today." Date
 * math against real Cycle rows uses `Date.now()` directly at the call site;
 * `todayLabel()` below is the one place "today," formatted for display, is
 * computed — as a function, not a constant, so it never freezes at server
 * start and goes stale.
 */
export const FISCAL_YEAR = '2026-27';
export const FY_LABEL = `FY ${FISCAL_YEAR.replace('-', '–')}`;

const [FY_START_YEAR] = FISCAL_YEAR.split('-').map(Number);
/** "April 2026 to March 2027" — the fiscal year's month range in prose. */
export const FY_RANGE_LABEL = `April ${FY_START_YEAR} to March ${FY_START_YEAR + 1}`;

/** Real wall-clock "today", formatted for display chrome (e.g. Home's header). */
export function todayLabel(): string {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Config flag, not employee data — gates Profile's "My record" section
 * (year strip, average, consistency, trend, coverage). Off for the pilot;
 * flip once that level of self-service is actually wanted.
 */
export const SHOW_PROFILE_RECORD = false;

/**
 * Gates the whole employee self-service surface: Home's own-record view,
 * Scorecard's own-record view, Acknowledge, Raise a query, and Reviews'
 * own-record view (their finalized annual rating).
 *
 * - 'hidden'     — none of it. An employee signing in sees Profile only.
 * - 'after-lock' — visible, but the current OPEN month is withheld until its
 *                  cycle locks (whatever real data exists for it is masked).
 * - 'immediate'  — visible as soon as it's entered, open month included.
 *
 * Historical LOCKED months are always fully visible once this isn't 'hidden'
 * — the after-lock/immediate difference only ever affects the one open month.
 * It has no bearing on Reviews, which gates on the AnnualReview's own state
 * instead (see lib/reviews.ts's isFinalized) — an employee never sees a draft
 * rating regardless of this flag. This does not affect what a Manager or HR
 * sees; they always see everything.
 */
export type EmployeeRecordVisibility = 'hidden' | 'after-lock' | 'immediate';
export const EMPLOYEE_RECORD_VISIBILITY: EmployeeRecordVisibility = 'hidden';
