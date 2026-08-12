import { forbidden, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Scorecard } from '@/components/scorecard/Scorecard';
import { canAccessEmployee } from '@/lib/access';
import { getScorecardData } from '@/lib/scorecard';

export const metadata = { title: 'Scorecard · M3M Perform' };
export const dynamic = 'force-dynamic';

/** No id in the URL means "mine". */
export default async function ScorecardIndexPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const employeeId = session.user.employeeId;
  if (!(await canAccessEmployee(session.user, employeeId, false))) forbidden();

  const data = await getScorecardData(employeeId);
  if (!data) redirect('/login');

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
