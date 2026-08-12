import type { ReactNode } from 'react';
import Link from 'next/link';
import { CoverageBar } from '@/components/CoverageBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { YearStrip } from '@/components/YearStrip';
import { Card, Chip, SectionLabel } from '@/components/ui';
import type { ContextNote } from '@/lib/context-notes';
import type { LockedMonthRow } from '@/lib/locked-months';
import {
  COVERAGE_BANDS,
  consistencyLabel,
  coverageBand,
  matrixCellColour,
  trendLabel,
  type ScorecardSubject,
} from '@/lib/scorecard';
import { consistency, halves, signed, trend } from '@/lib/score';
import { FY_MONTHS } from '@/lib/types';
import { AcknowledgeButton } from './AcknowledgeButton';
import { RaiseQueryForm } from './RaiseQueryForm';
import { RespondToQueryForm } from './RespondToQueryForm';

const MONTH_HEADS = FY_MONTHS.map((m) => m.toUpperCase());

function StatShell({
  label,
  labelTone,
  tone,
  children,
  foot,
  footTone,
}: {
  label: string;
  labelTone: 'navy' | 'grey' | 'red' | 'green';
  tone: 'navy' | 'red' | 'green';
  children: ReactNode;
  foot: ReactNode;
  footTone?: string;
}) {
  return (
    <Card tone={tone} style={{ padding: '18px 22px 20px' }}>
      <div className="stack" style={{ gap: 5 }}>
        <SectionLabel tone={labelTone}>{label}</SectionLabel>
        {children}
        <div
          className="num"
          style={{ fontSize: 13.5, color: footTone ?? 'var(--grey-body)' }}
        >
          {foot}
        </div>
      </div>
    </Card>
  );
}

