import type { CSSProperties } from 'react';
import type { MonthPoint } from '@/lib/types';

/** Filled navy is logged, dashed red is a month that closed empty. */
function segmentStyle(point: MonthPoint): CSSProperties {
  switch (point.status) {
    case 'scored':
      return { background: 'var(--navy)' };
    case 'not-logged':
      return { background: 'var(--tint-red)', border: '1px dashed var(--red)' };
    case 'open':
      return { background: 'var(--grey-surface)' };
    case 'future':
      return { background: '#f2f2f2' };
  }
}

export function CoverageBar({ points }: { points: MonthPoint[] }) {
  return (
    <div style={{ display: 'flex', gap: 4 }} aria-hidden="true">
      {points.map((point) => (
        <span
          key={point.month}
          style={{ flex: 1, height: 12, borderRadius: 1, ...segmentStyle(point) }}
        />
      ))}
    </div>
  );
}
