import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EntryForm } from '@/components/log/EntryForm';
import { EntryRouteSwitch } from '@/components/log/EntryRouteSwitch';
import { TeamRail } from '@/components/log/TeamRail';
import { prisma } from '@/lib/db';

export const metadata = { title: 'Performance Log · M3M Perform' };
export const dynamic = 'force-dynamic';

const FISCAL_YEAR = '2025-26';

export default async function PerformanceLogPage({
  searchParams,
}: {
  searchParams: Promise<{ employee?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { employee } = await searchParams;

  const openCycle = await prisma.cycle.findFirst({
    where: { fiscalYear: FISCAL_YEAR, state: 'OPEN' },
  });
  if (!openCycle) {
    redirect('/performance-log/no-targets');
  }

  // A lead lands on the first person in their team who is not yet submitted;
  // anyone else lands on themselves.
  const employeeId =
    employee ??
    (session.user.role === 'EMPLOYEE'
      ? session.user.employeeId
      : ((
          await prisma.employee.findFirst({
            where:
              session.user.role === 'LEAD'
                ? { leadId: session.user.employeeId }
                : { leadId: { not: null } },
            orderBy: { id: 'asc' },
            select: { id: true },
          })
        )?.id ?? session.user.employeeId));

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
        <TeamRail activeId={employeeId} />
        <EntryForm employeeId={employeeId} monthIndex={openCycle.monthIndex} />
      </div>
    </>
  );
}
