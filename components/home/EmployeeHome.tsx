import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { YearStrip } from '@/components/YearStrip';
import { Screen, StatCard } from '@/components/ui';
import { FY_LABEL } from '@/lib/constants';
import type { EmployeeHomeData } from '@/lib/employee-home';
import { CONSISTENCY_MIN_MONTHS, consistencyLabel, trendLabel } from '@/lib/scorecard';
import { consistency, signed, trend } from '@/lib/score';

/** Months needed before a trend has two halves to compare. */
const TREND_MIN_MONTHS = 4;

type Card = {
  key: string;
  label: string;
  value: string;
  suffix?: string;
  foot: string;
  tone: 'navy' | 'green' | 'amber';
};

/**
 * An employee's own Home — their own year only. No team data, no org data,
 * no other names anywhere on this screen.
 *
 * Deliberately free of coverage judgements. Early in a programme year the only
 * reason a record looks thin is that the year has barely started, and words
 * like "insufficient" read as a verdict on the person rather than a statement
 * about the calendar. Whether the record is yet a fair basis for a rating is a
 * real question — it belongs on Reviews, where a manager or HR is actually
 * making that call, not here.
 */
export function EmployeeHome({ data }: { data: EmployeeHomeData }) {
  const {
    employee,
    points,
    monthsLogged,
    eligibleMonths,
    elapsedMonths,
    loggedMonths,
    yearAverage,
    latestLocked,
  } = data;

  // Nothing on record yet — a year strip of empty tracks over four "—" cards
  // reads as a broken screen, so say plainly that there is nothing to show.
  // Matches the empty states Scorecard and Reviews already render.
  if (monthsLogged === 0) {
    return (
      <>
        <ScreenHeader title="Home" meta={employee.name} />
        <EmptyState
          label="Nothing logged yet"
          heading="No month has been logged for you yet"
          body={
            <>
              Your reporting manager logs one score a month against your KPI set. As soon as the
              first month is submitted it appears here, and on your{' '}
              <Link href="/scorecard" style={{ fontWeight: 700 }}>
                Scorecard
              </Link>
              .
            </>
          }
          foot={`0 of ${eligibleMonths} months this year · ${FY_LABEL}`}
        />
      </>
    );
  }

  const latest = loggedMonths[loggedMonths.length - 1];
  const first = loggedMonths[0];
  // Months that have begun and closed with nothing entered — the only kind of
  // gap that is actually a gap. Months still ahead are not shortfall.
  const missed = Math.max(0, elapsedMonths - monthsLogged);
  const toCome = Math.max(0, eligibleMonths - elapsedMonths);

  const cards: Card[] = [
    {
      key: 'average',
      label: 'Year average',
      value: yearAverage === null ? '—' : yearAverage.toFixed(1),
      // Kept because 85.7 with nothing beside it reads as a verdict on the
      // year. One plain line of scope, not a caveat about the number.
      foot:
        monthsLogged === 1
          ? `Based on ${latest.name} only`
          : `Based on ${monthsLogged} months, ${first.name} to ${latest.name}`,
      tone: 'navy',
    },
    {
      key: 'logged',
      label: 'Months logged',
      value: String(monthsLogged),
      suffix: `of ${eligibleMonths}`,
      foot: toCome === 0 ? 'The full year is in' : `${toCome} still to come this year`,
      tone: 'navy',
    },
    {
      key: 'latest',
      label: `Latest month`,
      value: latest.score.toFixed(1),
      foot: latest.name,
      tone: 'navy',
    },
    {
      key: 'coverage',
      label: 'Coverage',
      value: `${monthsLogged} of ${elapsedMonths}`,
      suffix: elapsedMonths === 1 ? 'month logged' : 'months logged',
      foot:
        missed === 0
          ? 'Every month so far is in'
          : `${missed} month${missed === 1 ? '' : 's'} closed without a score`,
      tone: missed === 0 ? 'green' : 'amber',
    },
  ];

  // Consistency and trend need a run of months to mean anything. Showing them
  // as "—" alongside a real average made the screen look broken, so they are
  // absent until they can be calculated rather than present and empty.
  const sd = consistency(points);
  const delta = trend(points);

  if (monthsLogged >= CONSISTENCY_MIN_MONTHS && sd !== null) {
    cards.push({
      key: 'consistency',
      label: 'Consistency',
      value: consistencyLabel(sd, monthsLogged),
      foot: `SD ${sd.toFixed(1)}`,
      tone: 'navy',
    });
  }

  if (monthsLogged >= TREND_MIN_MONTHS && delta !== null) {
    cards.push({
      key: 'trend',
      label: 'Trend',
      value: trendLabel(delta),
      foot: signed(delta),
      tone: 'navy',
    });
  }

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
            gridTemplateColumns: `repeat(${cards.length}, minmax(0, 1fr))`,
            gap: 18,
          }}
        >
          {cards.map((card) => (
            <StatCard
              key={card.key}
              label={card.label}
              labelTone={card.tone}
              tone={card.tone}
              value={card.value}
              suffix={card.suffix}
              foot={card.foot}
            />
          ))}
        </div>
      </Screen>
    </>
  );
}
