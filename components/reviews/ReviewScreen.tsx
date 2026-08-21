import type { ReactNode } from 'react';
import Link from 'next/link';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card, Chip, SectionLabel } from '@/components/ui';
import { REVIEW_CONTEXT, REVIEW_THRESHOLDS, type ReviewSubject } from '@/lib/reviews';
import { signed } from '@/lib/score';
import { CurrentRating } from './CurrentRating';

/**
 * Reviews is the appraisal conversation: what rating the record implies, what
 * that band means, which months were unusual and why, what the manager wrote
 * at the time, and whether the recent run says something different from the
 * year. It is mostly words on purpose.
 *
 * It carries no year strip, no headline stat cards and no KRA matrix — those
 * are the Scorecard's job, and having them on both screens is what made the
 * two indistinguishable. Every route out of here is a link to the Scorecard,
 * never a copy of it.
 */

/** One prose section — label, question-shaped heading, then the answer. */
function Passage({
  label,
  heading,
  children,
  tone = 'green',
}: {
  label: string;
  heading: string;
  children: ReactNode;
  tone?: 'green' | 'navy' | 'amber' | 'red' | 'cyan' | 'grey';
}) {
  return (
    <Card style={{ padding: '20px 24px 22px' }}>
      <div className="stack" style={{ gap: 10 }}>
        <SectionLabel tone={tone}>{label}</SectionLabel>
        <h3
          style={{
            margin: 0,
            fontSize: 19,
            fontWeight: 600,
            color: 'var(--navy)',
            lineHeight: 1.3,
          }}
        >
          {heading}
        </h3>
        {children}
      </div>
    </Card>
  );
}

const PROSE: React.CSSProperties = {
  margin: 0,
  fontSize: 14.5,
  lineHeight: 1.65,
  color: 'var(--grey-body)',
  maxWidth: '86ch',
};

