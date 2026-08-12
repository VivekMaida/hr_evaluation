import { forbidden, notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Scorecard } from '@/components/scorecard/Scorecard';
import { canAccessEmployee } from '@/lib/access';
import { getScorecardData } from '@/lib/scorecard';

export const metadata = { title: 'Scorecard · M3M Perform' };
export const dynamic = 'force-dynamic';

export default async function ScorecardPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;

  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!(await canAccessEmployee(session.user, employeeId, false))) forbidden();

  const data = await getScorecardData(employeeId);
  if (!data) notFound();

  if (!data.subject) {
    return (
      <>
        <ScreenHeader title="Scorecard" meta="FY 2025–26 · April 2025 to March 2026" />
        <EmptyState
          label="Nothing logged yet"
          heading={`${data.employee.name} has no submitted months this year`}
          body="Once a month is submitted, it will show here — the weighted score, the KRA matrix and the record status."
        />
      </>
    );
  }

  return <Scorecard subject={data.subject} />;
}
