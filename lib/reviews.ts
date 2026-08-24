import { getContextNotes, type ContextNote } from './context-notes';
import { FISCAL_YEAR, FY_LABEL } from './constants';
import { prisma } from './db';
import {
  eligibleFromMonthIndex,
  eligibleMonthCount,
  getEmployeeCycleScores,
  monthsLogged as countMonthsLogged,
  pointsFromCycleScores,
  yearAverage as computeYearAverage,
} from './employee-year';
import { getQueriesForEmployee, type QueryItem } from './queries';
import { consistency, halves, trend } from './score';
import { coverageBand, consistencyLabel, trendLabel, type CoverageBand } from './scorecard';

/* ---------------------------------------------------------------------------
   Reviews — the appraisal conversation.

   This is not a year-end step. There is no draft, no submission and no
   sign-off: the aggregate *is* the rating, recomputed from whatever months
   have locked so far every time the screen is opened. A manager looking in
   November sees the year to date; the same screen in March simply has more
   months in it.

   Consequently nothing here reads or writes AnnualReview. The rating cannot
   drift from the record because it is never stored separately from it.

   What this screen is *for* is arguing the rating: what band the aggregate
   implies, what that band means, which months were unusual and why, what the
   manager wrote at the time, and whether the recent run differs from the year.
   It deliberately does not restate the Scorecard's numbers — the year strip,
   the four headline figures and the KRA matrix live there and are linked to,
   not copied. That is why `ReviewSubject` carries no `points` array: the
   duplication this screen used to have was structural, so removing the field
   is what stops it coming back.
   --------------------------------------------------------------------------- */

export type Band = {
  value: 1 | 2 | 3 | 4 | 5;
  label: string;
  from: number;
  /** null means open-ended at the top. */
  to: number | null;
  range: string;
  /**
   * What the band asserts about the year, in the plainest words that still say
   * it. Read aloud in an appraisal conversation, so each one opens by naming
   * the result against target and then says what to do about it. A reader who
   * treats these percentages as exam marks will read 85.7 as a failure unless
   * the words say otherwise, which is the whole job of this field.
   */
  meaning: string;
};

export const BANDS: Band[] = [
  {
    value: 1,
    label: 'Below expectations',
    from: -Infinity,
    to: 69.999,
    range: 'Under 70',
    meaning:
      'Targets missed. The months on record are well short of what the role needs. Agree what has to change, by when, and what support it takes — this is not a ranking exercise.',
  },
  {
    value: 2,
    label: 'Partially meets',
    from: 70,
    to: 84.999,
    range: '70 – 84',
    meaning:
      'Some targets met, some missed. Name which key result areas are short and agree what changes on them.',
  },
  {
    value: 3,
    label: 'Meets expectations',
    from: 85,
    to: 99.999,
    range: '85 – 99',
    meaning:
      'Targets met. A score near 100 means the role is being delivered as expected — it is not a shortfall.',
  },
  {
    value: 4,
    label: 'Exceeds expectations',
    from: 100,
    to: 114.999,
    range: '100 – 114',
    meaning:
      'Targets beaten, consistently, across the months on record. Say which key result areas carried it, so it can be repeated.',
  },
  {
    value: 5,
    label: 'Outstanding',
    from: 115,
    to: null,
    range: '115 and above',
    meaning:
      'Targets beaten by a wide margin, and held there — not one strong month. Calibration will ask for the evidence in the notes below.',
  },
];

/** The band the record itself lands in. With no year-end override, this is the rating. */
export function bandFor(yearAverage: number): Band {
  return (
    BANDS.find((b) => yearAverage >= b.from && (b.to === null || yearAverage <= b.to)) ?? BANDS[0]
  );
}

export type { ContextNote };

/**
 * A month worth talking about. `reasons` is prose because this screen is read,
 * not scanned — a month can be flagged for more than one thing at once (a
 * sharp drop that also lands below 70) and both belong in the sentence.
 */
export type FlaggedMonth = {
  monthIndex: number;
  monthLabel: string;
  score: number;
  reasons: string[];
  tone: 'red' | 'green' | 'amber';
};

