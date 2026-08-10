import Link from 'next/link';
import { CoverageBar } from '@/components/CoverageBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { YearStrip } from '@/components/YearStrip';
import { Card, Chip, SectionLabel } from '@/components/ui';
import {
  BANDS,
  REVIEW_CONTEXT,
  REVIEW_SUBJECT as S,
  impliedBand,
} from '@/lib/reviews-data';
import { consistency, halves, signed, trend } from '@/lib/score';
import { RatingCard } from './RatingCard';

export function ReviewScreen() {
  const sd = consistency(S.points);
  const h = halves(S.points);
  const delta = trend(S.points);
  const implied = impliedBand(S.yearAverage);

  const scores = S.points.map((p) => p.score as number);
  const lo = Math.min(...scores);
  const hi = Math.max(...scores);

  return (
    <>
      <ScreenHeader
        title="Reviews"
        meta={`${REVIEW_CONTEXT.cycle} · ${REVIEW_CONTEXT.closes}`}
        aside={
          <span className="num" style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
            {REVIEW_CONTEXT.submitted} of {REVIEW_CONTEXT.total} submitted
          </span>
        }
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
          <div className="row" style={{ gap: 14, flex: 'none' }}>
            <span className="num" style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
              {REVIEW_CONTEXT.position}
            </span>
            <Link href="/reviews" style={{ fontSize: 13.5, fontWeight: 700 }}>
              Previous
            </Link>
            <Link href="/reviews" style={{ fontSize: 13.5, fontWeight: 700 }}>
              Next
            </Link>
          </div>
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
            <SectionLabel>The year on record · April 2025 to March 2026</SectionLabel>
            <div style={{ paddingRight: 44 }}>
              <YearStrip size="large" points={S.points} label={`${S.name}, FY 2025–26`} />
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
                Mean of {S.monthsLogged} logged months
              </div>
            </div>
          </Card>

          <Card tone="navy" style={{ padding: '18px 22px 20px' }}>
            <div className="stack" style={{ gap: 5 }}>
              <SectionLabel tone="navy">Consistency</SectionLabel>
              <div style={{ fontSize: 36, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.05 }}>
                Steady
              </div>
              <div className="num" style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
                SD {sd?.toFixed(1) ?? '—'} · no month outside {lo.toFixed(0)}–{hi.toFixed(0)}
              </div>
            </div>
          </Card>

          <Card tone="navy" style={{ padding: '18px 22px 20px' }}>
            <div className="stack" style={{ gap: 5 }}>
              <SectionLabel tone="navy">Trend</SectionLabel>
              <div style={{ fontSize: 36, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.05 }}>
                Holding
              </div>
              <div className="num" style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
                H1 {h?.first.toFixed(1)} → H2 {h?.second.toFixed(1)} · {signed(delta)}
              </div>
            </div>
          </Card>

          <Card style={{ padding: '18px 22px 20px' }}>
            <div className="stack" style={{ gap: 10 }}>
              <div className="spread" style={{ alignItems: 'baseline' }}>
                <SectionLabel>Coverage</SectionLabel>
                <Chip tone="green" tight>
                  Complete
                </Chip>
              </div>
              <div className="num" style={{ fontSize: 36, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.05 }}>
                {S.monthsLogged}{' '}
                <span style={{ fontSize: 20, fontWeight: 400, color: 'var(--grey-body)' }}>
                  of 12 months
                </span>
              </div>
              <CoverageBar points={S.points} />
              <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
                Full year on record. This rating is rateable without an exception.
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
          <RatingCard yearAverage={S.yearAverage} />

          <div className="stack" style={{ gap: 16 }}>
            <Card tone="navy" style={{ padding: '18px 20px 20px' }}>
              <div className="stack" style={{ gap: 14 }}>
                <SectionLabel tone="navy">Context notes from the year</SectionLabel>
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
                {[...BANDS].reverse().map((band) => {
                  const isImplied = band.value === implied.value;
                  return (
                    <div
                      key={band.value}
                      className="spread"
                      style={{
                        fontSize: 14,
                        fontWeight: isImplied ? 700 : 400,
                        color: isImplied ? 'var(--navy)' : undefined,
                      }}
                    >
                      <span>
                        {band.value} {band.label}
                      </span>
                      <span className="num" style={{ color: 'var(--navy)' }}>
                        {band.range}
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
                  The band is a reference, not a verdict. One band either way needs no
                  explanation; two or more does.
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
