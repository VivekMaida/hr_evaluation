import Link from 'next/link';
import { Card, SectionLabel } from '@/components/ui';
import { STILL_TO_FIX, UPLOAD_CONTEXT as U } from '@/lib/upload-data';

export function UploadStepDone({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div
        className="callout callout--positive"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 26,
          borderLeftWidth: 4,
          padding: '20px 24px',
        }}
      >
        <div className="stack" style={{ flex: 1, minWidth: 0, gap: 5 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--green)' }}>
            {U.willCommit} rows committed · {U.completeAfter} employees logged for February
          </div>
          <div style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--grey-body)' }}>
            Committed {U.committedAt} by {U.lead} from {U.uploadedName}. Recorded in the
            activity log and visible to HR.
          </div>
        </div>
        <Link href="/activity" style={{ flex: 'none', fontSize: 13.5, fontWeight: 700 }}>
          View activity log
        </Link>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 18,
        }}
      >
        {(
          [
            [
              'Committed',
              `${U.willCommit}`,
              'rows',
              `${U.overwrites} of them overwrote an earlier submission`,
              'green',
            ],
            ['Skipped', `${U.rejected}`, 'rows', 'Nothing was written for these', 'red'],
            [
              'February completeness',
              `${U.completeAfter}`,
              `of ${U.employees}`,
              '4 days until the cycle locks',
              'amber',
            ],
          ] as const
        ).map(([label, value, unit, foot, tone]) => (
          <Card key={label} tone={tone} style={{ padding: '18px 22px 20px' }}>
            <div className="stack" style={{ gap: 5 }}>
              <SectionLabel tone={tone}>{label}</SectionLabel>
              <div
                className="num"
                style={{ fontSize: 34, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.05 }}
              >
                {value}{' '}
                <span style={{ fontSize: 18, color: 'var(--grey-body)', fontWeight: 400 }}>
                  {unit}
                </span>
              </div>
              <div className="num" style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
                {foot}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card tone="red" style={{ padding: '20px 24px 22px' }}>
        <div className="stack" style={{ gap: 16 }}>
          <div className="spread" style={{ alignItems: 'baseline' }}>
            <SectionLabel tone="red">
              Still to fix — {STILL_TO_FIX.length} employees
            </SectionLabel>
            <Link href="/performance-log/upload" style={{ fontSize: 13.5, fontWeight: 700 }}>
              Download the {U.rejected} skipped rows as a sheet
            </Link>
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, maxWidth: '100ch' }}>
            Their February is unlogged. Fix the rows in the file and upload again, or enter
            them through the form — whichever is quicker. Both routes write to the same
            record.
          </p>

          {STILL_TO_FIX.map((person) => (
            <div
              key={person.name}
              className="spread"
              style={{
                gap: 20,
                border: '1px solid var(--grey-line)',
                borderRadius: 'var(--radius)',
                padding: '16px 18px',
              }}
            >
              <div className="stack" style={{ gap: 3 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>
                  {person.name}
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
                  {person.detail}
                </div>
              </div>
              <div className="row" style={{ gap: 10, flex: 'none' }}>
                <button
                  type="button"
                  className="btn btn--secondary"
                  style={{ fontSize: 14, padding: '9px 16px' }}
                >
                  See the rows
                </button>
                <Link
                  href="/performance-log"
                  className="btn btn--primary"
                  style={{ fontSize: 14, padding: '10px 18px', textDecoration: 'none' }}
                >
                  Enter in the form
                </Link>
              </div>
            </div>
          ))}

          <div
            className="spread"
            style={{
              gap: 20,
              background: 'var(--panel)',
              borderRadius: 'var(--radius)',
              padding: '14px 18px',
            }}
          >
            <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--grey-body)' }}>
              Two more people were never in the file at all —{' '}
              <strong style={{ color: 'var(--navy)' }}>Sneha Pillai</strong> and{' '}
              <strong style={{ color: 'var(--navy)' }}>Vivek Anand</strong>. They are still
              outstanding for February.
            </div>
            <span
              style={{ flex: 'none', fontSize: 13.5, fontWeight: 700, color: 'var(--grey-line)' }}
              title="My Team has not been designed yet"
            >
              Open My Team
            </span>
          </div>
        </div>
      </Card>

      <div className="row" style={{ justifyContent: 'flex-end', gap: 12 }}>
        <button
          type="button"
          className="btn btn--secondary"
          style={{ fontSize: 14.5 }}
          onClick={onRestart}
        >
          Upload another file
        </button>
        <span
          className="btn btn--primary btn--large"
          style={{ textDecoration: 'none', opacity: 0.5, cursor: 'not-allowed' }}
          aria-disabled="true"
          title="My Team has not been designed yet"
        >
          Back to My Team
        </span>
      </div>
    </div>
  );
}
