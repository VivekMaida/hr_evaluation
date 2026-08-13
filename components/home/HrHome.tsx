import { ScreenHeader } from '@/components/ScreenHeader';
import { Card, Chip, SectionLabel } from '@/components/ui';
import { todayLabel } from '@/lib/constants';
import { completenessCell, type DepartmentCompleteness, type OrgCompleteness, type PendingException } from '@/lib/org';

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
          color: row.ytd < 80 ? 'var(--red)' : 'var(--navy)',
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

export function HrHome({
  completeness,
  exceptions,
}: {
  completeness: OrgCompleteness;
  exceptions: PendingException[];
}) {
  const { totals, departments, total } = completeness;

  return (
    <>
      <ScreenHeader
        title="Home"
        meta={`All departments · ${totals.employees.toLocaleString('en-IN')} employees · ${totals.leads} leads`}
        aside={
          <span className="num" style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
            {todayLabel()}
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
                {totals.februaryPercent}%
              </div>
              <div className="num" style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
                {totals.februaryLogged.toLocaleString('en-IN')} of{' '}
                {totals.februaryEligible.toLocaleString('en-IN')}
                {totals.daysLeftLabel ? ` · ${totals.daysLeftLabel}` : ''}
              </div>
            </div>
          </Card>

          <Card tone="navy" style={{ padding: '18px 22px 20px' }}>
            <div className="stack" style={{ gap: 5 }}>
              <SectionLabel tone="navy">Year to date</SectionLabel>
              <div className="num" style={{ fontSize: 36, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.05 }}>
                {totals.ytdPercent}%
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
                {totals.departmentsUnder80}
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
                {totals.departmentsUnder80Names}
              </div>
            </div>
          </Card>

          <Card tone="cyan" style={{ padding: '18px 22px 20px' }}>
            <div className="stack" style={{ gap: 5 }}>
              <SectionLabel tone="cyan">Exception requests</SectionLabel>
              <div className="num" style={{ fontSize: 36, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.05 }}>
                {exceptions.length}
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
                {exceptions.length === 0
                  ? 'None waiting on a decision'
                  : `Awaiting HR decision · oldest ${Math.max(...exceptions.map((e) => e.daysWaiting))} days`}
              </div>
            </div>
          </Card>
        </div>

        <Card style={{ padding: '20px 24px 22px' }}>
          <div className="spread" style={{ alignItems: 'baseline', marginBottom: 16 }}>
            <SectionLabel>
              Submission completeness · percentage of employees logged
            </SectionLabel>
            <span
              style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--grey-line)' }}
              title="Reports has not been designed yet"
            >
              Open in Reports
            </span>
          </div>

          {departments.length === 0 ? (
            <div style={{ fontSize: 14, color: 'var(--grey-body)', padding: '12px 0' }}>
              No department has anyone with KPIs assigned for this fiscal year yet.
            </div>
          ) : (
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
                {departments.map((row) => (
                  <HeatRow key={row.name} row={row} />
                ))}
                {departments.length > 1 ? <HeatRow row={total} total /> : null}
              </tbody>
            </table>
          )}

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
            <span style={{ marginLeft: 'auto' }}>
              Four steps, not a continuous ramp — the eye should count bands, not judge
              shades.
            </span>
          </div>
        </Card>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 18,
            alignItems: 'start',
          }}
        >
          <Card tone="navy" style={{ padding: '20px 22px 22px' }}>
            <div className="stack" style={{ gap: 10 }}>
              <SectionLabel tone="navy">Needs a conversation</SectionLabel>
              <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--grey-body)' }}>
                Consecutive-months-missed needs several elapsed months of real logging
                behind it to mean anything. The pilot doesn't have that history yet — this
                will populate once departments have a few closed cycles on record.
              </div>
            </div>
          </Card>

          <Card tone="cyan" style={{ padding: '20px 22px 22px' }}>
            <div className="stack" style={{ gap: 14 }}>
              <div className="spread" style={{ alignItems: 'baseline' }}>
                <SectionLabel tone="cyan">Exception requests pending</SectionLabel>
                <Chip tone="cyan" tight>
                  {exceptions.length} waiting
                </Chip>
              </div>
              {exceptions.length === 0 ? (
                <div style={{ fontSize: 14, color: 'var(--grey-body)' }}>
                  No exception requests are waiting on a decision.
                </div>
              ) : (
                exceptions.map((item, i) => (
                  <div key={item.id} className="stack" style={{ gap: 14 }}>
                    {i > 0 ? (
                      <div style={{ height: 1, background: 'var(--grey-surface)' }} />
                    ) : null}
                    <div className="stack" style={{ gap: 4 }}>
                      <div className="spread" style={{ gap: 12 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>
                          {item.employeeName}
                        </span>
                        <span
                          className="num"
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: item.daysWaiting >= 10 ? 'var(--red)' : 'var(--grey-body)',
                          }}
                        >
                          {item.daysWaiting} days waiting
                        </span>
                      </div>
                      <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                        {item.detail} · {item.department}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <Card tone="navy" style={{ padding: '20px 24px 22px' }}>
          <div className="stack" style={{ gap: 10 }}>
            <SectionLabel tone="navy">Last quarter well above the year</SectionLabel>
            <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--grey-body)', maxWidth: '96ch' }}>
              This compares each employee's October–December average against their
              year-to-date average, which needs a full year of closed months behind it.
              The pilot doesn't have that history yet — this will populate once the fiscal
              year has run its course.
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