export function ReviewScreen({
  subject: S,
  own = false,
}: {
  subject: ReviewSubject;
  /** Viewing your own record — changes who the copy addresses. */
  own?: boolean;
}) {
  const scorecardHref = own ? '/scorecard' : `/scorecard/${S.id}`;
  const { recency } = S;
  const unacknowledged = S.acknowledgements.length - S.acknowledgedCount;
  const openQueries = S.queries.filter((q) => q.state === 'OPEN').length;

  return (
    <>
      <ScreenHeader
        title="Reviews"
        meta={`${REVIEW_CONTEXT.cycle} · ${
          S.stillAccruing
            ? `${S.monthsLogged} of ${S.eligibleMonths} months in so far`
            : 'every eligible month is in'
        }`}
        aside={
          <Link href={scorecardHref} style={{ fontSize: 13.5, fontWeight: 700 }}>
            Open full Scorecard
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
        <div className="spread" style={{ alignItems: 'flex-start', gap: 32 }}>
          <div className="stack" style={{ gap: 4 }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.1 }}>
              {S.name}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>{S.identity}</div>
          </div>
          <Link
            href={scorecardHref}
            className="btn btn--secondary"
            style={{ fontSize: 14.5, padding: '9px 18px', textDecoration: 'none', flex: 'none' }}
          >
            Where the score came from
          </Link>
        </div>

        {/* 1. The implied band, and what it means. */}
        <CurrentRating subject={S} own={own} />

        {/* 2. The recency check this product exists for. */}
        <Passage
          label="Recency check"
          tone={recency.material ? 'amber' : 'navy'}
          heading={
            recency.material
              ? 'The recent months differ from the rest of the year'
              : 'Does the last quarter differ from the year to date?'
          }
        >
          <p style={PROSE}>{recency.verdict}</p>
          {recency.earlierMonths.length > 0 ? (
            <div style={{ fontSize: 13, color: 'var(--grey-body)' }}>
              Recent window:{' '}
              <strong style={{ color: 'var(--navy)' }}>{recency.recentMonths.join(' · ')}</strong>.
              Earlier: {recency.earlierMonths.join(' · ')}. A gap of{' '}
              {REVIEW_THRESHOLDS.material} points or more counts as material.
            </div>
          ) : null}
          {S.trendHalves ? (
            <div className="num" style={{ fontSize: 13, color: 'var(--grey-body)' }}>
              Across halves of the year: {S.trendHalves.first.toFixed(1)} →{' '}
              {S.trendHalves.second.toFixed(1)} ({signed(S.trendDelta)}) — {S.trend.toLowerCase()}.
              Spread across the logged months is {S.consistency.toLowerCase()}
              {S.consistencySd !== null ? ` (SD ${S.consistencySd.toFixed(1)})` : ''}
              {S.lowest !== null && S.highest !== null
                ? `, no month outside ${S.lowest.toFixed(0)}–${S.highest.toFixed(0)}`
                : ''}
              .
            </div>
          ) : null}
        </Passage>

        {/* 3. Months that need explaining. */}
        <Passage
          label="Unusual months"
          tone={S.flagged.length > 0 ? 'amber' : 'navy'}
          heading={
            S.flagged.length === 0
              ? 'No month on record is unusual'
              : `${S.flagged.length} month${S.flagged.length === 1 ? '' : 's'} worth talking about`
          }
        >
          {S.flagged.length === 0 ? (
            <p style={PROSE}>
              Nothing logged so far falls below {REVIEW_THRESHOLDS.low}% or above{' '}
              {REVIEW_THRESHOLDS.high}%, and no month moved by {REVIEW_THRESHOLDS.swing} points or
              more on the month before it. There is no outlier to account for.
            </p>
          ) : (
            <>
              <p style={PROSE}>
                A month is flagged when it falls below {REVIEW_THRESHOLDS.low}%, rises above{' '}
                {REVIEW_THRESHOLDS.high}%, or moves {REVIEW_THRESHOLDS.swing} points or more on the
                previous logged month. These are the months a rating has to survive questions about.
              </p>
              <div className="stack" style={{ gap: 14, marginTop: 4 }}>
                {S.flagged.map((f) => (
                  <div
                    key={f.monthIndex}
                    className="stack"
                    style={{
                      gap: 6,
                      paddingLeft: 14,
                      borderLeft: `3px solid var(--${f.tone === 'amber' ? 'amber' : f.tone})`,
                    }}
                  >
                    <div className="row" style={{ gap: 10, alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 15 }}>
                        {f.monthLabel}
                      </span>
                      <span
                        className="num"
                        style={{
                          fontWeight: 700,
                          fontSize: 15,
                          color: `var(--${f.tone === 'amber' ? 'navy' : f.tone})`,
                        }}
                      >
                        {f.score.toFixed(1)}
                      </span>
                    </div>
                    {f.reasons.map((reason) => (
                      <div key={reason} style={{ ...PROSE, fontSize: 13.5 }}>
                        {reason}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </Passage>

        {/* 4. The evidence trail — every note, in month order. */}
        <Passage
          label="What the manager wrote"
          tone="navy"
          heading={
            S.contextNotes.length === 0
              ? 'No context notes are on record'
              : `${S.contextNotes.length} context note${S.contextNotes.length === 1 ? '' : 's'} from the year`
          }
        >
          {S.contextNotes.length === 0 ? (
            <p style={PROSE}>
              Nothing has been written against a month yet. A note is required whenever a KRA lands
              outside {REVIEW_THRESHOLDS.low}–{REVIEW_THRESHOLDS.high}%, so an empty trail here
              means no month has gone outside that range — or that the months that did are still
              missing their explanation.
            </p>
          ) : (
            <>
              <p style={PROSE}>
                Written at the time, against a specific KRA in a specific month, in the order they
                happened. This is the evidence the rating rests on — not a summary written at year
                end.
              </p>
              <div className="stack" style={{ gap: 0, marginTop: 6 }}>
                {S.contextNotes.map((note, i) => (
                  <div
                    key={`${note.monthIndex}-${note.kpiName}-${i}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '150px minmax(0, 1fr)',
                      gap: 18,
                      padding: '12px 0',
                      borderTop: i === 0 ? undefined : '1px solid var(--grey-surface)',
                    }}
                  >
                    <div className="stack" style={{ gap: 2 }}>
                      <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14 }}>
                        {note.monthLabel}
                      </div>
                      {note.achievement !== null ? (
                        <div
                          className="num"
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: note.tone === 'green' ? 'var(--green)' : 'var(--red)',
                          }}
                        >
                          {note.achievement.toFixed(0)}%
                        </div>
                      ) : null}
                    </div>
                    <div className="stack" style={{ gap: 3, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
                        {note.kpiName}
                      </div>
                      <div style={{ ...PROSE, fontSize: 14 }}>{note.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Passage>

        {/* 5. Acknowledgements — a record, never a gate. */}
        <Passage
          label="Acknowledgements"
          tone="navy"
          heading={
            S.acknowledgedCount === 0
              ? 'No month has been marked as seen'
              : `${S.acknowledgedCount} of ${S.acknowledgements.length} months marked as seen`
          }
        >
          <p style={PROSE}>
            {own
              ? 'Marking a month as seen is optional. It records the date you looked at it and shows that date to your manager and HR. Nothing is blocked if you never do it — the month still counts and still locks.'
              : 'Which months this person has confirmed seeing, and when. Acknowledging is optional and blocks nothing: an unacknowledged month still counts toward the year and still locks on schedule. Nobody is chased for it.'}
          </p>
          <table className="data-table" style={{ fontSize: 14, marginTop: 6 }}>
            <thead>
              <tr>
                <th style={{ padding: '9px 12px' }}>Month</th>
                <th className="is-num" style={{ padding: '9px 10px', width: 90 }}>
                  Score
                </th>
                <th style={{ padding: '9px 12px', width: 200 }}>Confirmed seen</th>
              </tr>
            </thead>
            <tbody>
              {S.acknowledgements.map((a) => (
                <tr key={a.monthIndex}>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--navy)' }}>
                    {a.monthLabel}
                  </td>
                  <td className="is-num" style={{ padding: '10px 10px' }}>
                    {a.score === null ? '—' : a.score.toFixed(1)}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {a.acknowledgedAtLabel ? (
                      <Chip tone="green" tight>
                        {a.acknowledgedAtLabel}
                      </Chip>
                    ) : (
                      <Chip tone="grey" tight>
                        Not marked
                      </Chip>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {unacknowledged > 0 ? (
            <div style={{ fontSize: 13, color: 'var(--grey-body)', marginTop: 8 }}>
              {unacknowledged} month{unacknowledged === 1 ? '' : 's'} not marked. That is not a
              finding and needs no follow-up.
              {own ? (
                <>
                  {' '}
                  You can mark {unacknowledged === 1 ? 'it' : 'them'} on your{' '}
                  <Link href={scorecardHref} style={{ fontWeight: 700 }}>
                    Scorecard
                  </Link>{' '}
                  if you want to.
                </>
              ) : null}
            </div>
          ) : null}
        </Passage>

        {/* 6. Queries — the only disagreement route there is. */}
        <Passage
          label="Queries"
          tone={openQueries > 0 ? 'amber' : 'navy'}
          heading={
            S.queries.length === 0
              ? 'No queries have been raised'
              : `${S.queries.length} quer${S.queries.length === 1 ? 'y' : 'ies'} raised${
                  openQueries > 0 ? `, ${openQueries} still open` : ', all answered'
                }`
          }
        >
          <p style={PROSE}>
            {own
              ? 'If you disagree with a month, this is the route: raise a query on that month from your Scorecard. It goes to your manager, and both your question and their reply stay attached to the month for good. There is no separate appeal and no re-review.'
              : 'A query is raised against one month and routes to that person’s own manager, not HR. The question and the reply both stay attached to the month permanently — this is the only disagreement route in the product; there is no separate appeal or re-review process.'}
          </p>
          {S.queries.length > 0 ? (
            <div className="stack" style={{ gap: 0, marginTop: 6 }}>
              {[...S.queries]
                .sort((a, b) => a.monthIndex - b.monthIndex)
                .map((q, i) => (
                  <div
                    key={q.id}
                    className="stack"
                    style={{
                      gap: 6,
                      padding: '12px 0',
                      borderTop: i === 0 ? undefined : '1px solid var(--grey-surface)',
                    }}
                  >
                    <div className="row" style={{ gap: 10, alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 14 }}>
                        {q.cycleLabel}
                      </span>
                      <Chip tone={q.state === 'ANSWERED' ? 'green' : 'amber'} tight>
                        {q.state === 'ANSWERED' ? 'Answered' : 'Open'}
                      </Chip>
                      <span className="num" style={{ fontSize: 12.5, color: 'var(--grey-body)' }}>
                        asked {q.askedAtLabel}
                      </span>
                    </div>
                    <div style={{ ...PROSE, fontSize: 14, color: 'var(--navy)', fontWeight: 700 }}>
                      {q.question}
                    </div>
                    {q.state === 'ANSWERED' ? (
                      <div style={{ ...PROSE, fontSize: 14, paddingLeft: 14, borderLeft: '3px solid var(--grey-surface)' }}>
                        {q.response}
                        <span className="num" style={{ fontSize: 12.5 }}>
                          {' '}
                          · replied {q.respondedAtLabel}
                        </span>
                      </div>
                    ) : (
                      <div style={{ ...PROSE, fontSize: 13.5 }}>
                        Awaiting the manager’s reply. It will appear here and on the Scorecard
                        against {q.cycleLabel}.
                      </div>
                    )}
                  </div>
                ))}
            </div>
          ) : null}
        </Passage>
      </div>
    </>
  );
}
