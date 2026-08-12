import Link from 'next/link';
import { forbidden, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FY_LABEL } from '@/lib/constants';
import { prisma } from '@/lib/db';

export const metadata = { title: 'No open cycle · M3M Perform' };
export const dynamic = 'force-dynamic';

const FISCAL_YEAR = '2025-26';

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

  const cycles = await prisma.cycle.findMany({
    where: { fiscalYear: FISCAL_YEAR },
    orderBy: { monthIndex: 'asc' },
  });
  const nextCycle = cycles.find((c) => c.state === 'FUTURE');

  const reason =
    cycles.length === 0
      ? `No cycles have been created yet for ${FY_LABEL}.`
      : nextCycle
        ? `${nextCycle.label} hasn't been opened yet.`
        : `Every cycle for ${FY_LABEL} is locked — the fiscal year is complete.`;

  const guidance =
    session.user.role === 'HR'
      ? "You'll need to open the next cycle from Admin before performance logging can resume."
      : 'Ask HR to open the next cycle.';

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
