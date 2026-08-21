import { Card, Chip, SectionLabel } from '@/components/ui';
import { FY_LABEL } from '@/lib/constants';
import type { ReviewSubject } from '@/lib/reviews';

/**
 * The rating as the record currently stands. There is nothing to submit and
 * nothing to sign off: this is the aggregate of the months that have locked so
 * far, restated every time the screen is opened. It replaces the old
 * band-picking tool (RatingCard) and the employee's read-only view of a
 * finalized decision (RatingSummary) — with no year-end step, both described
 * a workflow that no longer exists.
 */
export function CurrentRating({ subject: S, own }: { subject: ReviewSubject; own: boolean }) {
  const insufficient = S.coverage === 'insufficient';

  return (
    <Card
      tone={insufficient ? 'amber' : 'navy'}
      style={{ padding: '22px 26px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}
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
            Band {S.band.value} of 5 · {S.band.range}
          </div>
        </div>
      </div>

      {/* The basis, stated plainly — this is an average of what is logged, not
          a forecast of the year, and it moves as months lock. */}
      <div
        className="stack"
        style={{ gap: 8, borderTop: '1px solid var(--grey-surface)', paddingTop: 14 }}
      >
        <div className="spread" style={{ fontSize: 14 }}>
          <span>Average of logged months</span>
          <span className="num" style={{ fontWeight: 700, color: 'var(--navy)' }}>
            {S.yearAverage.toFixed(1)}
          </span>
        </div>
        <div className="spread" style={{ fontSize: 14 }}>
          <span>Months included</span>
          <span className="num" style={{ fontWeight: 700, color: 'var(--navy)' }}>
            {S.monthsLogged} of {S.eligibleMonths} eligible
          </span>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--grey-body)' }}>
          Counted: <strong style={{ color: 'var(--navy)' }}>{S.includedMonths.join(' · ')}</strong>
          {S.pendingMonths.length > 0 ? (
            <>
              {'. '}
              Not counted yet: {S.pendingMonths.join(' · ')}.
            </>
          ) : (
            '.'
          )}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--grey-body)' }}>
          This is the mean of the months above, not a projection of the full year. It is
          recalculated each time a month locks
          {S.stillAccruing ? ' and will move as the remaining months come in' : ''}.
        </div>
        {insufficient ? (
          <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--amber)', fontWeight: 700 }}>
            Coverage is thin — too few months are on record for this to carry the weight of a
            full-year rating yet.
          </div>
        ) : null}
      </div>
    </Card>
  );
}
