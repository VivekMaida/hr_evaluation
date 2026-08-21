import { forbidden, notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ReviewScreen } from '@/components/reviews/ReviewScreen';
import { canAccessEmployee } from '@/lib/access';
import { EMPLOYEE_RECORD_VISIBILITY, FY_LABEL } from '@/lib/constants';
import { getReviewData } from '@/lib/reviews';

export const metadata = { title: 'Reviews · M3M Perform' };
export const dynamic = 'force-dynamic';

export default async function ReviewForEmployeePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;

  const session = await auth();
  if (!session?.user) redirect('/login');

  const own = employeeId === session.user.employeeId;
  const isEmployeeOwnRecord = own && session.user.role === 'EMPLOYEE';
  // As on /reviews: the pilot-wide visibility flag is the only gate on an
  // employee's own figure. A manager or HR viewing someone else is never
  // affected — canAccessEmployee already keeps an EMPLOYEE actor to their own id.
  if (isEmployeeOwnRecord && EMPLOYEE_RECORD_VISIBILITY === 'hidden') redirect('/profile');
  if (!(await canAccessEmployee(session.user, employeeId, false))) forbidden();

  const data = await getReviewData(employeeId);
  if (!data) notFound();

  if (!data.subject) {
    return (
      <>
        <ScreenHeader title="Reviews" meta={`Annual figure ${FY_LABEL}`} />
        <EmptyState
          label="Nothing on record yet"
          heading={`${data.employee.name} has no logged months this year`}
          body="The annual figure is the average of the months on record, so it appears as soon as the first month is submitted and grows from there."
        />
      </>
    );
  }

  return <ReviewScreen subject={data.subject} own={isEmployeeOwnRecord} />;
}
