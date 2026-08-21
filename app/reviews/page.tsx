import { forbidden, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ReviewScreen } from '@/components/reviews/ReviewScreen';
import { canAccessEmployee } from '@/lib/access';
import { EMPLOYEE_RECORD_VISIBILITY, FY_LABEL } from '@/lib/constants';
import { getReviewData } from '@/lib/reviews';

export const metadata = { title: 'Reviews · M3M Perform' };
export const dynamic = 'force-dynamic';

/** No id in the URL means "mine". */
export default async function ReviewsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const employeeId = session.user.employeeId;
  const isEmployee = session.user.role === 'EMPLOYEE';
  // The only gate on an employee seeing their own figure is the pilot-wide
  // visibility flag. There is no "finalized" state to wait for any more — the
  // figure is the aggregate of the months already on record.
  if (isEmployee && EMPLOYEE_RECORD_VISIBILITY === 'hidden') redirect('/profile');
  if (!(await canAccessEmployee(session.user, employeeId, false))) forbidden();

  const data = await getReviewData(employeeId);
  if (!data) redirect('/login');

  if (!data.subject) {
    return (
      <>
        <ScreenHeader title="Reviews" meta={`Annual figure ${FY_LABEL}`} />
        <EmptyState
          label="Nothing on record yet"
          heading="No month has been logged yet this year"
          body="The annual figure is the average of the months on record, so it appears as soon as the first month is submitted and grows from there. Nothing is waiting on a year-end step."
        />
      </>
    );
  }

  return <ReviewScreen subject={data.subject} own={isEmployee} />;
}
