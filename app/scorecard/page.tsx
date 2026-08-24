import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { EmptyState } from '@/components/EmptyState';
import { RosterIndex, type RosterColumn } from '@/components/RosterIndex';
import { ScreenHeader } from '@/components/ScreenHeader';
import { YearStrip } from '@/components/YearStrip';
import { Chip, Screen } from '@/components/ui';
import { FISCAL_YEAR, FY_LABEL, FY_RANGE_LABEL } from '@/lib/constants';
import { getVisibleRoster } from '@/lib/roster';
import { bandColour } from '@/lib/score';
import { COVERAGE_BANDS, coverageBand } from '@/lib/scorecard';

export const metadata = { title: 'Scorecard · M3M Perform' };
export const dynamic = 'force-dynamic';

/**
 * The team-scoped Scorecard index: everyone the signed-in person can open a
 * record for, with enough of each record on the row to know which one to
 * open. This route used to be "my own Scorecard" and the sidebar's team entry
 * deep-linked to whichever report sorted first by id — a name nobody chose,
 * that changed when the roster changed, and that gave no way to reach anyone
 * else. Own records live at /scorecard/[employeeId] now, which is where the
 * "My record" links point.
 */
export default async function ScorecardIndexPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  // An employee has no team, and this used to be the address of their own
  // record — send them there rather than 403 on a link they may have saved.
  if (session.user.role === 'EMPLOYEE') redirect(`/scorecard/${session.user.employeeId}`);

  const { rows, openCycleLabel } = await getVisibleRoster(session.user, FISCAL_YEAR);
  const isHr = session.user.role === 'HR';

  if (rows.length === 0) {
    return (
      <>
        <ScreenHeader title="Scorecard" meta={`${FY_LABEL} · ${FY_RANGE_LABEL}`} />
        <EmptyState
          label="No records to open"
          heading={isHr ? 'There is nobody on the roster yet' : 'Nobody reports to you yet'}
          body={
            isHr
              ? 'This list is every employee on the roster. It fills in as accounts are created — until then there is no record to open from here. Your own Scorecard is under "My record" in the sidebar.'
              : 'Scorecards are opened from your team, and you have no reports on record. Once someone is assigned to you they appear here. Your own Scorecard is under "My record" in the sidebar.'
          }
        />
      </>
    );
  }

  const logged = rows.filter((row) => row.openScore !== null).length;

  const columns: RosterColumn[] = [
    {
      header: openCycleLabel ?? 'This month',
      numeric: true,
      cell: (row) =>
        row.openScore === null ? (
          <span style={{ color: 'var(--grey-line)' }}>—</span>
        ) : (
          <span style={{ fontWeight: 700, color: bandColour(row.openScore) }}>
            {row.openScore.toFixed(1)}
          </span>
        ),
    },
    {
      header: 'Year to date',
      numeric: true,
      cell: (row) =>
        row.yearAverage === null ? (
          <span style={{ color: 'var(--grey-line)' }}>—</span>
        ) : (
          <span style={{ fontWeight: 700, color: 'var(--navy)' }}>
            {row.yearAverage.toFixed(1)}
          </span>
        ),
    },
    {
      header: 'Apr → Mar',
      width: 140,
      cell: (row) => (
        <YearStrip size="small" points={row.points} label={`${row.name}, twelve months`} />
      ),
    },
    {
      header: 'Months on record',
      cell: (row) => {
        const band = coverageBand(row.monthsLogged, row.eligibleMonths);
        const tone = COVERAGE_BANDS.find((b) => b.band === band)?.tone ?? 'navy';
        return (
          <div className="stack" style={{ gap: 3 }}>
            <span className="num" style={{ color: 'var(--navy)' }}>
              {row.monthsLogged} of {row.eligibleMonths}
            </span>
            <span>
              <Chip tone={tone} tight>
                {band}
              </Chip>
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <ScreenHeader
        title="Scorecard"
        meta={`${isHr ? 'Full roster' : 'My team'} · ${rows.length} ${
          rows.length === 1 ? 'record' : 'records'
        } · ${FY_LABEL} · ${FY_RANGE_LABEL}`}
      />
      <Screen>
        <RosterIndex
          rows={rows}
          columns={columns}
          showOrg={isHr}
          hrefFor={(row) => `/scorecard/${row.id}`}
          caption={`${isHr ? 'Full roster' : 'My team'} · ${FISCAL_YEAR}`}
          aside={
            openCycleLabel
              ? `${logged} of ${rows.length} submitted for ${openCycleLabel}`
              : 'No month is open for entry'
          }
        />
      </Screen>
    </>
  );
}
