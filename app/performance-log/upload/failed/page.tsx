import Link from 'next/link';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card, Chip, SectionLabel } from '@/components/ui';

export const metadata = { title: 'Import failed · M3M Perform' };

/**
 * 08c — every row rejected. Distinct from the partial-commit report in Screen
 * 07: there is no commit bar here because there is nothing that could commit.
 * No line-art — this screen is carrying diagnostic information.
 *
 * NOTE: the source design document was truncated part-way through this table's
 * header, so the last two columns ("Value read" / "Why it failed") follow the
 * pattern of the Screen 07 rejection table rather than the drawn original.
 */
const AS_READ = [
  {
    row: 4,
    columnB: 'Rohit Verma',
    kra: 'Booking value achieved',
    valueRead: '13.92',
    why: 'No employee ID. Three people at M3M share this name.',
  },
  {
    row: 5,
    columnB: 'Rohit Verma',
    kra: 'Units sold',
    valueRead: '9',
    why: 'No employee ID. Three people at M3M share this name.',
  },
  {
    row: 6,
    columnB: 'Kavita Nair',
    kra: 'Booking value achieved',
    valueRead: '15.40',
    why: 'No employee ID, and the sheet is stamped January 2026.',
  },
  {
    row: 7,
    columnB: 'Kavita Nair',
    kra: 'Collection against demand raised',
    valueRead: '91',
    why: 'No employee ID, and the sheet is stamped January 2026.',
  },
];

export default function ImportFailedPage() {
  return (
    <>
      <ScreenHeader
        title="Performance Log"
        meta="February 2026 · Sales · spreadsheet upload"
      />

      <div
        style={{
          padding: '22px 36px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <div
          className="callout callout--alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 26,
            borderLeftWidth: 4,
            padding: '20px 24px',
          }}
        >
          <div className="stack" style={{ flex: 1, minWidth: 0, gap: 5 }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--red)' }}>
              All 40 rows were rejected. Nothing was written.
            </div>
            <div style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--grey-body)' }}>
              <strong style={{ color: 'var(--navy)' }}>Sales Feb tracker.xlsx</strong> is a
              January template with the month cell still reading January 2026, and the
              employee column holds names rather than IDs. Both are fixable in the file —
              or download a fresh February template and paste your actuals into it.
            </div>
          </div>
          <div className="row" style={{ gap: 10, flex: 'none' }}>
            <Link
              href="/performance-log/upload"
              className="btn btn--secondary"
              style={{ fontSize: 14.5, textDecoration: 'none' }}
            >
              Try another file
            </Link>
            <button type="button" className="btn btn--primary" style={{ fontSize: 14.5 }}>
              Download February template
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <Card tone="red" style={{ padding: '18px 22px 20px' }}>
            <div className="stack" style={{ gap: 8 }}>
              <SectionLabel tone="red">Problem 1 · Wrong month</SectionLabel>
              <div style={{ fontSize: 14.5, lineHeight: 1.55 }}>
                Cell B2 reads <strong style={{ color: 'var(--navy)' }}>January 2026</strong>.
                The open cycle is February 2026. Perform will not write February actuals
                from a sheet stamped January — that is how a month gets logged twice.
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
                Affects all 40 rows.
              </div>
            </div>
          </Card>

          <Card tone="red" style={{ padding: '18px 22px 20px' }}>
            <div className="stack" style={{ gap: 8 }}>
              <SectionLabel tone="red">Problem 2 · Names instead of IDs</SectionLabel>
              <div style={{ fontSize: 14.5, lineHeight: 1.55 }}>
                Column B holds full names. Perform matches on employee ID because names
                repeat — there are <strong style={{ color: 'var(--navy)' }}>three</strong>{' '}
                people called Rohit Verma at M3M.
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
                Affects all 40 rows.
              </div>
            </div>
          </Card>
        </div>

        <Card style={{ padding: '18px 22px 20px', borderTopColor: 'var(--grey-line)' }}>
          <div className="spread" style={{ alignItems: 'baseline', marginBottom: 14 }}>
            <SectionLabel tone="navy">First rows, as read</SectionLabel>
            <Link href="/performance-log/upload" style={{ fontSize: 13.5, fontWeight: 700 }}>
              Download the full error report
            </Link>
          </div>
          <table className="data-table" style={{ fontSize: 14 }}>
            <thead>
              <tr>
                <th className="is-num" style={{ padding: '9px 10px', width: 60 }}>
                  Row
                </th>
                <th style={{ padding: '9px 12px', width: 220 }}>Column B, as read</th>
                <th style={{ padding: '9px 12px' }}>Key result area</th>
                <th className="is-num" style={{ padding: '9px 10px', width: 100 }}>
                  Value read
                </th>
                <th style={{ padding: '9px 12px', width: 320 }}>Why it failed</th>
              </tr>
            </thead>
            <tbody>
              {AS_READ.map((r) => (
                <tr key={r.row}>
                  <td className="is-num" style={{ padding: '10px', color: 'var(--grey-body)' }}>
                    {r.row}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--red)' }}>{r.columnB}</span>{' '}
                    <Chip tone="red" tight>
                      Not an ID
                    </Chip>
                  </td>
                  <td style={{ padding: '10px 12px' }}>{r.kra}</td>
                  <td
                    className="is-num"
                    style={{ padding: '10px', fontWeight: 700, color: 'var(--navy)' }}
                  >
                    {r.valueRead}
                  </td>
                  <td style={{ padding: '10px 12px' }}>{r.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
