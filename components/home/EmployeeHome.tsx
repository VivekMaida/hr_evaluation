import Link from 'next/link';
import { ScreenHeader } from '@/components/ScreenHeader';
import { YearStrip } from '@/components/YearStrip';
import { Screen, StatCard } from '@/components/ui';
import { FY_LABEL } from '@/lib/constants';
import type { EmployeeHomeData } from '@/lib/employee-home';
import { consistencyLabel, coverageBand, trendLabel } from '@/lib/scorecard';
import { consistency, signed, trend } from '@/lib/score';

/**
 * An employee's own Home — their own year only. No team data, no org data,
 * no other names anywhere on this screen.
 */
export function EmployeeHome({ data }: { data: EmployeeHomeData }) {
  const { employee, points, monthsLogged, eligibleMonths, yearAverage, latestLocked } = data;
  const band = coverageBand(monthsLogged, eligibleMonths);
  const suppressed = band === 'insufficient';
  const sd = consistency(points);
  const delta = trend(points);

  return (
    <>
      <ScreenHeader title="Home" meta={employee.name} />

      <Screen>
        {latestLocked && !latestLocked.acknowledged ? (
          <div
            className="callout callout--info"
            style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}
          >
            <div style={{ flex: 1 }}>
              <div className="callout__title">
                {latestLocked.label.split(' ')[0]} is now available.
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
                Take a look and acknowledge it on your Scorecard.
              </div>
            </div>
            <Link
              href="/scorecard"
              className="btn btn--primary"
              style={{ flex: 'none', fontSize: 14, textDecoration: 'none' }}
            >
              Open Scorecard
            </Link>
          </div>
        ) : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 316px',
            gap: 18,
            alignItems: 'start',
          }}
        >
          <div style={{ padding: '8px 44px 0 0' }}>
            <YearStrip
              size="large"
              points={points}
              label={`${employee.name}, ${FY_LABEL}`}
              highlightMonth={latestLocked?.month}
            />
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 18,
          }}
        >
          <StatCard
            label="Year average"
            labelTone={suppressed ? 'grey' : 'navy'}
            tone="navy"
            value={yearAverage === null ? '—' : yearAverage.toFixed(1)}
            foot={
              suppressed
                ? `Mean of ${monthsLogged} months — treat as a sample, not a year`
                : `Mean of ${monthsLogged} logged months`
            }
          />
          <StatCard
            label="Consistency"
            labelTone={suppressed ? 'grey' : 'navy'}
            tone="navy"
            value={consistencyLabel(sd, monthsLogged)}
            foot={
              suppressed
                ? 'Suppressed — needs 6 or more months'
                : `SD ${sd?.toFixed(1) ?? '—'}`
            }
          />
          <StatCard
            label="Trend"
            labelTone={suppressed ? 'grey' : 'navy'}
            tone="navy"
            value={suppressed ? '—' : trendLabel(delta)}
            foot={
              suppressed || delta === null
                ? 'Suppressed — no comparable halves'
                : signed(delta)
            }
          />
          <StatCard
            label="Coverage"
            labelTone={suppressed ? 'red' : 'green'}
            tone={suppressed ? 'red' : 'green'}
            value={String(monthsLogged)}
            suffix={`of ${eligibleMonths} months`}
            foot={suppressed ? 'Insufficient' : 'Complete to date'}
          />
        </div>
      </Screen>
    </>
  );
}
