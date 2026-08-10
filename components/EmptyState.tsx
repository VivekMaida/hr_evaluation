import type { ReactNode } from 'react';
import { SectionLabel } from './ui';

/**
 * Building wireframes and elevation line-art are an established M3M motif.
 * Use them only in empty states, login screens and cover panels — thin lines
 * at low opacity. Never behind data, tables or charts.
 *
 * The blocked states (locked month, failed import) deliberately do NOT get
 * line-art: those screens hold real information.
 */
export function EmptyState({
  label,
  heading,
  body,
  actions,
  foot,
}: {
  label: string;
  heading: string;
  body: ReactNode;
  actions?: ReactNode;
  foot?: ReactNode;
}) {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: 390,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div className="lineart" aria-hidden="true" />
      <div className="lineart__block" style={{ left: 96, width: 150, height: 180 }} aria-hidden="true" />
      <div className="lineart__block" style={{ left: 246, width: 104, height: 250 }} aria-hidden="true" />
      <div className="lineart__block" style={{ right: 110, width: 186, height: 216 }} aria-hidden="true" />
      <div className="lineart__block" style={{ right: 296, width: 96, height: 142 }} aria-hidden="true" />

      <div
        style={{
          position: 'relative',
          maxWidth: 620,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          padding: '48px 24px',
        }}
      >
        <SectionLabel>{label}</SectionLabel>
        <div style={{ fontSize: 26, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.2 }}>
          {heading}
        </div>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--grey-body)' }}>
          {body}
        </p>
        {actions ? (
          <div className="row" style={{ gap: 12, marginTop: 8 }}>
            {actions}
          </div>
        ) : null}
        {foot ? (
          <div
            className="num"
            style={{ fontSize: 13.5, color: 'var(--grey-body)', marginTop: 4 }}
          >
            {foot}
          </div>
        ) : null}
      </div>
    </div>
  );
}
