import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { EmptyState } from '@/components/EmptyState';
import { RosterIndex, type RosterColumn } from '@/components/RosterIndex';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Chip, Screen } from '@/components/ui';
import { FISCAL_YEAR, FY_LABEL } from '@/lib/constants';
import { bandFor } from '@/lib/reviews';
import { getVisibleRoster } from '@/lib/roster';
import { bandColour } from '@/lib/score';
import { COVERAGE_BANDS, coverageBand } from '@/lib/scorecard';

export const metadata = { title: 'Reviews · M3M Perform' };
export const dynamic = 'force-dynamic';

/**
 * The team-scoped Reviews index: everyone the signed-in person can open a
 * record for, with the figure their record currently implies. Same change as
 * the Scorecard index — this route used to be "my own Reviews" and the team
 * entry deep-linked to an arbitrary report. Own records are at
 * /reviews/[employeeId].
 *
 * The band shown here is the same aggregate the record screen rates, computed
 * from the same helper: there is no separate year-end figure to disagree with
 * it. Coverage is on the row because it is what decides whether the band may
 * be used at all — a rating on an insufficient record is blocked downstream,
 * and finding that out only after opening the record wastes the trip.
 */
export default async function ReviewsIndexPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  // As on /scorecard: an employee has no team, and this was their own
  // record's old address.
  if (session.user.role === 'EMPLOYEE') redirect(`/reviews/${session.user.employeeId}`);

  const { rows } = await getVisibleRoster(session.user, FISCAL_YEAR);
  const isHr = session.user.role === 'HR';

  if (rows.length === 0) {
    return (
      <>
        <ScreenHeader title="Reviews" meta={`Annual figure ${FY_LABEL}`} />
        <EmptyState
          label="No records to open"
          heading={isHr ? 'There is nobody on the roster yet' : 'Nobody reports to you yet'}
          body={
            isHr
              ? 'This list is every employee on the roster. It fills in as accounts are created — until then there is no annual figure to open. Your own Reviews screen is under "My record" in the sidebar.'
              : 'An annual figure belongs to a person on your team, and you have no reports on record. Once someone is assigned to you they appear here. Your own Reviews screen is under "My record" in the sidebar.'
          }
        />
      </>
    );
  }

  const rateable = rows.filter(
    (row) => coverageBand(row.monthsLogged, row.eligibleMonths) !== 'insufficient',
  ).length;

  const columns: RosterColumn[] = [
    {
      header: 'Annual figure',
      numeric: true,
      cell: (row) =>
        row.yearAverage === null ? (
          <span style={{ color: 'var(--grey-line)' }}>—</span>
        ) : (
          <span style={{ fontWeight: 700, color: bandColour(row.yearAverage) }}>
            {row.yearAverage.toFixed(1)}
          </span>
        ),
    },
    {
      header: 'Band',
      cell: (row) => {
        if (row.yearAverage === null) {
          return <span style={{ color: 'var(--grey-body)' }}>Nothing logged yet</span>;
        }
        const band = bandFor(row.yearAverage);
        return (
          <div className="stack" style={{ gap: 2 }}>
            <span style={{ fontWeight: 700, color: 'var(--navy)' }}>
              {band.value} · {band.label}
            </span>
            <span className="num" style={{ fontSize: 12.5, color: 'var(--grey-body)' }}>
              {band.range}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Months in',
      numeric: true,
      cell: (row) => (
        <span className="num" style={{ color: 'var(--navy)' }}>
          {row.monthsLogged} of {row.eligibleMonths}
        </span>
      ),
    },
    {
      header: 'Coverage',
      cell: (row) => {
        const band = coverageBand(row.monthsLogged, row.eligibleMonths);
        const tone = COVERAGE_BANDS.find((b) => b.band === band)?.tone ?? 'navy';
        return (
          <Chip tone={tone} tight>
            {band}
          </Chip>
        );
      },
    },
  ];

  return (
    <>
      <ScreenHeader
        title="Reviews"
        meta={`${isHr ? 'Full roster' : 'My team'} · ${rows.length} ${
          rows.length === 1 ? 'record' : 'records'
        } · annual figure ${FY_LABEL}`}
      />
      <Screen>
        <RosterIndex
          rows={rows}
          columns={columns}
          showOrg={isHr}
          hrefFor={(row) => `/reviews/${row.id}`}
          caption={`${isHr ? 'Full roster' : 'My team'} · ${FISCAL_YEAR}`}
          aside={`${rateable} of ${rows.length} have enough of the year on record to rate`}
        />
      </Screen>
    </>
  );
}
