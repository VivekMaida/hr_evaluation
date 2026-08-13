/**
 * Pilot-wide scenario constants — the shared fiscal year every viewer sees,
 * not data about any person or team. Nothing here should ever need
 * `canAccessEmployee()`; if a constant here starts describing someone's
 * record instead of the calendar, it belongs in a DB-backed module instead.
 *
 * The pilot runs on real wall-clock time — there is no fixed "today." All
 * date math (here, lib/org.ts, lib/team.ts, prisma/seed-pilot.ts) goes
 * through `now()` below rather than calling `Date.now()`/`new Date()`
 * directly, so there is exactly one place local preview can override it.
 */
export const FISCAL_YEAR = '2026-27';
export const FY_LABEL = `FY ${FISCAL_YEAR.replace('-', '–')}`;

const [FY_START_YEAR] = FISCAL_YEAR.split('-').map(Number);
/** "April 2026 to March 2027" — the fiscal year's month range in prose. */
export const FY_RANGE_LABEL = `April ${FY_START_YEAR} to March ${FY_START_YEAR + 1}`;

if (process.env.NODE_ENV !== 'production' && process.env.PREVIEW_NOW) {
  console.warn(
    `⚠ PREVIEW_NOW is set — pretending it's ${process.env.PREVIEW_NOW}. This must never be set ` +
      `outside local development (see now() below). Re-run "npm run db:seed:pilot" after unsetting ` +
      `it to restore the real Cycle state.`,
  );
}

/**
 * Real wall-clock time — except locally, where `PREVIEW_NOW` in .env.local
 * can override it, e.g. to preview what Performance Log will look like on
 * 1 September 2026 without hand-editing any stored Cycle row (which would
 * just be overwritten the next time prisma/seed-pilot.ts runs anyway).
 *
 * Ignored whenever `NODE_ENV === 'production'`, so it cannot reach the
 * deployed app even if the variable is somehow set there — Next.js sets
 * that automatically for `next build`/`next start`; this only ever takes
 * effect under `next dev` or a locally-run script, and only when you've
 * deliberately set the variable in `.env.local`.
 *
 * To preview a date: set `PREVIEW_NOW=2026-09-01T00:00:00+05:30` in
 * .env.local, run `npm run db:seed:pilot` (recomputes Cycle state as of
 * that moment), then `npm run dev`. To switch back: remove the variable and
 * run `npm run db:seed:pilot` again to restore the real state.
 */
export function now(): Date {
  if (process.env.NODE_ENV !== 'production' && process.env.PREVIEW_NOW) {
    const override = new Date(process.env.PREVIEW_NOW);
    if (!Number.isNaN(override.getTime())) return override;
  }
  return new Date();
}

/** "Today", formatted for display chrome (e.g. Home's header) — see now(). */
export function todayLabel(): string {
  return now().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * The programme's own first eligible month — before this, nobody's record
 * has anything in it, and never will, regardless of who joined when. Only
 * ever binds for the fiscal year it falls in; every fiscal year after this
 * one, it's earlier than that year's own April 1 and so never applies —
 * eligibility from then on depends only on each employee's own `joinedOn`.
 * See `eligibleFromMonthIndex()` in lib/employee-year.ts, the one place this
 * and `joinedOn` are combined.
 */
export const PROGRAMME_START = new Date('2026-08-01T00:00:00+05:30');

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
