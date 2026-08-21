import { Card, Chip, SectionLabel } from '@/components/ui';
import { FY_LABEL } from '@/lib/constants';
import { BANDS, type ReviewSubject } from '@/lib/reviews';

/**
 * The rating as the record currently stands, and what that band actually
 * asserts. There is nothing to submit and nothing to sign off: this is the
 * aggregate of the months logged so far, restated every time the screen is
 * opened. It replaces the old band-picking tool (RatingCard) and the
 * employee's read-only view of a finalized decision (RatingSummary) — with no
 * year-end step, both described a workflow that no longer exists.
 *
 * The band's *meaning* carries as much weight here as its number, because the
 * number alone is what made this screen a duplicate of the Scorecard's
 * headline figure. The words are the point.
 */
export function CurrentRating({ subject: S, own }: { subject: ReviewSubject; own: boolean }) {
  const insufficient = S.coverage === 'insufficient';

  return (
    <Card
      tone={insufficient ? 'amber' : 'navy'}
      style={{ padding: '22px 26px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}
    >
      <div className="spread" style={{ alignItems: 'baseline', gap: 16 }}>
        <SectionLabel tone={insufficient ? 'amber' : 'navy'}>
          {own ? `Your rating · ${FY_LABEL}` : `Rating · ${FY_LABEL}`}
        </SectionLabel>
        <Chip tone={S.stillAccruing ? 'cyan' : 'green'} tight>
          {S.stillAccruing ? 'Still accruing' : 'All eligible months in'}
        </Chip>
      </div>

      <div className="row" style={{ gap: 22, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <div
          className="num"
          style={{ fontSize: 44, fontWeight: 700, color: 'var(--navy)', lineHeight: 1 }}
        >
          {S.band.value}
        </div>
        <div className="stack" style={{ gap: 2, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.2 }}>
            {S.band.label}
          </div>
          <div className="num" style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
            Band {S.band.value} of 5 · {S.band.range} · aggregate {S.yearAverage.toFixed(1)}
          </div>
        </div>
      </div>

      {/* What the band means — the sentence the conversation should start from. */}
      <p
        style={{
          margin: 0,
          fontSize: 15,
          lineHeight: 1.6,
          color: 'var(--navy)',
          maxWidth: '78ch',
        }}
      >
        {S.band.meaning}
      </p>

      {/* The basis, stated plainly — an average of what is logged, not a
          forecast of the year, and it moves as months lock. */}
      <div
        className="stack"
        style={{ gap: 8, borderTop: '1px solid var(--grey-surface)', paddingTop: 14 }}
      >
        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--grey-body)' }}>
          Built from <strong style={{ color: 'var(--navy)' }}>{S.monthsLogged}</strong> of{' '}
          {S.eligibleMonths} eligible months —{' '}
          <strong style={{ color: 'var(--navy)' }}>{S.includedMonths.join(' · ')}</strong>.
          {S.pendingMonths.length > 0 ? (
            <> Not counted yet: {S.pendingMonths.join(' · ')}.</>
          ) : null}{' '}
          This is the mean of those months, not a projection of the full year, and it is
          recalculated every time a month locks
          {S.stillAccruing ? ' — it will move as the remaining months come in' : ''}.
        </div>
        {insufficient ? (
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--amber)', fontWeight: 700 }}>
            Coverage is thin — too few months are on record for this band to carry the weight of a
            full-year rating yet.
          </div>
        ) : null}
      </div>

      {/* The ladder, so the band above reads as a position, not a verdict. */}
      <div
        className="stack"
        style={{ gap: 6, borderTop: '1px solid var(--grey-surface)', paddingTop: 14 }}
      >
        <SectionLabel tone="navy">Where the bands sit</SectionLabel>
        {[...BANDS].reverse().map((b) => {
          const isCurrent = b.value === S.band.value;
          return (
            <div
              key={b.value}
              className="spread"
              style={{
                fontSize: 13.5,
                fontWeight: isCurrent ? 700 : 400,
                color: isCurrent ? 'var(--navy)' : 'var(--grey-body)',
              }}
            >
              <span>
                {b.value} {b.label}
              </span>
              <span className="num">{b.range}</span>
            </div>
          );
        })}
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--grey-body)', marginTop: 2 }}>
          The band in bold is where the logged months currently average out. It moves on its own as
          months lock — nobody selects it.
        </div>
      </div>
    </Card>
  );
}