export function Scorecard({
  subject,
  contextNotes = [],
  lockedMonths = [],
  own = false,
  isManager = false,
}: {
  subject: ScorecardSubject;
  /** The context notes a manager wrote on outlier months — read-only for everyone. */
  contextNotes?: ContextNote[];
  /** One row per locked month, for the acknowledge/query section. */
  lockedMonths?: LockedMonthRow[];
  /** Viewing your own record — shows the Acknowledge action and "raise a query". */
  own?: boolean;
  /** Viewing this person's own manager's record — shows "respond" on open queries. */
  isManager?: boolean;
}) {
  const band = coverageBand(subject.monthsLogged);
  const suppressed = band === 'insufficient';
  const sd = consistency(subject.points);
  const delta = trend(subject.points);
  const h = halves(subject.points);

  return (
    <>
      <ScreenHeader
        title="Scorecard"
        meta="FY 2025–26 · April 2025 to March 2026"
        aside={
          <Link href="#" style={{ fontSize: 13.5, fontWeight: 700 }}>
            Export record
          </Link>
        }
      />

      <div
        style={{
          padding: suppressed ? '24px 36px 30px' : '24px 36px 34px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {suppressed ? (
          <div
            className="callout callout--alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 26,
              borderLeftWidth: 4,
              padding: '20px 24px',
            }}
          >
            <div className="stack" style={{ flex: 1, minWidth: 0, gap: 5 }}>
              <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--red)' }}>
                This record covers {subject.monthsLogged} of 12 months
              </div>
              <div style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--grey-body)' }}>
                Six elapsed months were never logged. The average below is calculated on
                what exists, not on the year — it is not a basis for an annual rating, and
                Reviews will refuse the submission until coverage reaches eight months or
                HR approves an exception.
              </div>
            </div>
            <button
              type="button"
              className="btn btn--destructive"
              style={{ flex: 'none', fontSize: 14.5 }}
            >
              Request back-entry
            </button>
          </div>
        ) : null}

        <div className="spread" style={{ alignItems: 'flex-start', gap: 32 }}>
          <div className="stack" style={{ gap: 4 }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.1 }}>
              {subject.name}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
              {subject.identity}
            </div>
          </div>
          {suppressed ? null : (
            <div className="row" style={{ gap: 10, flex: 'none' }}>
              <button type="button" className="btn btn--secondary" style={{ fontSize: 14.5, padding: '9px 18px' }}>
                Compare to team
              </button>
              <Link
                href={`/reviews/${subject.id}`}
                className="btn btn--primary"
                style={{ fontSize: 14.5, padding: '10px 20px', textDecoration: 'none' }}
              >
                Open in Reviews
              </Link>
            </div>
          )}
        </div>

        <Card
          tone={suppressed ? 'red' : 'green'}
          style={{
            padding: '22px 26px 24px',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 300px',
            gap: 36,
            alignItems: 'start',
          }}
        >
          <div className="stack" style={{ gap: 16 }}>
            <SectionLabel tone={suppressed ? 'red' : 'green'}>
              {suppressed
                ? 'Monthly weighted score · six months missing'
                : 'Monthly weighted score · April to March'}
            </SectionLabel>
            <div style={{ paddingRight: 44 }}>
              <YearStrip
                size="large"
                points={subject.points}
                label={`${subject.name}, FY 2025–26`}
              />
            </div>
          </div>

          <div
            className="stack"
            style={{
              gap: 12,
              borderLeft: '1px solid var(--grey-surface)',
              paddingLeft: 28,
            }}
          >
            {subject.record ? (
              <>
                <SectionLabel tone="navy">Record status</SectionLabel>
                <div className="spread" style={{ fontSize: 14 }}>
                  <span>Months locked</span>
                  <span className="num" style={{ fontWeight: 700, color: 'var(--navy)' }}>
                    {subject.record.monthsLocked}
                  </span>
                </div>
                <div className="spread" style={{ fontSize: 14 }}>
                  <span>February</span>
                  <Chip tone="cyan" tight>
                    {subject.record.februaryState}
                  </Chip>
                </div>
                <div className="spread" style={{ fontSize: 14 }}>
                  <span>Last submitted</span>
                  <span className="num" style={{ color: 'var(--navy)' }}>
                    {subject.record.lastSubmitted}
                  </span>
                </div>
                <div style={{ height: 1, background: 'var(--grey-surface)', margin: '2px 0' }} />
                <div className="spread" style={{ fontSize: 14 }}>
                  <span>FY 2024–25 rating</span>
                  <span style={{ fontWeight: 700, color: 'var(--navy)' }}>
                    {subject.record.priorRating}
                  </span>
                </div>
              </>
            ) : (
              <>
                <SectionLabel tone="navy">Missing months</SectionLabel>
                <div
                  style={{
                    fontSize: 14.5,
                    lineHeight: 1.6,
                    color: 'var(--navy)',
                    fontWeight: 700,
                  }}
                >
                  {subject.missingMonths}
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.55 }}>{subject.missingNote}</div>
              </>
            )}
          </div>
        </Card>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1.55fr',
            gap: 18,
          }}
        >
          <StatShell
            label="Year average"
            labelTone={suppressed ? 'grey' : 'navy'}
            tone={suppressed ? 'navy' : 'navy'}
            foot={
              suppressed
                ? `Mean of ${subject.monthsLogged} months — treat as a sample, not a year`
                : `Mean of ${subject.monthsLogged} logged months`
            }
            footTone={suppressed ? 'var(--amber)' : undefined}
          >
            <div
              className="num"
              style={{
                fontSize: 36,
                fontWeight: 600,
                color: suppressed ? 'var(--grey-body)' : 'var(--navy)',
                lineHeight: 1.05,
              }}
            >
              {subject.yearAverage.toFixed(1)}
              {suppressed ? (
                <span
                  style={{
                    fontSize: 16,
                    color: 'var(--amber)',
                    fontWeight: 700,
                    marginLeft: 8,
                  }}
                >
                  indicative
                </span>
              ) : null}
            </div>
          </StatShell>

          <StatShell
            label="Consistency"
            labelTone={suppressed ? 'grey' : 'navy'}
            tone="navy"
            foot={
              suppressed
                ? 'Suppressed — needs 6 or more months'
                : `SD ${sd?.toFixed(1) ?? '—'} · Steady under 8, Variable 8–15, Erratic above`
            }
          >
            <div
              style={{
                fontSize: 36,
                fontWeight: 600,
                color: suppressed ? 'var(--grey-line)' : 'var(--navy)',
                lineHeight: 1.05,
              }}
            >
              {consistencyLabel(sd, subject.monthsLogged)}
            </div>
          </StatShell>

          <StatShell
            label="Trend"
            labelTone={suppressed ? 'grey' : 'navy'}
            tone="navy"
            foot={
              suppressed || delta === null || h === null
                ? 'Suppressed — no comparable halves'
                : `H1 ${h.first.toFixed(1)} → H2 ${h.second.toFixed(1)} · ${signed(delta)}`
            }
          >
            <div
              style={{
                fontSize: 36,
                fontWeight: 600,
                color: suppressed ? 'var(--grey-line)' : 'var(--navy)',
                lineHeight: 1.05,
              }}
            >
              {suppressed ? '—' : trendLabel(delta)}
            </div>
          </StatShell>

          <Card
            tone={suppressed ? 'red' : 'green'}
            style={{ padding: '18px 22px 20px' }}
          >
            <div className="stack" style={{ gap: 10 }}>
              <div className="spread" style={{ alignItems: 'baseline' }}>
                <SectionLabel tone={suppressed ? 'red' : 'green'}>Coverage</SectionLabel>
                <Chip tone={suppressed ? 'red' : 'green'} tight>
                  {suppressed ? 'Insufficient' : 'Complete to date'}
                </Chip>
              </div>
              <div
                className="num"
                style={{
                  fontSize: 36,
                  fontWeight: 600,
                  color: suppressed ? 'var(--red)' : 'var(--navy)',
                  lineHeight: 1.05,
                }}
              >
                {subject.monthsLogged}{' '}
                <span style={{ fontSize: 20, fontWeight: 400, color: 'var(--grey-body)' }}>
                  of 12 months
                </span>
              </div>
              <CoverageBar points={subject.points} />
              <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
                {suppressed
                  ? 'Filled navy is logged, dashed red is a month that closed empty.'
                  : 'Every elapsed month is logged. February is open until 7 March.'}
              </div>
            </div>
          </Card>
        </div>

        {subject.matrix && subject.weightedByMonth ? (
          <Card style={{ padding: '20px 24px 22px' }}>
            <div className="spread" style={{ alignItems: 'baseline', marginBottom: 16 }}>
              <SectionLabel>Achievement by key result area</SectionLabel>
              <div style={{ fontSize: 13, color: 'var(--grey-body)' }}>
                Numerals are coloured only for exceptions —{' '}
                <span style={{ color: 'var(--red)', fontWeight: 700 }}>below 70%</span> and{' '}
                <span style={{ color: 'var(--green)', fontWeight: 700 }}>above 120%</span>,
                the two bands that require a context note
              </div>
            </div>

            <table className="data-table" style={{ fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ padding: '9px 12px' }}>Key result area</th>
                  <th className="is-num" style={{ padding: '9px 8px' }}>
                    Wt
                  </th>
                  {MONTH_HEADS.map((m, i) => (
                    <th
                      key={m}
                      style={{
                        textAlign: 'center',
                        padding: '9px 4px',
                        color: i === 11 ? 'var(--grey-body)' : 'var(--navy)',
                        background: i === 10 ? 'var(--tint-blue)' : undefined,
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
                      <div style={{ fontSize: 12, color: 'var(--grey-body)' }}>{row.unit}</div>
                    </td>
                    <td className="is-num" style={{ padding: '11px 8px' }}>
                      {row.weight}%
                    </td>
                    {row.closed.map((value, i) => (
                      <td
                        key={MONTH_HEADS[i]}
                        className="num"
                        style={{
                          padding: '11px 4px',
                          textAlign: 'center',
                          color: value === null ? 'var(--grey-line)' : matrixCellColour(value),
                          fontWeight: value !== null && (value < 70 || value > 120) ? 700 : 400,
                        }}
                      >
                        {value === null ? '—' : value}
                      </td>
                    ))}
                    {/* February is open; March is not yet reached. */}
                    <td
                      style={{
                        padding: '11px 4px',
                        textAlign: 'center',
                        color: 'var(--grey-line)',
                        background: '#f7fbfe',
                      }}
                    >
                      —
                    </td>
                    <td
                      style={{ padding: '11px 4px', textAlign: 'center', color: 'var(--grey-line)' }}
                    >
                      —
                    </td>
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
                  <td style={{ padding: 12 }} colSpan={2}>
                    <span style={{ fontWeight: 700, color: 'var(--navy)' }}>
                      Weighted monthly score
                    </span>
                  </td>
                  {subject.weightedByMonth.map((value, i) => (
                    <td
                      key={MONTH_HEADS[i]}
                      className="num"
                      style={{
                        padding: '12px 4px',
                        textAlign: 'center',
                        fontWeight: 700,
                        color: value === null ? 'var(--grey-line)' : 'var(--navy)',
                      }}
                    >
                      {value === null ? '—' : value}
                    </td>
                  ))}
                  <td
                    style={{
                      padding: '12px 4px',
                      textAlign: 'center',
                      color: 'var(--grey-line)',
                      background: '#f7fbfe',
                    }}
                  >
                    —
                  </td>
                  <td
                    style={{ padding: '12px 4px', textAlign: 'center', color: 'var(--grey-line)' }}
                  >
                    —
                  </td>
                  <td
                    className="is-num"
                    style={{
                      padding: 12,
                      fontWeight: 700,
                      color: 'var(--navy)',
                      fontSize: 16,
                    }}
                  >
                    {subject.yearAverage.toFixed(1)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </Card>
        ) : null}

        {suppressed ? (
          <div
            className="row"
            style={{
              gap: 26,
              padding: '16px 20px',
              background: 'var(--grey-surface)',
              borderRadius: 'var(--radius)',
              fontSize: 14,
              lineHeight: 1.55,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontWeight: 700, color: 'var(--navy)', flex: 'none' }}>
              Coverage bands
            </span>
            {COVERAGE_BANDS.map((b) => (
              <span key={b.band}>
                <strong style={{ color: `var(--${b.tone === 'navy' ? 'navy' : b.tone})` }}>
                  {b.range}
                </strong>{' '}
                {b.label}
              </span>
            ))}
          </div>
        ) : null}

        {contextNotes.length > 0 ? (
          <Card tone="navy" style={{ padding: '20px 24px 22px' }}>
            <SectionLabel tone="navy">Context notes from the year</SectionLabel>
            <div className="stack" style={{ gap: 14, marginTop: 14 }}>
              {contextNotes.map((note, i) => (
                <div key={note.when} className="stack" style={{ gap: 14 }}>
                  {i > 0 ? <div style={{ height: 1, background: 'var(--grey-surface)' }} /> : null}
                  <div className="stack" style={{ gap: 3 }}>
                    <div
                      className="num"
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: note.tone === 'green' ? 'var(--green)' : 'var(--red)',
                      }}
                    >
                      {note.when}
                    </div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{note.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {lockedMonths.length > 0 ? (
          <Card style={{ padding: '20px 24px 22px' }}>
            <SectionLabel>Acknowledgements &amp; queries</SectionLabel>
            <p style={{ margin: '6px 0 14px', fontSize: 13.5, color: 'var(--grey-body)', maxWidth: '80ch' }}>
              {own
                ? 'Acknowledging confirms you have seen a locked month. A query on a specific month goes to your manager, not HR.'
                : 'What this person has confirmed seeing, and any questions raised against a specific month.'}
            </p>
            <table className="data-table" style={{ fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ padding: '9px 12px' }}>Month</th>
                  <th className="is-num" style={{ padding: '9px 10px', width: 90 }}>
                    Score
                  </th>
                  <th style={{ padding: '9px 12px', width: 170 }}>Acknowledged</th>
                  <th style={{ padding: '9px 12px' }}>Queries</th>
                </tr>
              </thead>
              <tbody>
                {lockedMonths.map((month) => (
                  <tr key={month.cycleId}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--navy)' }}>
                      {month.label}
                    </td>
                    <td className="is-num" style={{ padding: '10px 10px' }}>
                      {month.weightedScore === null ? '—' : month.weightedScore.toFixed(1)}
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
                          Not yet
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
                              <span className="num" style={{ color: 'var(--grey-body)', fontSize: 12.5 }}>
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
