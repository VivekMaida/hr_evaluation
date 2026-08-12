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
