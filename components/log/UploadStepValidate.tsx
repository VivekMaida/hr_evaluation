import Link from 'next/link';
import { Card, Chip, SectionLabel } from '@/components/ui';
import {
  COMMIT_ROWS,
  REJECTED_ROWS,
  UPLOAD_CONTEXT as U,
} from '@/lib/upload-data';

export function UploadStepValidate({ onCommit }: { onCommit: () => void }) {
  return (
    <div className="stack" style={{ gap: 20 }}>
      {/* Nothing is written until Commit. Say so before anything else. */}
      <div className="row" style={{ gap: 26 }}>
        <div
          className="callout callout--warning"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 26,
            borderLeftWidth: 4,
            padding: '20px 24px',
            width: '100%',
          }}
        >
          <div className="stack" style={{ flex: 1, minWidth: 0, gap: 5 }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--amber)' }}>
              Nothing has been saved yet
            </div>
            <div style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--grey-body)' }}>
              This is a check of{' '}
              <strong style={{ color: 'var(--navy)' }}>{U.uploadedName}</strong>, uploaded{' '}
              {U.uploadedAt}. {U.willCommit} of {U.rows} rows would commit; {U.rejected}{' '}
              would be rejected. The record changes only when you press Commit, and only
              the rows listed as passing will be written.
            </div>
          </div>
          <button
            type="button"
            className="btn btn--tertiary"
            style={{ flex: 'none', fontSize: 13.5 }}
          >
            Replace file
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 18,
        }}
      >
        {(
          [
            ['Will commit', `${U.willCommit}`, 'rows', `${U.completeAfter} employees complete`, 'green'],
            ['Rejected', `${U.rejected}`, 'rows', 'Affecting 2 employees', 'red'],
            ['Overwrites', `${U.overwrites}`, 'people', 'Already submitted in February', 'amber'],
            [
              'Still missing after this',
              `${U.stillMissing}`,
              `of ${U.employees}`,
              U.stillMissingNames,
              'navy',
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
              <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>{foot}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card tone="red" style={{ padding: '20px 24px 22px' }}>
        <div className="spread" style={{ alignItems: 'baseline', marginBottom: 6 }}>
          <SectionLabel tone="red">{U.rejected} rejected rows</SectionLabel>
          <div style={{ fontSize: 13, color: 'var(--grey-body)' }}>
            Row numbers match the spreadsheet, so they can be found and fixed in the
            original file
          </div>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.55, maxWidth: '100ch' }}>
          These rows will not be written under any circumstance in this run. Fix them in
          the file and upload again, or enter those people through the form.
        </p>
        <table className="data-table" style={{ fontSize: 14 }}>
          <thead>
            <tr>
              <th className="is-num" style={{ padding: '9px 10px', width: 60 }}>
                Row
              </th>
              <th style={{ padding: '9px 12px', width: 150 }}>Employee</th>
              <th style={{ padding: '9px 12px' }}>Key result area</th>
              <th className="is-num" style={{ padding: '9px 10px', width: 90 }}>
                Value read
              </th>
              <th style={{ padding: '9px 12px', width: 180 }}>Reason</th>
              <th style={{ padding: '9px 12px' }}>What to do</th>
            </tr>
          </thead>
          <tbody>
            {REJECTED_ROWS.map((r) => (
              <tr key={r.row}>
                <td className="is-num" style={{ padding: 10, color: 'var(--grey-body)' }}>
                  {r.row}
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--navy)' }}>
                  {r.employee}
                </td>
                <td style={{ padding: '10px 12px' }}>{r.kra}</td>
                <td
                  className="is-num"
                  style={{
                    padding: 10,
                    fontWeight: 700,
                    color: r.valueBad ? 'var(--red)' : 'var(--navy)',
                  }}
                >
                  {r.valueRead}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <Chip tone={r.reasonTone} tight>
                    {r.reason}
                  </Chip>
                </td>
                <td style={{ padding: '10px 12px' }}>{r.whatToDo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card style={{ padding: '20px 24px 22px' }}>
        <div className="spread" style={{ alignItems: 'baseline', marginBottom: 16 }}>
          <SectionLabel>
            {U.willCommit} rows that will commit · {U.completeAfter} employees
          </SectionLabel>
          <Link href="/performance-log/upload" style={{ fontSize: 13.5, fontWeight: 700 }}>
            Show all {U.willCommit} rows
          </Link>
        </div>
        <table className="data-table" style={{ fontSize: 14.5 }}>
          <thead>
            <tr>
              <th style={{ padding: '9px 12px' }}>Employee</th>
              <th className="is-num" style={{ padding: '9px 10px', width: 80 }}>
                Rows
              </th>
              <th className="is-num" style={{ padding: '9px 10px', width: 140 }}>
                Weighted score
              </th>
              <th style={{ padding: '9px 12px', width: 200 }}>Change</th>
              <th style={{ padding: '9px 12px' }}>Notes carried over</th>
            </tr>
          </thead>
          <tbody>
            {COMMIT_ROWS.map((r) => (
              <tr key={r.employeeId}>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{r.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--grey-body)' }}>
                    {r.employeeId}
                  </div>
                </td>
                <td className="is-num" style={{ padding: 10 }}>
                  {r.rows}
                </td>
                <td
                  className="is-num"
                  style={{ padding: 10, fontWeight: 700, color: 'var(--navy)' }}
                >
                  {r.score.toFixed(1)}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <Chip tone={r.changeTone} tight>
                    {r.change}
                  </Chip>
                </td>
                <td
                  style={{ padding: '10px 12px', fontSize: 13.5, color: 'var(--grey-body)' }}
                >
                  {r.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div
        className="spread"
        style={{
          gap: 24,
          background: 'var(--panel)',
          border: '1px solid var(--grey-line)',
          borderRadius: 'var(--radius)',
          padding: '18px 24px',
        }}
      >
        <div className="stack" style={{ gap: 3 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>
            Commit {U.willCommit} rows and skip {U.rejected}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
            The {U.rejected} rejected rows stay unlogged. Ravi Sundaram and Deepika Rane
            will still show as outstanding.
          </div>
        </div>
        <div className="row" style={{ gap: 12, flex: 'none' }}>
          <button type="button" className="btn btn--secondary" style={{ fontSize: 14.5 }}>
            Cancel upload
          </button>
          <button type="button" className="btn btn--secondary" style={{ fontSize: 14.5 }}>
            Download error report
          </button>
          <button
            type="button"
            className="btn btn--primary btn--large"
            onClick={onCommit}
          >
            Commit {U.willCommit} rows
          </button>
        </div>
      </div>
    </div>
  );
}
