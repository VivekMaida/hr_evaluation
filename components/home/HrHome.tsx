import Link from 'next/link';
import { ScreenHeader } from '@/components/ScreenHeader';
import { YearStrip } from '@/components/YearStrip';
import { Card, Chip, SectionLabel } from '@/components/ui';
import { TODAY_LABEL, buildYear } from '@/lib/data';
import {
  COMPLETENESS,
  COMPLETENESS_TOTAL,
  CONVERSATIONS,
  EXCEPTIONS,
  LATE_RUNS,
  ORG_TOTALS,
  completenessCell,
  type DepartmentCompleteness,
} from '@/lib/hr-data';
import { signed } from '@/lib/score';

const MONTH_HEADS = [
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
  'JAN',
] as const;

const headCell = {
  textAlign: 'center' as const,
  fontWeight: 700,
  color: 'var(--navy)',
  padding: '8px 2px',
  background: 'var(--grey-surface)',
  borderRadius: 'var(--radius)',
  width: 52,
};

function HeatRow({ row, total }: { row: DepartmentCompleteness; total?: boolean }) {
  const edge = total
    ? { borderTop: '2px solid var(--navy)', padding: '11px 2px' }
    : { padding: '9px 2px' };
  const cell = (value: number, key: string) => {
    const skin = total
      ? {
          background: 'transparent',
          color: value < 60 ? 'var(--red)' : 'var(--navy)',
          fontWeight: 700,
        }
      : completenessCell(value);
    return (
      <td
        key={key}
        className="num"
        style={{
          ...edge,
          textAlign: 'center',
          borderRadius: 'var(--radius)',
          ...skin,
        }}
      >
        {value}
      </td>
    );
  };

  return (
    <tr>
      <td
        style={{
          ...(total
            ? { borderTop: '2px solid var(--navy)', padding: '11px 10px' }
            : { padding: '9px 10px' }),
          fontWeight: 700,
          color: 'var(--navy)',
        }}
      >
        {row.name}
      </td>
      <td
        className="num"
        style={{
          ...(total
            ? { borderTop: '2px solid var(--navy)', padding: '11px 8px', fontWeight: 700 }
            : { padding: '9px 8px' }),
          textAlign: 'right',
          color: total ? 'var(--navy)' : undefined,
        }}
      >
        {row.staff.toLocaleString('en-IN')}
      </td>
      {row.closed.map((value, i) => cell(value, MONTH_HEADS[i]))}
      {cell(row.february, 'FEB')}
      <td
        style={{
          ...edge,
          textAlign: 'center',
          color: 'var(--grey-line)',
          background: total ? 'transparent' : '#f2f2f2',
          borderRadius: 'var(--radius)',
        }}
      >
        —
      </td>
      <td
        className="num"
        style={{
          ...(total
            ? {
                borderTop: '2px solid var(--navy)',
                padding: '11px 10px',
                fontSize: 15,
              }
            : { padding: '9px 10px' }),
          textAlign: 'right',
          fontWeight: 700,
          color:
            row.ytdTone === 'red'
              ? 'var(--red)'
              : row.ytdTone === 'amber'
                ? 'var(--amber)'
                : 'var(--navy)',
        }}
      >
        {row.ytd}
      </td>
    </tr>
  );
}

function LegendSwatch({ colour, children }: { colour: string; children: string }) {
  return (
    <span className="row" style={{ gap: 7 }}>
      <span
        style={{
          width: 26,
          height: 14,
          borderRadius: 'var(--radius)',
          background: colour,
        }}
      />
      {children}
    </span>
  );
}

