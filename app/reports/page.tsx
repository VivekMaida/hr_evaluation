import Link from 'next/link';
import { forbidden, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ConsistencyScatter } from '@/components/reports/ConsistencyScatter';
import { RatingSpreadBar } from '@/components/reports/RatingSpreadBar';
import { Card, Chip, SectionLabel } from '@/components/ui';
import { FY_LABEL, todayLabel } from '@/lib/constants';
import {
  CONSISTENCY_RUN,
  LEAD_SPREADS,
  ORG_RATING_AVERAGE,
  REPORT_FILTERS as F,
  TOTAL_LEADS,
  patternTone,
} from '@/lib/reports-data';

export const metadata = { title: 'Reports · M3M Perform' };
export const dynamic = 'force-dynamic';

const PATTERN_CHIP = {
  navy: undefined,
  amber: 'amber',
  red: 'red',
} as const;

function FilterPill({ children }: { children: string }) {
  return (
    <span
      style={{
        fontSize: 14,
        fontWeight: 700,
        color: 'var(--navy)',
        background: 'var(--white)',
        border: '1px solid var(--grey-line)',
        borderRadius: 'var(--radius)',
        padding: '6px 14px',
      }}
    >
      {children}
    </span>
  );
}

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'HR') forbidden();

  return (
    <>
      <ScreenHeader
        title="Reports"
        meta={`${FY_LABEL} · run against the record as it stands on ${todayLabel()}`}
        aside={
          <Link href="#" style={{ fontSize: 13.5, fontWeight: 700 }}>
            Export to Excel
          </Link>
        }
      />

      <div
        style={{
          padding: '22px 36px 34px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div
          className="row"
          style={{
            gap: 14,
            flexWrap: 'wrap',
            padding: '14px 18px',
            background: 'var(--grey-surface)',
            borderRadius: 'var(--radius)',
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '.14em',
              color: 'var(--navy)',
              textTransform: 'uppercase',
            }}
          >
            Filters
          </span>
          <FilterPill>{F.scope}</FilterPill>
          <FilterPill>{F.period}</FilterPill>
          <FilterPill>{F.coverage}</FilterPill>
          <span
            className="num"
            style={{ fontSize: 13.5, color: 'var(--grey-body)', marginLeft: 'auto' }}
          >
            {F.included.toLocaleString('en-IN')} of {F.total.toLocaleString('en-IN')}{' '}
            employees included · {F.excluded} excluded for thin coverage
          </span>
        </div>

        <Card style={{ padding: '22px 26px 24px' }}>
          <div className="spread" style={{ alignItems: 'baseline', marginBottom: 4 }}>
            <SectionLabel>Report 01 · Consistency analysis</SectionLabel>
            <Link href="#" style={{ fontSize: 13.5, fontWeight: 700 }}>
              Download underlying data
            </Link>
          </div>
          <p style={{ margin: '0 0 20px', fontSize: 14, lineHeight: 1.55, maxWidth: '104ch' }}>
            Every employee plotted by year average against month-to-month variance. A
            steady performer sits low; a person carried by two strong months sits high,
            whatever their average.{' '}
            <strong style={{ color: 'var(--navy)' }}>
              This report informs the calibration conversation. It does not adjust anyone&apos;s
              score, rating or record.
            </strong>
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) 280px',
              gap: 32,
              alignItems: 'start',
            }}
          >
            <ConsistencyScatter />

            <div className="stack" style={{ gap: 16 }}>
              <div className="stack" style={{ gap: 10 }}>
                <SectionLabel tone="navy">Reading it</SectionLabel>
                <div className="row" style={{ gap: 10, fontSize: 14 }}>
                  <span
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: '50%',
                      background: 'var(--navy)',
                      flex: 'none',
                    }}
                  />
                  One employee
                </div>
                <div className="row" style={{ gap: 10, fontSize: 14 }}>
                  <span
                    style={{
                      width: 13,
                      height: 13,
                      borderRadius: '50%',
                      background: 'var(--white)',
                      border: '3px solid var(--amber)',
                      flex: 'none',
                      boxSizing: 'content-box',
                    }}
                  />
                  Last quarter more than 15 points above the year
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--grey-body)' }}>
                  The vertical axis is the standard deviation of the twelve monthly scores.
                  Same average, different story: a person at 95 with an SD of 3 and a person
                  at 95 with an SD of 20 are not the same employee.
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--grey-surface)' }} />

              <div className="stack" style={{ gap: 8 }}>
                <SectionLabel tone="navy">This run</SectionLabel>
                {(
                  [
                    ['Median SD', CONSISTENCY_RUN.medianSd.toFixed(1), 'var(--navy)'],
                    ['Steady, at or above target', `${CONSISTENCY_RUN.steadyAtOrAbove}%`, 'var(--green)'],
                    ['Variable, below target', `${CONSISTENCY_RUN.variableBelow}%`, 'var(--red)'],
                    ['Late-quarter spikes', `${CONSISTENCY_RUN.lateRunPeople} people`, 'var(--amber)'],
                  ] as const
                ).map(([label, value, colour]) => (
                  <div key={label} className="spread" style={{ fontSize: 14 }}>
                    <span>{label}</span>
                    <span className="num" style={{ fontWeight: 700, color: colour }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card style={{ padding: '22px 26px 24px' }}>
          <div className="spread" style={{ alignItems: 'baseline', marginBottom: 4 }}>
            <SectionLabel>Report 02 · Rating spread by lead</SectionLabel>
            <Link href="#" style={{ fontSize: 13.5, fontWeight: 700 }}>
              Download underlying data
            </Link>
          </div>
          <p style={{ margin: '0 0 20px', fontSize: 14, lineHeight: 1.55, maxWidth: '104ch' }}>
            Each lead&apos;s submitted annual ratings, shown as the range they used and the
            average they landed on. A lead who never goes below 4 and a lead who never goes
            above 3 are both worth a conversation before calibration.{' '}
            <strong style={{ color: 'var(--navy)' }}>
              This report informs that conversation. It does not adjust anyone&apos;s rating,
              and no distribution is imposed.
            </strong>
          </p>

          <table className="data-table" style={{ fontSize: 14.5 }}>
            <thead>
              <tr>
                <th style={{ padding: '9px 12px' }}>Lead</th>
                <th style={{ padding: '9px 12px' }}>Department</th>
                <th className="is-num" style={{ padding: '9px 10px', width: 60 }}>
                  Team
                </th>
                <th style={{ padding: '9px 16px' }}>Rating range used · 1 to 5</th>
                <th className="is-num" style={{ padding: '9px 10px', width: 78 }}>
                  Average
                </th>
                <th className="is-num" style={{ padding: '9px 10px', width: 70 }}>
                  Spread
                </th>
                <th style={{ padding: '9px 12px', width: 170 }}>Pattern</th>
              </tr>
            </thead>
            <tbody>
              {LEAD_SPREADS.map((row) => {
                const tone = patternTone(row.pattern);
                const chip = PATTERN_CHIP[tone];
                return (
                  <tr key={row.lead}>
                    <td style={{ padding: '11px 12px', fontWeight: 700, color: 'var(--navy)' }}>
                      {row.lead}
                    </td>
                    <td style={{ padding: '11px 12px' }}>{row.department}</td>
                    <td className="is-num" style={{ padding: '11px 10px' }}>
                      {row.team}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <RatingSpreadBar row={row} />
                    </td>
                    <td
                      className="is-num"
                      style={{ padding: '11px 10px', fontWeight: 700, color: 'var(--navy)' }}
                    >
                      {row.average.toFixed(1)}
                    </td>
                    <td className="is-num" style={{ padding: '11px 10px' }}>
                      {row.high - row.low}
                    </td>
                    <td style={{ padding: '11px 12px' }}>
                      {chip ? (
                        <Chip tone={chip} tight>
                          {row.pattern}
                        </Chip>
                      ) : row.pattern === 'Uses the full scale' ? (
                        <Chip tone="green" tight>
                          {row.pattern}
                        </Chip>
                      ) : (
                        <span style={{ fontSize: 12.5, color: 'var(--grey-body)' }}>
                          {row.pattern}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div
            className="row"
            style={{
              flexWrap: 'wrap',
              gap: 22,
              marginTop: 16,
              fontSize: 13,
              color: 'var(--grey-body)',
            }}
          >
            <span className="row" style={{ gap: 7 }}>
              <span style={{ width: 26, height: 12, borderRadius: 2, background: 'var(--navy)' }} />
              Range of ratings used
            </span>
            <span className="row" style={{ gap: 7 }}>
              <span style={{ width: 26, height: 12, borderRadius: 2, background: 'var(--amber)' }} />
              Range covers half the scale or less
            </span>
            <span className="row" style={{ gap: 7 }}>
              <span style={{ width: 3, height: 16, background: 'var(--navy)' }} />
              That lead&apos;s average
            </span>
            <span className="row" style={{ gap: 7 }}>
              <span style={{ width: 0, height: 16, borderLeft: '1px dashed var(--navy)' }} />
              Org average, {ORG_RATING_AVERAGE}
            </span>
            <span style={{ marginLeft: 'auto' }}>
              Sorted by lead average, high to low · {TOTAL_LEADS} leads in the full report
            </span>
          </div>
        </Card>
      </div>
    </>
  );
}
