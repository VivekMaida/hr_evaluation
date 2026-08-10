import {
  ORG_RATING_AVERAGE,
  patternTone,
  ratingPct,
  type LeadSpread,
} from '@/lib/reports-data';

const TONE_FILL = {
  navy: 'var(--navy)',
  amber: 'var(--amber)',
  red: 'var(--red)',
} as const;

/**
 * The range a lead actually used, on a fixed 1–5 track, with their average
 * marked and the org average shown as a dashed reference.
 */
export function RatingSpreadBar({ row }: { row: LeadSpread }) {
  const tone = patternTone(row.pattern);
  const left = ratingPct(row.low);
  const width = ratingPct(row.high) - left;
  // A lead who used exactly one rating still needs to be visible.
  const isPoint = width === 0;

  return (
    <div
      style={{
        position: 'relative',
        height: 22,
        background: 'var(--grey-surface)',
        borderRadius: 'var(--radius)',
      }}
      role="img"
      aria-label={`${row.lead}: ratings ${row.low} to ${row.high}, average ${row.average}`}
    >
      <div
        style={{
          position: 'absolute',
          left: `${ratingPct(ORG_RATING_AVERAGE)}%`,
          top: -3,
          bottom: -3,
          width: 1,
          borderLeft: '1px dashed var(--navy)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: `${left}%`,
          top: 0,
          bottom: 0,
          background: TONE_FILL[tone],
          borderRadius: 'var(--radius)',
          ...(isPoint ? { width: 10, transform: 'translateX(-5px)' } : { width: `${width}%` }),
        }}
      />
      {/* The marker has to read against whatever it sits on. */}
      <div
        style={{
          position: 'absolute',
          left: `${ratingPct(row.average)}%`,
          top: -3,
          bottom: -3,
          width: 3,
          background: tone === 'navy' ? 'var(--white)' : 'var(--navy)',
          transform: 'translateX(-50%)',
        }}
      />
    </div>
  );
}
