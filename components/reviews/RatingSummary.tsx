import { Card, SectionLabel } from '@/components/ui';
import { BANDS, type ReviewRecord } from '@/lib/reviews';

/** Read-only — an employee sees the finalized decision, never the editing tool. */
export function RatingSummary({ review }: { review: ReviewRecord }) {
  const band = BANDS.find((b) => b.value === review.chosenBand);

  return (
    <Card tone="navy" style={{ padding: '22px 26px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionLabel tone="navy">Your annual rating</SectionLabel>
      <div className="num" style={{ fontSize: 32, fontWeight: 700, color: 'var(--navy)' }}>
        {review.chosenBand} — {band?.label ?? '—'}
      </div>

      {review.justification ? (
        <div className="stack" style={{ gap: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--grey-body)' }}>
            Justification
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.55 }}>{review.justification}</div>
        </div>
      ) : null}

      {review.reviewerComment ? (
        <div className="stack" style={{ gap: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--grey-body)' }}>
            Reviewer comment
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.55 }}>{review.reviewerComment}</div>
        </div>
      ) : null}

      <div
        style={{
          fontSize: 13,
          color: 'var(--grey-body)',
          borderTop: '1px solid var(--grey-surface)',
          paddingTop: 12,
        }}
      >
        {review.state === 'CALIBRATED' ? 'Calibrated by HR' : 'Submitted'}
        {review.submittedAtLabel ? ` on ${review.submittedAtLabel}` : ''}
      </div>
    </Card>
  );
}
