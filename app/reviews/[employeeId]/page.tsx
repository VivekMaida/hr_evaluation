import { forbidden, notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { ReviewScreen } from '@/components/reviews/ReviewScreen';
import { canAccessEmployee } from '@/lib/access';
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
  if (session.user.role === 'EMPLOYEE') forbidden();
  if (!(await canAccessEmployee(session.user, employeeId, false))) forbidden();

  const data = await getReviewData(employeeId);
  if (!data) notFound();

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
