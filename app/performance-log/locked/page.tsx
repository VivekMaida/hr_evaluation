import Link from 'next/link';
import { forbidden, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card, Chip } from '@/components/ui';

export const metadata = { title: 'January 2026 · locked · M3M Perform' };
export const dynamic = 'force-dynamic';

/**
 * 08b — a lead opens a month that closed. No line-art: the screen holds real
 * data. Locked months cannot be edited by leads — that is what makes the record
 * evidence rather than a working document.
 */
const LOCKED_ROWS = [
  { kra: 'Booking value achieved', unit: '₹ Cr', weight: 30, target: '12.00', actual: '13.92', achievement: '116.0%' },
  { kra: 'Units sold', unit: 'count', weight: 20, target: '8', actual: '9', achievement: '112.5%' },
  { kra: 'Collection against demand raised', unit: '%', weight: 20, target: '85', actual: '84', achievement: '98.8%' },
];

export default async function LockedMonthPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role === 'EMPLOYEE') forbidden();

  return (
    <>
      <ScreenHeader
        title="Performance Log"
        meta="January 2026 · Sales · locked 7 February"
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
          className="callout callout--neutral"
          style={{ display: 'flex', alignItems: 'center', gap: 26 }}
        >
          <div className="stack" style={{ flex: 1, minWidth: 0, gap: 5 }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--navy)' }}>
              January closed on 7 February. This month is read-only.
            </div>
            <div style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--grey-body)' }}>
              Locked months cannot be edited by leads — that is what makes the record
              evidence rather than a working document. To change a figure here, raise a
              correction request; HR reviews it and the change is stamped with who asked,
              who approved and why.
            </div>
          </div>
          <div className="row" style={{ gap: 10, flex: 'none' }}>
            <Link
              href="/performance-log"
              className="btn btn--secondary"
              style={{ fontSize: 14.5, textDecoration: 'none' }}
            >
              Go to February
            </Link>
            <button
              type="button"
              className="btn"
              style={{
                fontSize: 14.5,
                color: 'var(--white)',
                background: 'var(--navy)',
                border: 'none',
                padding: '11px 22px',
              }}
            >
              Request a correction
            </button>
          </div>
        </div>

        <div className="spread" style={{ alignItems: 'flex-start', gap: 24 }}>
          <div className="stack" style={{ gap: 4 }}>
            <div style={{ fontSize: 23, fontWeight: 600, color: 'var(--navy)' }}>
              Rohit Verma
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
              Senior Manager, Sales · EMP-10233 · submitted 4 February, 3:18 pm by Ananya
              Mehra
            </div>
          </div>
          <Chip tone="grey">Locked</Chip>
        </div>

        {/* Grey top rule: the card carries no live status. */}
        <Card
          className="card--flush"
          style={{ overflow: 'hidden', borderTopColor: 'var(--grey-line)' }}
        >
          <table className="data-table" style={{ fontSize: 14.5 }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 14px' }}>Key result area</th>
                <th className="is-num" style={{ padding: '10px 10px', width: 74 }}>Weight</th>
                <th className="is-num" style={{ padding: '10px 10px', width: 96 }}>Target</th>
                <th className="is-num" style={{ padding: '10px 10px', width: 118 }}>Actual</th>
                <th className="is-num" style={{ padding: '10px 10px', width: 110 }}>Achievement</th>
                <th style={{ padding: '10px 14px', width: 290 }}>Context note</th>
              </tr>
            </thead>
            <tbody>
              {LOCKED_ROWS.map((row) => (
                <tr key={row.kra}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{row.kra}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--grey-body)' }}>{row.unit}</div>
                  </td>
                  <td className="is-num" style={{ padding: '12px 10px' }}>{row.weight}%</td>
                  <td className="is-num" style={{ padding: '12px 10px' }}>{row.target}</td>
                  {/* Where an input sat on the open month, a filled cell sits here. */}
                  <td
                    className="is-num"
                    style={{
                      padding: '12px 10px',
                      fontWeight: 700,
                      color: 'var(--navy)',
                      background: 'var(--panel)',
                    }}
                  >
                    {row.actual}
                  </td>
                  <td
                    className="is-num"
                    style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--navy)' }}
                  >
                    {row.achievement}
                  </td>
                  <td
                    style={{ padding: '12px 14px', fontSize: 13.5, color: 'var(--grey-body)' }}
                  >
                    —
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--panel)', borderTop: '2px solid var(--navy)' }}>
                <td style={{ padding: 14 }} colSpan={3}>
                  <span style={{ fontWeight: 700, color: 'var(--navy)' }}>
                    Weighted score · January
                  </span>
                </td>
                <td
                  className="num"
                  style={{
                    padding: '14px 10px',
                    textAlign: 'right',
                    fontSize: 24,
                    fontWeight: 600,
                    color: 'var(--navy)',
                  }}
                  colSpan={2}
                >
                  107.0
                </td>
                <td style={{ padding: 14, textAlign: 'right' }}>
                  <Link href="/scorecard/EMP-10233" style={{ fontSize: 13.5, fontWeight: 700 }}>
                    Open Scorecard
                  </Link>
                </td>
              </tr>
            </tfoot>
          </table>
        </Card>
      </div>
    </>
  );
}
