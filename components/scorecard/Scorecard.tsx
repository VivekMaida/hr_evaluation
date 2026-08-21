import Link from 'next/link';
import { ScreenHeader } from '@/components/ScreenHeader';
import { YearStrip } from '@/components/YearStrip';
import { Card, Chip, SectionLabel } from '@/components/ui';
import { FY_LABEL, FY_RANGE_LABEL } from '@/lib/constants';
import type { RecordMonthRow } from '@/lib/record-months';
import {
  consistencyLabel,
  coverageBand,
  matrixCellColour,
  partialThresholdMonths,
  trendLabel,
  type ScorecardSubject,
} from '@/lib/scorecard';
import { consistency, halves, signed, trend } from '@/lib/score';
import { FY_MONTHS, type MonthStatus } from '@/lib/types';
import { AcknowledgeButton } from './AcknowledgeButton';
import { RaiseQueryForm } from './RaiseQueryForm';
import { RespondToQueryForm } from './RespondToQueryForm';

const MONTH_HEADS = FY_MONTHS.map((m) => m.toUpperCase());

/**
 * The Scorecard answers "where did the score come from" — which KRAs are
 * strong, which are weak, which are moving. The KRA × month matrix is that
 * answer, so it is the substance of the screen and is published from the first
 * month on record. The year strip and the four headline figures sit above it as
 * context only; the appraisal argument (bands, the note trail, the recency
 * check) is Reviews' job and is linked to, not repeated here.
 */

