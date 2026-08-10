import type { CSSProperties, ReactNode } from 'react';

export type Tone = 'green' | 'cyan' | 'amber' | 'red' | 'grey' | 'navy';

export function Chip({
  tone = 'grey',
  tight,
  children,
}: {
  tone?: Tone;
  tight?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={`chip chip--${tone} ${tight ? 'chip--tight' : ''}`}>{children}</span>
  );
}

export function SectionLabel({
  tone = 'green',
  children,
}: {
  tone?: 'green' | 'navy' | 'amber' | 'red' | 'cyan' | 'grey';
  children: ReactNode;
}) {
  const modifier = tone === 'green' ? '' : ` section-label--${tone}`;
  return <div className={`section-label${modifier}`}>{children}</div>;
}

export function Card({
  tone = 'green',
  className = '',
  style,
  children,
}: {
  tone?: 'green' | 'cyan' | 'amber' | 'red' | 'navy';
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const modifier = tone === 'green' ? '' : ` card--${tone}`;
  return (
    <div className={`card${modifier} ${className}`} style={style}>
      {children}
    </div>
  );
}

/**
 * The three-up metric row. The top rule carries the status: green for a plain
 * count, navy for a neutral figure, amber or red when it wants attention.
 */
export function StatCard({
  label,
  labelTone = 'green',
  value,
  suffix,
  foot,
  tone = 'green',
}: {
  label: string;
  labelTone?: 'green' | 'navy' | 'amber' | 'red' | 'cyan' | 'grey';
  value: string;
  suffix?: string;
  foot?: ReactNode;
  tone?: 'green' | 'cyan' | 'amber' | 'red' | 'navy';
}) {
  return (
    <Card tone={tone} style={{ padding: '18px 22px 20px' }}>
      <div className="stack" style={{ gap: 6 }}>
        <SectionLabel tone={labelTone}>{label}</SectionLabel>
        <div
          className="num"
          style={{
            fontSize: 34,
            fontWeight: 600,
            color: 'var(--navy)',
            lineHeight: 1.05,
          }}
        >
          {value}
          {suffix ? (
            <span style={{ fontSize: 19, color: 'var(--grey-body)', fontWeight: 400 }}>
              {' '}
              {suffix}
            </span>
          ) : null}
        </div>
        {foot ? (
          <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>{foot}</div>
        ) : null}
      </div>
    </Card>
  );
}

export function ProgressBar({
  value,
  max,
  tone = 'var(--green)',
}: {
  value: number;
  max: number;
  tone?: string;
}) {
  const percent = max === 0 ? 0 : Math.max(0, Math.min(1, value / max)) * 100;
  return (
    <div
      style={{
        height: 8,
        background: 'var(--grey-surface)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
      }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div style={{ width: `${percent}%`, height: '100%', background: tone }} />
    </div>
  );
}

/** Standard page body padding for a working surface. */
export function Screen({
  children,
  gap = 22,
}: {
  children: ReactNode;
  gap?: number;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: '26px 36px 34px',
        display: 'flex',
        flexDirection: 'column',
        gap,
        background: 'var(--white)',
      }}
    >
      {children}
    </div>
  );
}
