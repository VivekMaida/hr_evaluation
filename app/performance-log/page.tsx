import { forbidden, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EntryForm } from '@/components/log/EntryForm';
import { EntryRouteSwitch } from '@/components/log/EntryRouteSwitch';
import { TeamRail } from '@/components/log/TeamRail';
import { canAccessEmployee } from '@/lib/access';
import { FISCAL_YEAR } from '@/lib/constants';
import { prisma } from '@/lib/db';
import { getManagerTeam } from '@/lib/team';

export const metadata = { title: 'Performance Log · M3M Perform' };
export const dynamic = 'force-dynamic';

export default async function PerformanceLogPage({
  searchParams,
}: {
  searchParams: Promise<{ employee?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  // An employee's month is logged by their manager, not by themselves here.
  if (session.user.role === 'EMPLOYEE') forbidden();

  const { employee } = await searchParams;

  const openCycle = await prisma.cycle.findFirst({
    where: { fiscalYear: FISCAL_YEAR, state: 'OPEN' },
  });
  if (!openCycle) {
    redirect('/performance-log/no-targets');
  }

  // HR has no direct reports in the leadId sense, so the rail — and the
  // auto-advance round it drives — is scoped to managers, the same
  // "signed-in manager's own team" boundary as Home.
  const team =
    session.user.role === 'MANAGER'
      ? await getManagerTeam(session.user.employeeId, FISCAL_YEAR)
      : [];

  // A manager lands on the first person in their team who is not yet
  // submitted — reopening the page mid-run resumes where they stopped
  // rather than dumping them back on person one. Nobody outstanding means
  // the round is already done. HR lands on the first record in the roster;
  // there's no "round" for HR to resume.
  const nextOutstanding = team.find((m) => m.status !== 'submitted');
  if (session.user.role === 'MANAGER' && !employee && team.length > 0 && !nextOutstanding) {
    redirect('/performance-log/done');
  }

  const employeeId =
    employee ??
    (session.user.role === 'MANAGER'
      ? nextOutstanding?.id
      : (
          await prisma.employee.findFirst({
            where: { leadId: { not: null } },
            orderBy: { id: 'asc' },
            select: { id: true },
          })
        )?.id) ??
    session.user.employeeId;

  // ?employee= is a direct URL override — confirm it's actually this actor's
  // to see before rendering anything for it.
  if (!(await canAccessEmployee(session.user, employeeId, false))) forbidden();

  return (
    <>
      <ScreenHeader
        title="Performance Log"
        meta={`${openCycle.label} · locks ${
          openCycle.locksOn
            ? openCycle.locksOn.toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })
            : 'when HR closes the cycle'
        }`}
        aside={<EntryRouteSwitch />}
      />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <TeamRail activeId={employeeId} team={team} />
        <EntryForm employeeId={employeeId} monthIndex={openCycle.monthIndex} team={team} />
      </div>
    </>
  );
}