/**
 * Below this, a month needs explaining; above the ceiling, it needs
 * corroborating. These are the same two bands that oblige a manager to write
 * a context note at entry time, so a flagged month should already have one.
 */
const LOW_MONTH = 70;
const HIGH_MONTH = 120;
/** Points of month-on-month movement that counts as a sharp change. */
const SWING_POINTS = 15;
/** Points between the recent window and the earlier months that counts as material. */
const MATERIAL_POINTS = 5;
/** How many trailing months count as "the last quarter". */
const RECENT_WINDOW = 3;

/**
 * The recency check this product exists for: does the recent run say something
 * different from the rest of the year? Stated in words so nobody has to read
 * it off a chart.
 */
export type RecencyCheck = {
  recentMonths: string[];
  recentAverage: number | null;
  earlierMonths: string[];
  earlierAverage: number | null;
  /** recentAverage − earlierAverage, in percentage points. */
  delta: number | null;
  /** True when the gap is big enough to change the conversation. */
  material: boolean;
  /** Always present, even when there is not enough history to compare. */
  verdict: string;
};

export type AcknowledgementRow = {
  monthIndex: number;
  monthLabel: string;
  score: number | null;
  /** null means this month was never marked as seen — which is not a problem. */
  acknowledgedAtLabel: string | null;
};

export type ReviewSubject = {
  id: string;
  name: string;
  identity: string;
  monthsLogged: number;
  /** How many of the twelve months this person is actually eligible for — see eligibleFromMonthIndex(). */
  eligibleMonths: number;
  /** Mean of the logged months only — never a projection over the eligible ones. */
  yearAverage: number;
  /** The band `yearAverage` falls in. The rating, as things stand. */
  band: Band;

  /* The aggregate, recomputed on every read. */
  consistencySd: number | null;
  consistency: string;
  trendDelta: number | null;
  trend: string;
  trendHalves: { first: number; second: number } | null;
  coverage: CoverageBand;
  lowest: number | null;
  highest: number | null;

  /**
   * The basis, made explicit so nobody reads the figure as a full-year one.
   * `includedMonths` are exactly the months in `yearAverage`; `pendingMonths`
   * are eligible months that have not been logged (open, missed or still to
   * come) and are in nothing.
   */
  includedMonths: string[];
  pendingMonths: string[];
  /** True while months remain that could still change the figure. */
  stillAccruing: boolean;

  /** Every note the manager wrote during the year, in month order. */
  contextNotes: ContextNote[];
  /** Months below 70%, above 120%, or a sharp move on the month before. */
  flagged: FlaggedMonth[];
  recency: RecencyCheck;
  /** Every month on record, with the date it was marked seen if it was. */
  acknowledgements: AcknowledgementRow[];
  /** How many of those months have been acknowledged. */
  acknowledgedCount: number;
  /** Queries raised against a month, newest first, with the manager's reply. */
  queries: QueryItem[];
};

export type ReviewData = {
  employee: { id: string; name: string; title: string };
  /** null means the employee exists but no month has been logged yet. */
  subject: ReviewSubject | null;
};

