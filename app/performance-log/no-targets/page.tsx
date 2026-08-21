import Link from 'next/link';
import { forbidden, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FISCAL_YEAR, FY_LABEL, now } from '@/lib/constants';
import { deriveCycles } from '@/lib/cycles';
import { prisma } from '@/lib/db';

export const metadata = { title: 'No open cycle · M3M Perform' };
export const dynamic = 'force-dynamic';

/**
 * Reached when /performance-log finds no cycle marked OPEN for the fiscal
 * year — a real gap that opens up between cycles (the previous one locked,
 * the next one not yet opened), not a placeholder for an unbuilt screen.
 * Cycles are org-wide, not per-department, so this can't be about one
 * manager's KRA set specifically.
 */
export default async function NoTargetsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role === 'EMPLOYEE') forbidden();

  const cycles = deriveCycles(
    await prisma.cycle.findMany({
      where: { fiscalYear: FISCAL_YEAR },
      orderBy: { monthIndex: 'asc' },
    }),
    now(),
  );
  const nextCycle = cycles.find((c) => c.state === 'FUTURE');

  const reason =
    cycles.length === 0
      ? `No cycles have been created yet for ${FY_LABEL}.`
      : nextCycle
        ? `${nextCycle.label} hasn't opened yet.`
        : `Every cycle for ${FY_LABEL} is locked — the fiscal year is complete.`;

  // Cycles open and lock on their own schedule now (see lib/cycles.ts), so
  // there is nobody to ask and nothing to press — only a date to wait for.
  const guidance =
    nextCycle?.opensOn
      ? `It opens on its own on ${nextCycle.opensOn.toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}. No one needs to open it.`
      : 'Nothing further is scheduled for this fiscal year.';

  return (
    <>
      <ScreenHeader title="Performance Log" meta={FY_LABEL} />
      <EmptyState
        label="No cycle is open"
        heading="There is nothing to log right now"
        body={
          <>
            {reason} {guidance}
          </>
        }
        actions={
          <Link
            href="/"
            className="btn btn--primary btn--large"
            style={{ textDecoration: 'none' }}
          >
            Back to Home
          </Link>
        }
      />
    </>
  );
}
