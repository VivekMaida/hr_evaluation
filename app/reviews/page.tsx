import { forbidden, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ReviewScreen } from '@/components/reviews/ReviewScreen';
import { canAccessEmployee } from '@/lib/access';
import { getReviewData } from '@/lib/reviews';

export const metadata = { title: 'Reviews · M3M Perform' };
export const dynamic = 'force-dynamic';

/** No id in the URL means "mine". */
export default async function ReviewsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role === 'EMPLOYEE') forbidden();

  const employeeId = session.user.employeeId;
  if (!(await canAccessEmployee(session.user, employeeId, false))) forbidden();

  const data = await getReviewData(employeeId);
  if (!data) redirect('/login');

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

  return <ReviewScreen subject={data.subject} />;
}
