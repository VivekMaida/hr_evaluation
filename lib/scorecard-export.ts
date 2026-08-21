import { FY_LABEL, FY_RANGE_LABEL } from './constants';
import { toCsv, type CsvCell } from './csv';
import { consistency, halves, signed, trend } from './score';
import {
  COVERAGE_BANDS,
  CONSISTENCY_MIN_MONTHS,
  consistencyLabel,
  coverageBand,
  trendLabel,
  type ScorecardSubject,
} from './scorecard';
import { FY_MONTHS, type MonthStatus } from './types';

/* ---------------------------------------------------------------------------
   "Export record" — the Scorecard as a file.

   Same subject object the screen renders, so the export cannot drift from
   what the viewer was shown: if the open month is masked for them on screen
   (see EMPLOYEE_RECORD_VISIBILITY), it is absent here too, because the
   masking already happened upstream in getScorecardData().

   Deliberately the record and not a dataset. It carries the derived figures
   with the caveats attached, spells out why a cell is empty rather than
   leaving a blank to be read as a zero, and lists which cells have a context
   note without reproducing the notes — those live in Reviews, which is where
   the appraisal argument is made.
   --------------------------------------------------------------------------- */

/** Why a cell in this month is blank, in words rather than as an empty cell. */
const STATUS_LABEL: Record<MonthStatus, string> = {
  scored: 'Scored',
  'not-logged': 'Closed, nothing logged',
  open: 'Open for entry',
  future: 'Not yet reached',
  'not-applicable': 'Before this person started',
};

/**
 * One decimal throughout. The screen rounds achievements to whole numbers for
 * legibility; a file that is meant to be the record should not lose the
 * fraction on its way out.
 */
function num(value: number | null | undefined): CsvCell {
  return value === null || value === undefined ? '' : Number(value.toFixed(1));
}

export function scorecardFilename(employeeId: string): string {
  return `M3M-Perform-record-${employeeId}-FY-${FY_LABEL.replace(/^FY /, '').replace('–', '-')}.csv`;
}

/**
 * `exportedBy` is the signed-in viewer, not the subject — a manager's export
 * of someone else's record should say whose hand it left the system in.
 */
export function scorecardCsv(
  subject: ScorecardSubject,
  options: { exportedBy: string; exportedAt: Date },
): string {
  const band = coverageBand(subject.monthsLogged, subject.eligibleMonths);
  const bandLabel = COVERAGE_BANDS.find((b) => b.band === band)?.label ?? band;
  const sd = consistency(subject.points);
  const delta = trend(subject.points);
  const h = halves(subject.points);
  const missedCount = subject.eligibleMonths - subject.monthsLogged - subject.monthsToCome;

  const dateLabel = options.exportedAt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const rows: CsvCell[][] = [
    ['M3M Perform', 'Performance record'],
    ['Employee', subject.name],
    ['Employee ID', subject.id],
    ['Details', subject.identity],
    ['Fiscal year', FY_LABEL],
    ['Period', FY_RANGE_LABEL],
    ['Exported', dateLabel],
    ['Exported by', options.exportedBy],
    [],

    ['Coverage'],
    ['Months on record', subject.monthsLogged],
    ['Eligible months', subject.eligibleMonths],
    ['Closed with nothing logged', missedCount],
    ['Still to come', subject.monthsToCome],
    ['Band', bandLabel],
    [],

    ['Derived figures'],
    [
      'Year average',
      num(subject.yearAverage),
      `Calculated on the ${subject.monthsLogged} month${
        subject.monthsLogged === 1 ? '' : 's'
      } on record, not on the year`,
    ],
    [
      'Consistency',
      consistencyLabel(sd, subject.monthsLogged),
      sd === null || subject.monthsLogged < CONSISTENCY_MIN_MONTHS
        ? `Suppressed — needs ${CONSISTENCY_MIN_MONTHS} or more months on record`
        : `Standard deviation ${sd.toFixed(1)}`,
    ],
    [
      'Trend',
      trendLabel(delta),
      delta === null || h === null
        ? 'Suppressed — no comparable halves'
        : `${h.first.toFixed(1)} — ${h.second.toFixed(1)}, ${signed(delta)}`,
    ],
    [],

    ['Achievement against target, by month, per cent'],
    [
      'Key result area',
      'Basis',
      'Weight %',
      'Target',
      'Direction',
      ...FY_MONTHS,
      'Average',
    ],
  ];

  for (const row of subject.matrix) {
    rows.push([
      row.kra,
      row.basis,
      row.weight,
      `${row.target}${row.unit === '%' ? '%' : ''}`,
      row.lowerIsBetter ? 'Lower is better' : 'Higher is better',
      ...row.months.map(num),
      num(row.average),
    ]);
  }

  rows.push([
    'Weighted monthly score',
    '',
    '',
    '',
    '',
    ...subject.weightedByMonth.map(num),
    num(subject.yearAverage),
  ]);
  // A month can be both scored and still open for entry: the score exists but
  // is not final until the cycle locks. On screen that is the blue column;
  // here it has to be said, or a provisional figure reads as a settled one.
  rows.push([
    'Month status',
    '',
    '',
    '',
    '',
    ...FY_MONTHS.map((_unused, i) => {
      const status = STATUS_LABEL[subject.points[i]?.status ?? 'future'];
      return subject.openMonthIndex === i + 1 ? `${status}, month still open` : status;
    }),
    '',
  ]);
  rows.push([]);
  rows.push([
    'A blank cell is a month with no actual recorded against that key result area.',
  ]);
  rows.push([
    'Read the month status row above for whether that month was missed, is still open, or has not happened yet.',
  ]);

  // Which cells carry a manager's context note, without the note text — the
  // notes themselves belong to the rating conversation and are read in Reviews.
  const noted = subject.matrix.flatMap((row) =>
    row.notes.flatMap((hasNote, i) => (hasNote ? [[row.kra, FY_MONTHS[i]] as CsvCell[]] : [])),
  );
  if (noted.length > 0) {
    rows.push([]);
    rows.push(['Cells with a context note on record']);
    rows.push(['Key result area', 'Month']);
    rows.push(...noted);
    rows.push([]);
    rows.push(['The notes themselves are on the Reviews screen, not in this file.']);
  }

  return toCsv(rows);
}
