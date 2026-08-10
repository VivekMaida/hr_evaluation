'use client';

export type UploadStep = 'download' | 'validate' | 'done';

const STEPS: { key: UploadStep; n: number; title: string; sub: string }[] = [
  { key: 'download', n: 1, title: 'Download the template', sub: 'Pre-filled with your team' },
  { key: 'validate', n: 2, title: 'Upload and check', sub: 'Nothing is saved yet' },
  { key: 'done', n: 3, title: 'Confirm', sub: 'Committed to the record' },
];

export function UploadStepper({
  step,
  onChange,
}: {
  step: UploadStep;
  onChange: (next: UploadStep) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        border: '1px solid var(--grey-line)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
      }}
    >
      {STEPS.map((s, i) => {
        const active = s.key === step;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onChange(s.key)}
            aria-current={active ? 'step' : undefined}
            style={{
              flex: 1,
              fontFamily: 'inherit',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 20px',
              background: active ? 'var(--tint-green)' : 'var(--white)',
              border: 'none',
              borderRight:
                i < STEPS.length - 1 ? '1px solid var(--grey-line)' : 'none',
              cursor: 'pointer',
            }}
          >
            <span
              className="step-num"
              style={{
                width: 26,
                height: 26,
                fontSize: 13,
                background: active ? 'var(--green)' : 'var(--grey-surface)',
                color: active ? 'var(--white)' : 'var(--navy)',
              }}
            >
              {s.n}
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: active ? 'var(--navy)' : 'var(--grey-body)',
                }}
              >
                {s.title}
              </span>
              <span style={{ fontSize: 13, color: 'var(--grey-body)' }}>{s.sub}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
