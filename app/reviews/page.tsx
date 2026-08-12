import { forbidden, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ReviewScreen } from '@/components/reviews/ReviewScreen';
import { canAccessEmployee } from '@/lib/access';
import { EMPLOYEE_RECORD_VISIBILITY } from '@/lib/constants';
import { getReviewData, isFinalized } from '@/lib/reviews';

export const metadata = { title: 'Reviews · M3M Perform' };
export const dynamic = 'force-dynamic';

/** No id in the URL means "mine". */
export default async function ReviewsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const employeeId = session.user.employeeId;
  const isEmployee = session.user.role === 'EMPLOYEE';
  if (isEmployee && EMPLOYEE_RECORD_VISIBILITY === 'hidden') redirect('/profile');
  if (!(await canAccessEmployee(session.user, employeeId, false))) forbidden();

  const data = await getReviewData(employeeId);
  if (!data) redirect('/login');

  // An employee sees a finalized rating, never a draft in progress.
  if (isEmployee && !isFinalized(data.review.state)) {
    return (
      <>
        <ScreenHeader title="Reviews" meta="Annual appraisal FY 2025–26" />
        <EmptyState
          label="Not finalized yet"
          heading="Your rating for this year has not been finalized"
          body="Once your manager submits it, it will show here — the band, the justification behind it, and when it was submitted."
        />
      </>
    );
  }

  if (!data.subject) {
    return (
      <>
        <ScreenHeader title="Reviews" meta="Annual appraisal FY 2025–26" />
        <EmptyState
          label="Nothing to review yet"
          heading={`${data.employee.name} has no submitted months this year`}
          body="A rating needs at least one submitted month on record before there is anything to review."
        />
      </>
    );
  }

  return <ReviewScreen subject={data.subject} review={data.review} own={isEmployee} />;
}
