import Link from 'next/link';
import { CoverageBar } from '@/components/CoverageBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { YearStrip } from '@/components/YearStrip';
import { Card, Chip, SectionLabel } from '@/components/ui';
import { FY_LABEL, FY_RANGE_LABEL } from '@/lib/constants';
import { BANDS, REVIEW_CONTEXT, type ReviewSubject } from '@/lib/reviews';
import { signed } from '@/lib/score';
import { CurrentRating } from './CurrentRating';

export function ReviewScreen({
  subject: S,
  own = false,
}: {
  subject: ReviewSubject;
  /** Viewing your own record — no cross-team navigation chrome. */
  own?: boolean;
}) {
  // Everything below is computed in lib/reviews.ts from the months that have
  // locked so far; the screen only formats it. There is no submission state
  // because there is no submission — see CurrentRating.
  const { consistencySd: sd, trendHalves: h, trendDelta: delta, coverage: band } = S;
  const lo = S.lowest;
  const hi = S.highest;

  return (
    <>
      <ScreenHeader
        title="Reviews"
        meta={`${REVIEW_CONTEXT.cycle} · ${
          S.stillAccruing
            ? `${S.monthsLogged} of ${S.eligibleMonths} months in so far`
            : 'every eligible month is in'
        }`}
      />

      <div
        style={{
          padding: '24px 36px 34px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div className="spread" style={{ alignItems: 'flex-start', gap: 32 }}>
          <div className="stack" style={{ gap: 4 }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.1 }}>
              {S.name}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>{S.identity}</div>
          </div>
          {own ? null : (
            <Link href={`/scorecard/${S.id}`} style={{ fontSize: 13.5, fontWeight: 700, flex: 'none' }}>
              Open full Scorecard
            </Link>
          )}
        </div>

        <Card
          style={{
            padding: '22px 26px 24px',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 300px',
            gap: 36,
            alignItems: 'start',
          }}
        >
          <div className="stack" style={{ gap: 16 }}>
            <SectionLabel>The year on record · {FY_RANGE_LABEL}</SectionLabel>
            <div style={{ paddingRight: 44 }}>
              <YearStrip size="large" points={S.points} label={`${S.name}, ${FY_LABEL}`} />
            </div>
          </div>
          <div
            className="stack"
            style={{ gap: 12, borderLeft: '1px solid var(--grey-surface)', paddingLeft: 28 }}
          >
            <SectionLabel tone="navy">Evidence</SectionLabel>
            {(
              [
                ['Months logged', S.evidence.monthsLogged],
                ['Context notes', String(S.evidence.contextNotes)],
                ['Months above 120%', String(S.evidence.above120)],
                ['Months below 70%', String(S.evidence.below70)],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="spread" style={{ fontSize: 14 }}>
                <span>{label}</span>
                <span className="num" style={{ fontWeight: 700, color: 'var(--navy)' }}>
                  {value}
                </span>
              </div>
            ))}
            <div style={{ height: 1, background: 'var(--grey-surface)', margin: '2px 0' }} />
            <Link href={`/scorecard/${S.id}`} style={{ fontSize: 13.5, fontWeight: 700 }}>
              Open full Scorecard
            </Link>
          </div>
        </Card>

        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.55fr', gap: 18 }}
        >
          <Card tone="navy" style={{ padding: '18px 22px 20px' }}>
            <div className="stack" style={{ gap: 5 }}>
              <SectionLabel tone="navy">Year average</SectionLabel>
              <div className="num" style={{ fontSize: 36, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.05 }}>
                {S.yearAverage.toFixed(1)}
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
                Mean of {S.monthsLogged} logged {S.monthsLogged === 1 ? 'month' : 'months'} —{' '}
                {S.includedMonths.join(', ')}
              </div>
            </div>
          </Card>

          <Card tone="navy" style={{ padding: '18px 22px 20px' }}>
            <div className="stack" style={{ gap: 5 }}>
              <SectionLabel tone="navy">Consistency</SectionLabel>
              <div style={{ fontSize: 36, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.05 }}>
                {S.consistency}
              </div>
              <div className="num" style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
                {lo === null || hi === null
                  ? 'Suppressed — needs 2 or more logged months'
                  : `SD ${sd?.toFixed(1) ?? '—'} · no month outside ${lo.toFixed(0)}–${hi.toFixed(0)}`}
              </div>
            </div>
          </Card>

          <Card tone="navy" style={{ padding: '18px 22px 20px' }}>
            <div className="stack" style={{ gap: 5 }}>
              <SectionLabel tone="navy">Trend</SectionLabel>
              <div style={{ fontSize: 36, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.05 }}>
                {S.trend}
              </div>
              <div className="num" style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
                {h === null
                  ? 'Suppressed — no comparable halves'
                  : `H1 ${h.first.toFixed(1)} → H2 ${h.second.toFixed(1)} · ${signed(delta)}`}
              </div>
            </div>
          </Card>

          <Card style={{ padding: '18px 22px 20px' }}>
            <div className="stack" style={{ gap: 10 }}>
              <div className="spread" style={{ alignItems: 'baseline' }}>
                <SectionLabel>Coverage</SectionLabel>
                <Chip tone={band === 'insufficient' ? 'red' : 'green'} tight>
                  {band === 'complete' ? 'Complete' : band === 'partial' ? 'Partial' : 'Insufficient'}
                </Chip>
              </div>
              <div className="num" style={{ fontSize: 36, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.05 }}>
                {S.monthsLogged}{' '}
                <span style={{ fontSize: 20, fontWeight: 400, color: 'var(--grey-body)' }}>
                  of {S.eligibleMonths} months
                </span>
              </div>
              <CoverageBar points={S.points} />
              <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
                {band === 'complete'
                  ? 'Enough of the year is on record for the figure to stand on its own.'
                  : band === 'partial'
                    ? 'Enough to be meaningful, but thin — HR should see the gaps.'
                    : 'Too thin to carry the weight of a full-year figure yet.'}
              </div>
            </div>
          </Card>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 340px',
            gap: 18,
            alignItems: 'start',
          }}
        >
          <CurrentRating subject={S} own={own} />

          <div className="stack" style={{ gap: 16 }}>
            <Card tone="navy" style={{ padding: '18px 20px 20px' }}>
              <div className="stack" style={{ gap: 14 }}>
                <SectionLabel tone="navy">Context notes from the year</SectionLabel>
                {S.contextNotes.length === 0 ? (
                  <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
                    No context notes on this record.
                  </div>
                ) : null}
                {S.contextNotes.map((note, i) => (
                  <div key={note.when} className="stack" style={{ gap: 14 }}>
                    {i > 0 ? (
                      <div style={{ height: 1, background: 'var(--grey-surface)' }} />
                    ) : null}
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

            <Card tone="navy" style={{ padding: '18px 20px 20px' }}>
              <div className="stack" style={{ gap: 10 }}>
                <SectionLabel tone="navy">Band reference</SectionLabel>
                {[...BANDS].reverse().map((b) => {
                  const isCurrent = b.value === S.band.value;
                  return (
                    <div
                      key={b.value}
                      className="spread"
                      style={{
                        fontSize: 14,
                        fontWeight: isCurrent ? 700 : 400,
                        color: isCurrent ? 'var(--navy)' : undefined,
                      }}
                    >
                      <span>
                        {b.value} {b.label}
                      </span>
                      <span className="num" style={{ color: 'var(--navy)' }}>
                        {b.range}
                      </span>
                    </div>
                  );
                })}
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: 'var(--grey-body)',
                    marginTop: 4,
                  }}
                >
                  The band in bold is where the logged months currently average out. It moves on
                  its own as months lock — nobody selects it.
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
