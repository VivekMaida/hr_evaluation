import { forbidden, notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Scorecard } from '@/components/scorecard/Scorecard';
import { canAccessEmployee } from '@/lib/access';
import { EMPLOYEE_RECORD_VISIBILITY, FISCAL_YEAR, FY_LABEL, FY_RANGE_LABEL } from '@/lib/constants';
import { getRecordMonthRows } from '@/lib/record-months';
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

  const own = employeeId === session.user.employeeId;
  // Only this person's actual manager gets to respond to a query here — HR
  // can see everything on this page but the reply routes to the manager.
  const isManager = session.user.role === 'MANAGER' && !own;

  // The visibility flag only ever gates an EMPLOYEE looking at their own
  // record; it never affects what a manager or HR sees of someone else.
  const isEmployeeOwnRecord = own && session.user.role === 'EMPLOYEE';
  if (isEmployeeOwnRecord && EMPLOYEE_RECORD_VISIBILITY === 'hidden') redirect('/profile');
  const maskOpenCycleData = isEmployeeOwnRecord && EMPLOYEE_RECORD_VISIBILITY === 'after-lock';

  const [data, recordMonths] = await Promise.all([
    getScorecardData(employeeId, { maskOpenCycleData }),
    getRecordMonthRows(employeeId, FISCAL_YEAR),
  ]);
  if (!data) notFound();

  if (!data.subject) {
    return (
      <>
        <ScreenHeader title="Scorecard" meta={`${FY_LABEL} · ${FY_RANGE_LABEL}`} />
        <EmptyState
          label="Nothing logged yet"
          heading={`${data.employee.name} has no submitted months this year`}
          body="Once a month is submitted, it will show here — the weighted score, the KRA matrix and the record status."
        />
      </>
    );
  }

  return (
    <Scorecard
      subject={data.subject}
      recordMonths={recordMonths}
      own={own}
      isManager={isManager}
    />
  );
}
