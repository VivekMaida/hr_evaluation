import type { MonthPoint } from '@/lib/types';
import { STRIP_CEILING, bandColour, trackFraction } from '@/lib/score';
import styles from './YearStrip.module.css';

export type StripSize = 'large' | 'medium' | 'small';

type SizeSpec = {
  bar: number;
  track: number;
  gap: number;
  showScores: boolean;
  showMonths: 'full' | 'initial' | 'none';
  showTarget: boolean;
};

/**
 * Three sizes, and only three.
 *
 * - large  — 24px bars, 118px track, score printed above each month. Used once
 *            per Scorecard, at the top of the record.
 * - medium — 13px bars, 60px track, month initials only. Beside the rating
 *            control in Reviews and in the Performance Log side panel.
 * - small  — 4px bars, 20px track, 70px total. No labels: it reads as shape,
 *            not as data. Never smaller than this.
 */
const SIZES: Record<StripSize, SizeSpec> = {
  large: {
    bar: 24,
    track: 118,
    gap: 10,
    showScores: true,
    showMonths: 'full',
    showTarget: true,
  },
  medium: {
    bar: 13,
    track: 60,
    gap: 6,
    showScores: false,
    showMonths: 'initial',
    showTarget: true,
  },
  small: {
    bar: 4,
    track: 20,
    gap: 2,
    showScores: false,
    showMonths: 'none',
    showTarget: false,
  },
};

const TRACK_CLASS: Record<MonthPoint['status'], string> = {
  scored: styles.trackScored,
  'not-logged': styles.trackNotLogged,
  open: styles.trackOpen,
  future: styles.trackFuture,
};

const STATUS_TEXT: Record<MonthPoint['status'], string> = {
  scored: '',
  'not-logged': 'not logged',
  open: 'open',
  future: 'not yet reached',
};

type Props = {
  points: MonthPoint[];
  size?: StripSize;
  /** Names the strip for screen readers, e.g. "Kavita Nair, FY 2025–26". */
  label: string;
};

export function YearStrip({ points, size = 'large', label }: Props) {
  const spec = SIZES[size];
  const targetOffset = (100 / STRIP_CEILING) * spec.track;

  const summary = points
    .map((p) =>
      p.status === 'scored' && typeof p.score === 'number'
        ? `${p.month} ${p.score.toFixed(1)}%`
        : `${p.month} ${STATUS_TEXT[p.status]}`,
    )
    .join(', ');

  return (
    <div
      className={styles.strip}
      style={{ gap: `${spec.gap}px` }}
      role="img"
      aria-label={`${label}. ${summary}.`}
    >
      {points.map((point) => {
        const scored = point.status === 'scored' && typeof point.score === 'number';
        return (
          <div key={point.month} className={styles.column}>
            {spec.showScores ? (
              <div
                className={`${styles.score} ${scored ? '' : styles.scoreMuted}`}
                style={scored ? { color: bandColour(point.score as number) } : undefined}
              >
                {scored ? (point.score as number).toFixed(0) : '—'}
              </div>
            ) : null}

            <div
              className={`${styles.track} ${TRACK_CLASS[point.status]}`}
              style={{ width: `${spec.bar}px`, height: `${spec.track}px` }}
            >
              {scored ? (
                <span
                  className={styles.bar}
                  style={{
                    height: `${trackFraction(point.score as number) * spec.track}px`,
                    background: bandColour(point.score as number),
                  }}
                />
              ) : null}
              {spec.showTarget ? (
                <span className={styles.target} style={{ bottom: `${targetOffset}px` }} />
              ) : null}
            </div>

            {spec.showMonths === 'none' ? null : (
              <div
                className={`${styles.month} ${
                  point.status === 'open' ? styles.monthOpen : ''
                }`}
              >
                {spec.showMonths === 'initial' ? point.month.charAt(0) : point.month}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