/** A compact figure for the context band — deliberately not a 36px stat card. */
function ContextFigure({
  label,
  value,
  foot,
  tone = 'navy',
}: {
  label: string;
  value: string;
  foot: string;
  tone?: 'navy' | 'red' | 'grey';
}) {
  return (
    <div className="stack" style={{ gap: 2, minWidth: 0 }}>
      <SectionLabel tone={tone === 'red' ? 'red' : tone === 'grey' ? 'grey' : 'navy'}>
        {label}
      </SectionLabel>
      <div
        className="num"
        style={{
          fontSize: 22,
          fontWeight: 600,
          lineHeight: 1.1,
          color: tone === 'red' ? 'var(--red)' : tone === 'grey' ? 'var(--grey-body)' : 'var(--navy)',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--grey-body)' }}>{foot}</div>
    </div>
  );
}

/**
 * Background tint for a month column. `isOpen` is passed in rather than read
 * off the status because a month with a score reads as 'scored' whether or not
 * it has locked — see ScorecardSubject.openMonthIndex.
 */
function columnTint(status: MonthStatus, isOpen: boolean): string | undefined {
  if (isOpen || status === 'open') return 'var(--tint-blue)';
  if (status === 'not-applicable') return 'var(--grey-surface)';
  return undefined;
}

export function Scorecard({
  subject,
  recordMonths = [],
  own = false,
  isManager = false,
}: {
  subject: ScorecardSubject;
  /** One row per month with a score on record, for the acknowledge/query section. */
  recordMonths?: RecordMonthRow[];
  /** Viewing your own record — shows the Acknowledge action and "raise a query". */
  own?: boolean;
  /** Viewing this person's own manager's record — shows "respond" on open queries. */
  isManager?: boolean;
}) {
  const band = coverageBand(subject.monthsLogged, subject.eligibleMonths);
  const suppressed = band === 'insufficient';
  const sd = consistency(subject.points);
  const delta = trend(subject.points);
  const h = halves(subject.points);
  const reviewsHref = own ? '/reviews' : `/reviews/${subject.id}`;
  const anyNotes = subject.matrix.some((row) => row.notes.some(Boolean));
  // Months that closed empty, as against months that simply have not happened
  // yet. Early in a fiscal year almost all the shortfall is the latter, and
  // calling that "not logged" made a healthy record read as a failing one.
  const missedCount =
    subject.eligibleMonths - subject.monthsLogged - subject.monthsToCome;
  const isOpenColumn = (i: number) => subject.openMonthIndex === i + 1;

  return (
    <>
      <ScreenHeader
        title="Scorecard"
        meta={`${FY_LABEL} · ${FY_RANGE_LABEL}`}
        aside={
          <Link href="#" style={{ fontSize: 13.5, fontWeight: 700 }}>
            Export record
          </Link>
        }
      />

      <div
        style={{
          padding: '24px 36px 34px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {suppressed ? (
          <div
            className={missedCount > 0 ? 'callout callout--alert' : 'callout callout--info'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 26,
              borderLeftWidth: 4,
              padding: '18px 22px',
            }}
          >
            <div className="stack" style={{ flex: 1, minWidth: 0, gap: 5 }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: missedCount > 0 ? 'var(--red)' : 'var(--navy)',
                }}
              >
                This record covers {subject.monthsLogged} of {subject.eligibleMonths} eligible
                month{subject.eligibleMonths === 1 ? '' : 's'}
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--grey-body)' }}>
                {missedCount > 0 ? (
                  <>
                    {missedCount} eligible month{missedCount === 1 ? '' : 's'}{' '}
                    {missedCount === 1 ? 'closed' : 'closed'} with nothing logged
                    {subject.monthsToCome > 0
                      ? `, and ${subject.monthsToCome} more ${subject.monthsToCome === 1 ? 'is' : 'are'} still to come`
                      : ''}
                    .{' '}
                  </>
                ) : (
                  <>
                    Nothing has been missed — {subject.monthsToCome} of this person&rsquo;s{' '}
                    {subject.eligibleMonths} eligible months {subject.monthsToCome === 1 ? 'is' : 'are'}{' '}
                    simply still to come.{' '}
                  </>
                )}
                Every figure here is calculated on what exists, not on the year, so it is not a
                basis for an annual rating until coverage reaches{' '}
                {partialThresholdMonths(subject.eligibleMonths)} months or HR approves an exception.
                The matrix below shows every month on record.
              </div>
            </div>
            {missedCount > 0 ? (
              <button
                type="button"
                className="btn btn--destructive"
                style={{ flex: 'none', fontSize: 14.5 }}
              >
                Request back-entry
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="spread" style={{ alignItems: 'flex-start', gap: 32 }}>
          <div className="stack" style={{ gap: 4 }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.1 }}>
              {subject.name}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>{subject.identity}</div>
          </div>
          <div className="row" style={{ gap: 10, flex: 'none' }}>
            <button
              type="button"
              className="btn btn--secondary"
              style={{ fontSize: 14.5, padding: '9px 18px' }}
            >
              Compare to team
            </button>
            <Link
              href={reviewsHref}
              className="btn btn--primary"
              style={{ fontSize: 14.5, padding: '10px 20px', textDecoration: 'none' }}
            >
              {own ? 'What this means' : 'Open in Reviews'}
            </Link>
          </div>
        </div>

        {/* Context band — the shape of the year and the four derived figures.
            Kept small on purpose: it frames the matrix, it is not the content. */}
        <Card style={{ padding: '16px 22px 18px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto',
              gap: 28,
              alignItems: 'center',
            }}
          >
            <div className="stack" style={{ gap: 8, minWidth: 0 }}>
              <SectionLabel tone="grey">Weighted score by month</SectionLabel>
              <YearStrip size="medium" points={subject.points} label={`${subject.name}, ${FY_LABEL}`} />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(96px, auto))',
                gap: 24,
                borderLeft: '1px solid var(--grey-surface)',
                paddingLeft: 26,
              }}
            >
              <ContextFigure
                label="Year average"
                tone={suppressed ? 'grey' : 'navy'}
                value={subject.yearAverage.toFixed(1)}
                foot={
                  suppressed
                    ? `Mean of ${subject.monthsLogged} — indicative`
                    : `Mean of ${subject.monthsLogged} months`
                }
              />
              <ContextFigure
                label="Consistency"
                tone={suppressed ? 'grey' : 'navy'}
                value={consistencyLabel(sd, subject.monthsLogged)}
                foot={
                  suppressed || sd === null
                    ? 'Needs 6 or more months'
                    : `SD ${sd.toFixed(1)}`
                }
              />
              <ContextFigure
                label="Trend"
                tone={suppressed ? 'grey' : 'navy'}
                value={suppressed ? '—' : trendLabel(delta)}
                foot={
                  suppressed || delta === null || h === null
                    ? 'No comparable halves'
                    : `${h.first.toFixed(1)} → ${h.second.toFixed(1)} · ${signed(delta)}`
                }
              />
              <ContextFigure
                label="Coverage"
                tone={suppressed ? 'red' : 'navy'}
                value={`${subject.monthsLogged} of ${subject.eligibleMonths}`}
                foot={suppressed ? 'Insufficient' : 'Complete to date'}
              />
            </div>
          </div>
        </Card>

        {/* The substance. */}
        <Card style={{ padding: '20px 24px 22px' }}>
          <div className="spread" style={{ alignItems: 'baseline', marginBottom: 4, gap: 24 }}>
            <SectionLabel>Achievement by key result area</SectionLabel>
            <Link href={reviewsHref} style={{ fontSize: 13, fontWeight: 700, flex: 'none' }}>
              What this means for the rating →
            </Link>
          </div>
          <p
            style={{
              margin: '0 0 14px',
              fontSize: 13,
              lineHeight: 1.55,
              color: 'var(--grey-body)',
              maxWidth: '92ch',
            }}
          >
            Achievement against each KRA&rsquo;s target, month by month. Numerals are coloured only
            for exceptions — <span style={{ color: 'var(--red)', fontWeight: 700 }}>below 70%</span>{' '}
            and <span style={{ color: 'var(--green)', fontWeight: 700 }}>above 120%</span>, the two
            bands that oblige the manager to write a context note.
            {anyNotes ? (
              <>
                {' '}
                A <strong style={{ color: 'var(--navy)' }}>•</strong> marks a cell that has one —
                the notes themselves are in{' '}
                <Link href={reviewsHref} style={{ fontWeight: 700 }}>
                  Reviews
                </Link>
                .
              </>
            ) : null}
          </p>

          {subject.matrix.length === 0 ? (
            <div style={{ fontSize: 14, color: 'var(--grey-body)' }}>
              No KPI set has been published for this fiscal year, so there is nothing to break the
              score down against.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '9px 12px', minWidth: 210 }}>Key result area</th>
                    <th className="is-num" style={{ padding: '9px 8px' }}>
                      Wt
                    </th>
                    <th className="is-num" style={{ padding: '9px 8px' }}>
                      Target
                    </th>
                    {MONTH_HEADS.map((m, i) => (
                      <th
                        key={m}
                        style={{
                          textAlign: 'center',
                          padding: '9px 4px',
                          minWidth: 40,
                          color:
                            subject.points[i]?.status === 'scored' ||
                            subject.points[i]?.status === 'open'
                              ? 'var(--navy)'
                              : 'var(--grey-body)',
                          background: columnTint(subject.points[i]?.status ?? 'future', isOpenColumn(i)),
                        }}
                      >
                        {m}
                      </th>
                    ))}
                    <th className="is-num" style={{ padding: '9px 12px' }}>
                      Avg
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subject.matrix.map((row) => (
                    <tr key={row.kra}>
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{row.kra}</div>
                        <div style={{ fontSize: 12, color: 'var(--grey-body)' }}>
                          {row.basis}
                          {row.lowerIsBetter ? ' · lower is better' : ''}
                        </div>
                      </td>
                      <td className="is-num" style={{ padding: '11px 8px' }}>
                        {row.weight}%
                      </td>
                      <td className="is-num" style={{ padding: '11px 8px', color: 'var(--navy)' }}>
                        {row.target}
                        {row.unit === '%' ? '%' : ''}
                      </td>
                      {row.months.map((value, i) => {
                        const status = subject.points[i]?.status ?? 'future';
                        return (
                          <td
                            key={MONTH_HEADS[i]}
                            className="num"
                            style={{
                              padding: '11px 4px',
                              textAlign: 'center',
                              background: columnTint(status, isOpenColumn(i)),
                              color:
                                value === null ? 'var(--grey-line)' : matrixCellColour(value),
                              fontWeight:
                                value !== null && (value < 70 || value > 120) ? 700 : 400,
                            }}
                            title={
                              row.notes[i]
                                ? `${row.kra}, ${FY_MONTHS[i]} — a context note is on record; read it in Reviews`
                                : undefined
                            }
                          >
                            {value === null ? (status === 'not-applicable' ? '' : '—') : value.toFixed(0)}
                            {row.notes[i] ? (
                              <span style={{ color: 'var(--navy)', fontWeight: 700 }}>•</span>
                            ) : null}
                          </td>
                        );
                      })}
                      <td
                        className="is-num"
                        style={{
                          padding: '11px 12px',
                          fontWeight: 700,
                          color: row.average === null ? 'var(--grey-line)' : 'var(--navy)',
                        }}
                      >
                        {row.average === null ? '—' : row.average.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--panel)', borderTop: '2px solid var(--navy)' }}>
                    <td style={{ padding: 12 }} colSpan={3}>
                      <span style={{ fontWeight: 700, color: 'var(--navy)' }}>
                        Weighted monthly score
                      </span>
                    </td>
                    {subject.weightedByMonth.map((value, i) => {
                      const status = subject.points[i]?.status ?? 'future';
                      return (
                        <td
                          key={MONTH_HEADS[i]}
                          className="num"
                          style={{
                            padding: '12px 4px',
                            textAlign: 'center',
                            fontWeight: 700,
                            background: columnTint(status, isOpenColumn(i)),
                            color: value === null ? 'var(--grey-line)' : 'var(--navy)',
                          }}
                        >
                          {value === null
                            ? status === 'not-applicable'
                              ? ''
                              : '—'
                            : value.toFixed(0)}
                        </td>
                      );
                    })}
                    <td
                      className="is-num"
                      style={{ padding: 12, fontWeight: 700, color: 'var(--navy)', fontSize: 16 }}
                    >
                      {subject.yearAverage.toFixed(1)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div
            style={{
              marginTop: 12,
              fontSize: 12.5,
              lineHeight: 1.55,
              color: 'var(--grey-body)',
            }}
          >
            A dash is a month with nothing recorded against that KRA. The blue column is the
            month still open for entry, so it can still change; a grey column is a month before
            this person joined the programme, where there was never anything to log.
            {subject.missingMonths ? (
              <>
                {' '}
                Closed with nothing logged:{' '}
                <strong style={{ color: 'var(--navy)' }}>{subject.missingMonths}</strong>.
              </>
            ) : null}
          </div>
        </Card>

        {recordMonths.length > 0 ? (
          <Card style={{ padding: '20px 24px 22px' }}>
            <SectionLabel>Acknowledgements &amp; queries</SectionLabel>
            <p
              style={{
                margin: '6px 0 14px',
                fontSize: 13.5,
                lineHeight: 1.55,
                color: 'var(--grey-body)',
                maxWidth: '86ch',
              }}
            >
              {own
                ? 'Marking a month as seen is optional and blocks nothing — the month counts and locks either way, and nobody will chase you for it. If you disagree with a month, raise a query on it: it goes to your manager, and both the question and the reply stay against that month.'
                : 'Which months this person has confirmed seeing, and any question raised against a specific month. Acknowledging is optional and blocks nothing — an unacknowledged month still counts and still locks.'}
            </p>
            <table className="data-table" style={{ fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ padding: '9px 12px' }}>Month</th>
                  <th className="is-num" style={{ padding: '9px 10px', width: 90 }}>
                    Score
                  </th>
                  <th style={{ padding: '9px 12px', width: 180 }}>Seen</th>
                  <th style={{ padding: '9px 12px' }}>Queries</th>
                </tr>
              </thead>
              <tbody>
                {recordMonths.map((month) => (
                  <tr key={month.cycleId}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--navy)' }}>
                      {month.label}
                      {month.state === 'OPEN' ? (
                        <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--grey-body)' }}>
                          still open
                        </div>
                      ) : null}
                    </td>
                    <td className="is-num" style={{ padding: '10px 10px' }}>
                      {month.weightedScore.toFixed(1)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {month.acknowledgedAtLabel ? (
                        <Chip tone="green" tight>
                          {month.acknowledgedAtLabel}
                        </Chip>
                      ) : own ? (
                        <AcknowledgeButton cycleId={month.cycleId} />
                      ) : (
                        <Chip tone="grey" tight>
                          Not marked
                        </Chip>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {month.queries.map((q, i) => (
                        <div
                          key={q.id}
                          className="stack"
                          style={{ gap: 3, marginBottom: i < month.queries.length - 1 ? 12 : 0 }}
                        >
                          <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{q.question}</div>
                          <div className="num" style={{ fontSize: 12.5, color: 'var(--grey-body)' }}>
                            Asked {q.askedAtLabel}
                          </div>
                          {q.state === 'ANSWERED' ? (
                            <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                              {q.response}{' '}
                              <span
                                className="num"
                                style={{ color: 'var(--grey-body)', fontSize: 12.5 }}
                              >
                                · {q.respondedAtLabel}
                              </span>
                            </div>
                          ) : isManager ? (
                            <RespondToQueryForm queryId={q.id} />
                          ) : (
                            <Chip tone="amber" tight>
                              Awaiting response
                            </Chip>
                          )}
                        </div>
                      ))}
                      {own ? <RaiseQueryForm cycleId={month.cycleId} /> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : null}
      </div>
    </>
  );
}