export function HrHome() {
  return (
    <>
      <ScreenHeader
        title="Home"
        meta={`All departments · ${ORG_TOTALS.employees.toLocaleString('en-IN')} employees · ${ORG_TOTALS.leads} leads`}
        aside={
          <span className="num" style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
            {TODAY_LABEL}
          </span>
        }
      />

      <div
        style={{
          padding: '24px 36px 34px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 18,
          }}
        >
          <Card tone="amber" style={{ padding: '18px 22px 20px' }}>
            <div className="stack" style={{ gap: 5 }}>
              <SectionLabel tone="amber">February · open</SectionLabel>
              <div className="num" style={{ fontSize: 36, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.05 }}>
                {ORG_TOTALS.februaryPercent}%
              </div>
              <div className="num" style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
                {ORG_TOTALS.februaryLogged.toLocaleString('en-IN')} of{' '}
                {ORG_TOTALS.employees.toLocaleString('en-IN')} · locks in 4 days
              </div>
            </div>
          </Card>

          <Card tone="navy" style={{ padding: '18px 22px 20px' }}>
            <div className="stack" style={{ gap: 5 }}>
              <SectionLabel tone="navy">Year to date</SectionLabel>
              <div className="num" style={{ fontSize: 36, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.05 }}>
                {ORG_TOTALS.ytdPercent}%
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
                Mean completeness, April to January
              </div>
            </div>
          </Card>

          <Card tone="red" style={{ padding: '18px 22px 20px' }}>
            <div className="stack" style={{ gap: 5 }}>
              <SectionLabel tone="red">Departments under 80%</SectionLabel>
              <div className="num" style={{ fontSize: 36, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.05 }}>
                {ORG_TOTALS.departmentsUnder80}
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
                {ORG_TOTALS.departmentsUnder80Names}
              </div>
            </div>
          </Card>

          <Card tone="cyan" style={{ padding: '18px 22px 20px' }}>
            <div className="stack" style={{ gap: 5 }}>
              <SectionLabel tone="cyan">Exception requests</SectionLabel>
              <div className="num" style={{ fontSize: 36, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.05 }}>
                {ORG_TOTALS.exceptionRequests}
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
                Awaiting HR decision · oldest {ORG_TOTALS.oldestExceptionDays} days
              </div>
            </div>
          </Card>
        </div>

        <Card style={{ padding: '20px 24px 22px' }}>
          <div className="spread" style={{ alignItems: 'baseline', marginBottom: 16 }}>
            <SectionLabel>
              Submission completeness · percentage of employees logged
            </SectionLabel>
            <Link href="/reports" style={{ fontSize: 13.5, fontWeight: 700 }}>
              Open in Reports
            </Link>
          </div>

          <table
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 3,
              fontSize: 13.5,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: 'left',
                    fontWeight: 700,
                    color: 'var(--navy)',
                    padding: '8px 10px',
                    background: 'var(--grey-surface)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  Department
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    fontWeight: 700,
                    color: 'var(--navy)',
                    padding: '8px 8px',
                    background: 'var(--grey-surface)',
                    borderRadius: 'var(--radius)',
                    width: 74,
                  }}
                >
                  Staff
                </th>
                {MONTH_HEADS.map((m) => (
                  <th key={m} style={headCell}>
                    {m}
                  </th>
                ))}
                <th
                  style={{
                    ...headCell,
                    color: 'var(--blue)',
                    background: 'var(--tint-blue)',
                  }}
                >
                  FEB
                </th>
                <th
                  style={{
                    ...headCell,
                    color: 'var(--grey-body)',
                    background: '#f2f2f2',
                  }}
                >
                  MAR
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    fontWeight: 700,
                    color: 'var(--navy)',
                    padding: '8px 10px',
                    background: 'var(--grey-surface)',
                    borderRadius: 'var(--radius)',
                    width: 74,
                  }}
                >
                  YTD
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPLETENESS.map((row) => (
                <HeatRow key={row.name} row={row} />
              ))}
              <HeatRow row={COMPLETENESS_TOTAL} total />
            </tbody>
          </table>

          <div
            className="row"
            style={{
              flexWrap: 'wrap',
              gap: 20,
              marginTop: 16,
              fontSize: 13,
              color: 'var(--grey-body)',
            }}
          >
            <LegendSwatch colour="var(--green)">100% logged</LegendSwatch>
            <LegendSwatch colour="var(--tint-green)">85–99</LegendSwatch>
            <LegendSwatch colour="var(--tint-amber)">60–84</LegendSwatch>
            <LegendSwatch colour="var(--tint-red)">under 60</LegendSwatch>
            <LegendSwatch colour="var(--tint-blue)">open cycle</LegendSwatch>
            <LegendSwatch colour="#f2f2f2">not reached</LegendSwatch>
            <span style={{ marginLeft: 'auto' }}>
              Four steps, not a continuous ramp — the eye should count bands, not judge
              shades.
            </span>
          </div>
        </Card>

        <div className="row" style={{ alignItems: 'baseline', gap: 16, paddingTop: 4 }}>
          <SectionLabel>Needs a conversation</SectionLabel>
          <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
            Nothing on this list changes a score, a rating or a record. It is a list of
            calls to make.
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 18,
            alignItems: 'start',
          }}
        >
          <Card tone="red" style={{ padding: '20px 22px 22px' }}>
            <div className="stack" style={{ gap: 16 }}>
              <div className="spread" style={{ alignItems: 'baseline' }}>
                <SectionLabel tone="red">Consecutive months missed</SectionLabel>
                <Chip tone="red" tight>
                  2 departments
                </Chip>
              </div>
              {CONVERSATIONS.map((item, i) => (
                <div key={item.name} className="stack" style={{ gap: 16 }}>
                  {i > 0 ? (
                    <div style={{ height: 1, background: 'var(--grey-surface)' }} />
                  ) : null}
                  <div className="stack" style={{ gap: 5 }}>
                    <div className="spread" style={{ alignItems: 'baseline', gap: 12 }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>
                        {item.name}
                      </span>
                      <span
                        className="num"
                        style={{ fontSize: 13.5, color: 'var(--grey-body)' }}
                      >
                        {item.scale}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.55 }}>
                      {item.summary}
                      <strong
                        style={{
                          color:
                            item.emphasisTone === 'red' ? 'var(--red)' : 'var(--amber)',
                        }}
                      >
                        {item.emphasis}
                      </strong>
                      {item.tail}
                    </div>
                    <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
                      {item.head}
                    </div>
                    <div className="row" style={{ gap: 12, marginTop: 6 }}>
                      {item.links.map((label) => (
                        <Link
                          key={label}
                          href="/calibration"
                          style={{ fontSize: 13.5, fontWeight: 700 }}
                        >
                          {label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card tone="cyan" style={{ padding: '20px 22px 22px' }}>
            <div className="stack" style={{ gap: 14 }}>
              <div className="spread" style={{ alignItems: 'baseline' }}>
                <SectionLabel tone="cyan">Exception requests pending</SectionLabel>
                <Chip tone="cyan" tight>
                  {ORG_TOTALS.exceptionRequests} waiting
                </Chip>
              </div>
              {EXCEPTIONS.map((item, i) => (
                <div key={item.name} className="stack" style={{ gap: 14 }}>
                  {i > 0 ? (
                    <div style={{ height: 1, background: 'var(--grey-surface)' }} />
                  ) : null}
                  <div className="stack" style={{ gap: 4 }}>
                    <div className="spread" style={{ gap: 12 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>
                        {item.name}
                      </span>
                      <span
                        className="num"
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color:
                            item.daysWaiting >= 10 ? 'var(--red)' : 'var(--grey-body)',
                        }}
                      >
                        {item.daysWaiting} days waiting
                      </span>
                    </div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{item.detail}</div>
                  </div>
                </div>
              ))}
              <div style={{ height: 1, background: 'var(--grey-surface)' }} />
              <Link href="/admin" style={{ fontSize: 13.5, fontWeight: 700 }}>
                Three more in Admin → Exception approvals
              </Link>
            </div>
          </Card>
        </div>

        <Card tone="amber" style={{ padding: '20px 24px 22px' }}>
          <div className="spread" style={{ alignItems: 'baseline', marginBottom: 6 }}>
            <SectionLabel tone="amber">Last quarter well above the year</SectionLabel>
            <Link href="/reports" style={{ fontSize: 13.5, fontWeight: 700 }}>
              Full list in Reports
            </Link>
          </div>
          <p style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.55, maxWidth: '96ch' }}>
            Employees whose October–December average sits more than 15 points above their
            year-to-date average. A late run may be a genuine turnaround or a target that
            got easier — the record cannot tell the difference, so a person has to.{' '}
            <strong style={{ color: 'var(--navy)' }}>Flagged, never scored.</strong>
          </p>
          <table className="data-table" style={{ fontSize: 14.5 }}>
            <thead>
              <tr>
                <th style={{ padding: '9px 12px' }}>Employee</th>
                <th style={{ padding: '9px 12px' }}>Department</th>
                <th style={{ padding: '9px 12px', width: 110 }}>Apr → Mar</th>
                <th className="is-num" style={{ padding: '9px 12px' }}>
                  Year to date
                </th>
                <th className="is-num" style={{ padding: '9px 12px' }}>
                  Oct – Dec
                </th>
                <th className="is-num" style={{ padding: '9px 12px' }}>
                  Gap
                </th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {LATE_RUNS.map((row) => (
                <tr key={row.id}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{row.name}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--grey-body)' }}>
                      {row.title} · {row.id}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>{row.department}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <YearStrip
                      size="small"
                      points={buildYear(row.closed)}
                      label={`${row.name}, twelve months`}
                    />
                  </td>
                  <td className="is-num" style={{ padding: '10px 12px' }}>
                    {row.ytd.toFixed(1)}
                  </td>
                  <td
                    className="is-num"
                    style={{ padding: '10px 12px', color: 'var(--navy)', fontWeight: 700 }}
                  >
                    {row.lastQuarter.toFixed(1)}
                  </td>
                  <td
                    className="is-num"
                    style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--amber)' }}
                  >
                    {signed(row.lastQuarter - row.ytd)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <Link
                      href={`/scorecard/${row.id}`}
                      style={{ fontSize: 13.5, fontWeight: 700 }}
                    >
                      Open Scorecard
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
