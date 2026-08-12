/**
 * Pilot-wide scenario constants — the shared "today" and fiscal year every
 * viewer sees, not data about any person or team. Nothing here should ever
 * need `canAccessEmployee()`; if a constant here starts describing someone's
 * record instead of the calendar, it belongs in a DB-backed module instead.
 */
export const TODAY_LABEL = 'Tuesday, 3 March 2026';
export const FY_LABEL = 'FY 2025–26';

/** Machine-readable form of TODAY_LABEL, for date math against real Cycle rows. */
export const PILOT_TODAY = new Date('2026-03-03T00:00:00+05:30');

/**
 * Config flag, not employee data — gates Profile's "My record" section
 * (year strip, average, consistency, trend, coverage). Off for the pilot;
 * flip once that level of self-service is actually wanted.
 */
export const SHOW_PROFILE_RECORD = false;

/**
 * Gates the whole employee self-service surface: Home's own-record view,
 * Scorecard's own-record view, Acknowledge, and Raise a query.
 *
 * - 'hidden'     — none of it. An employee signing in sees Profile only.
 * - 'after-lock' — visible, but the current OPEN month is withheld until its
 *                  cycle locks (whatever real data exists for it is masked).
 * - 'immediate'  — visible as soon as it's entered, open month included.
 *
 * Historical LOCKED months are always fully visible once this isn't 'hidden'
 * — the after-lock/immediate difference only ever affects the one open month.
 * This does not affect what a Manager or HR sees; they always see everything.
 */
export type EmployeeRecordVisibility = 'hidden' | 'after-lock' | 'immediate';
export const EMPLOYEE_RECORD_VISIBILITY: EmployeeRecordVisibility = 'hidden';
