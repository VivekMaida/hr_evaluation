export type UploadStep = 'download' | 'validate' | 'confirmed';

const STEPS: { key: UploadStep; label: string }[] = [
  { key: 'download', label: '1 · Download the template' },
  { key: 'validate', label: '2 · Upload and check' },
  { key: 'confirmed', label: '3 · Confirmed' },
];

/**
 * Progress, not navigation. The steps are not clickable: you cannot arrive at
 * "confirmed" without having gone through the check, which is the whole point
 * of the screen.
 */
export function UploadStepper({ step }: { step: UploadStep }) {
  const current = STEPS.findIndex((s) => s.key === step);

  return (
    <ol
      className="row"
      style={{ gap: 10, listStyle: 'none', margin: 0, padding: 0, flexWrap: 'wrap' }}
    >
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={s.key}
            aria-current={active ? 'step' : undefined}
            style={{
              fontSize: 13,
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: 'var(--radius)',
              color: active ? 'var(--white)' : done ? 'var(--navy)' : 'var(--grey-body)',
              background: active ? 'var(--navy)' : done ? 'var(--panel)' : 'transparent',
              border: `1px solid ${active ? 'var(--navy)' : 'var(--grey-line)'}`,
            }}
          >
            {s.label}
          </li>
        );
      })}
    </ol>
  );
}