/** Short month label — "August 2026" becomes "Aug". */
function shortMonth(label: string): string {
  return label.split(' ')[0]?.slice(0, 3) ?? label;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * One logged month, reduced to what the analysis below actually needs. Both
 * functions take this rather than a CycleScore so they stay pure and can be
 * reasoned about (and exercised) without a database.
 */
export type LoggedMonth = { monthIndex: number; label: string; score: number };

/**
 * Months a rating has to survive questions about: a shortfall, an
 * unusually high month, or a sharp move on the month before.
 *
 * `logged` must be in month order and contain only months that actually have a
 * score — a gap in the record is not a change in performance, so the
 * comparison is always against the previous *logged* month, not the previous
 * calendar month.
 */
export function flaggedMonths(logged: LoggedMonth[]): FlaggedMonth[] {
  const flagged: FlaggedMonth[] = [];

  logged.forEach((m, i) => {
    const reasons: string[] = [];
    let tone: FlaggedMonth['tone'] = 'amber';

    if (m.score < LOW_MONTH) {
      reasons.push(`Below ${LOW_MONTH}% — a shortfall month that needs an explanation on record.`);
      tone = 'red';
    }
    if (m.score > HIGH_MONTH) {
      reasons.push(
        `Above ${HIGH_MONTH}% — an exceptional month; check the target was right before reading it as outperformance.`,
      );
      tone = 'green';
    }

    const prev = logged[i - 1];
    if (prev) {
      const swing = m.score - prev.score;
      if (Math.abs(swing) >= SWING_POINTS) {
        reasons.push(
          `${swing > 0 ? 'Up' : 'Down'} ${Math.abs(swing).toFixed(1)} points on ${shortMonth(prev.label)} (${prev.score.toFixed(1)} → ${m.score.toFixed(1)}) — a sharp move, not drift.`,
        );
        // Tone stays amber for a swing-only flag. Red and green are reserved
        // for the *level* of the month: a drop from 130 to 112 is worth
        // discussing, but colouring it red would read as a bad month when 112
        // is still well above target.
      }
    }

    if (reasons.length > 0) {
      flagged.push({
        monthIndex: m.monthIndex,
        monthLabel: m.label,
        score: m.score,
        reasons,
        tone,
      });
    }
  });

  return flagged;
}

/**
 * Does the recent run say something different from the rest of the year?
 *
 * The trailing `RECENT_WINDOW` logged months are compared against every logged
 * month before them — not against the whole year, which would include the
 * recent window on both sides of the comparison and dilute it. The verdict is
 * a sentence rather than a number because this is the one question the product
 * exists to answer and nobody should have to read it off a chart.
 */
export function recencyCheck(logged: LoggedMonth[]): RecencyCheck {
  const recent = logged.slice(-RECENT_WINDOW);
  const earlier = logged.slice(0, Math.max(0, logged.length - RECENT_WINDOW));
  const recentAverage = recent.length > 0 ? mean(recent.map((m) => m.score)) : null;
  const earlierAverage = earlier.length > 0 ? mean(earlier.map((m) => m.score)) : null;
  const delta =
    recentAverage !== null && earlierAverage !== null ? recentAverage - earlierAverage : null;
  const material = delta !== null && Math.abs(delta) >= MATERIAL_POINTS;
  const window = `The last ${recent.length} ${recent.length === 1 ? 'month' : 'months'}`;

  let verdict: string;
  if (logged.length === 0) {
    verdict = 'No month is on record yet, so there is nothing to compare.';
  } else if (earlier.length === 0) {
    verdict =
      logged.length === 1
        ? 'Only one month is on record, so there is no earlier period to compare the recent run against yet.'
        : `All ${logged.length} logged months fall inside the recent window, so there is no earlier period to compare against yet. This check becomes meaningful once more than ${RECENT_WINDOW} months are on record.`;
  } else if (delta === null || recentAverage === null || earlierAverage === null) {
    verdict = 'Not enough logged months to compare the recent run with the rest of the year.';
  } else if (!material) {
    verdict = `No. ${window} average ${recentAverage.toFixed(1)} against ${earlierAverage.toFixed(1)} earlier in the year — a difference of ${Math.abs(delta).toFixed(1)} points, inside the ${MATERIAL_POINTS}-point margin. The recent run says the same thing as the year, so the aggregate can be read at face value.`;
  } else if (delta > 0) {
    verdict = `Yes, upward. ${window} average ${recentAverage.toFixed(1)} against ${earlierAverage.toFixed(1)} earlier in the year — ${delta.toFixed(1)} points better. The aggregate understates where this person currently is, and the recent months are the better guide to the year ahead.`;
  } else {
    verdict = `Yes, downward. ${window} average ${recentAverage.toFixed(1)} against ${earlierAverage.toFixed(1)} earlier in the year — ${Math.abs(delta).toFixed(1)} points worse. The aggregate flatters the current position; treat the recent months as the live picture and address the decline directly.`;
  }

  return {
    recentMonths: recent.map((m) => shortMonth(m.label)),
    recentAverage,
    earlierMonths: earlier.map((m) => shortMonth(m.label)),
    earlierAverage,
    delta,
    material,
    verdict,
  };
}

/** Returns null only when the employee does not exist. */
export async function getReviewData(employeeId: string): Promise<ReviewData | null> {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return null;

  const base = { id: employee.id, name: employee.name, title: employee.title };

  const fromIndex = eligibleFromMonthIndex(employee.joinedOn, FISCAL_YEAR);
  const eligibleMonths = eligibleMonthCount(fromIndex);

  const scores = await getEmployeeCycleScores(employeeId, FISCAL_YEAR);
  const eligible = scores.filter((s) => s.monthIndex >= fromIndex);
  const months = countMonthsLogged(scores, fromIndex);
  if (months === 0) return { employee: base, subject: null };

  const points = pointsFromCycleScores(scores, fromIndex);
  const average = computeYearAverage(scores) as number;

  // Month order, not submission order — every list on this screen reads
  // chronologically because that is how the conversation goes.
  const logged = eligible
    .filter((s) => s.weightedScore !== null)
    .sort((a, b) => a.monthIndex - b.monthIndex);
  const loggedValues = logged.map((s) => s.weightedScore as number);

  const [contextNotes, ackRows, queries] = await Promise.all([
    getContextNotes(employeeId, FISCAL_YEAR),
    prisma.acknowledgement.findMany({
      where: { employeeId },
      select: { cycleId: true, acknowledgedAt: true },
    }),
    getQueriesForEmployee(employeeId),
  ]);

  // The two analyses that make this screen an argument rather than a readout.
  // Both are pure functions of the logged months — see flaggedMonths() and
  // recencyCheck() above.
  const loggedMonths: LoggedMonth[] = logged.map((s) => ({
    monthIndex: s.monthIndex,
    label: s.label,
    score: s.weightedScore as number,
  }));
  const flagged = flaggedMonths(loggedMonths);
  const recency = recencyCheck(loggedMonths);

  /* --- Acknowledgements -------------------------------------------------- */
  const ackByCycle = new Map(ackRows.map((a) => [a.cycleId, a.acknowledgedAt]));
  const acknowledgements: AcknowledgementRow[] = logged.map((s) => {
    const at = ackByCycle.get(s.cycleId);
    return {
      monthIndex: s.monthIndex,
      monthLabel: s.label,
      score: s.weightedScore,
      acknowledgedAtLabel: at
        ? at.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : null,
    };
  });

  const sd = consistency(points);
  const delta = trend(points);

  const subject: ReviewSubject = {
    id: employee.id,
    name: employee.name,
    identity: `${employee.title} · ${employee.id}`,
    monthsLogged: months,
    eligibleMonths,
    yearAverage: average,
    band: bandFor(average),

    consistencySd: sd,
    consistency: consistencyLabel(sd, months),
    trendDelta: delta,
    trend: trendLabel(delta),
    trendHalves: halves(points),
    coverage: coverageBand(months, eligibleMonths),
    lowest: loggedValues.length ? Math.min(...loggedValues) : null,
    highest: loggedValues.length ? Math.max(...loggedValues) : null,

    includedMonths: logged.map((s) => shortMonth(s.label)),
    pendingMonths: eligible.filter((s) => s.weightedScore === null).map((s) => shortMonth(s.label)),
    stillAccruing: months < eligibleMonths,

    contextNotes,
    flagged,
    recency,
    acknowledgements,
    acknowledgedCount: acknowledgements.filter((a) => a.acknowledgedAtLabel !== null).length,
    queries,
  };

  return { employee: base, subject };
}

/** Header chrome — the fiscal year, not a submission deadline. */
export const REVIEW_CONTEXT = {
  cycle: `Annual figure ${FY_LABEL}`,
};

/** Exported for the screen's own copy, so the thresholds are stated once. */
export const REVIEW_THRESHOLDS = {
  low: LOW_MONTH,
  high: HIGH_MONTH,
  swing: SWING_POINTS,
  material: MATERIAL_POINTS,
  recentWindow: RECENT_WINDOW,
};
