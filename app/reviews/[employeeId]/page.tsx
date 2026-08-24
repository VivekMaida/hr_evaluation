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

/**
 * One person's annual figure — including your own, which is where the
 * sidebar's "My record" entry points. The bare /reviews is the team index.
 */
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
  // The pilot-wide visibility flag is the only gate on an employee's own
  // figure. A manager or HR viewing someone else is never affected —
  // canAccessEmployee already keeps an EMPLOYEE actor to their own id.
  if (isEmployeeOwnRecord && EMPLOYEE_RECORD_VISIBILITY === 'hidden') redirect('/profile');
  if (!(await canAccessEmployee(session.user, employeeId, false))) forbidden();

  const data = await getReviewData(employeeId);
  if (!data) notFound();

  if (!data.subject) {
    // Addressed to whoever is reading — see the same branch on Scorecard.
    return (
      <>
        <ScreenHeader title="Reviews" meta={`Annual figure ${FY_LABEL}`} />
        {data.hasKpiSet ? (
          <EmptyState
            label="Nothing on record yet"
            heading={
              own
                ? 'No month has been logged yet this year'
                : `${data.employee.name} has no logged months this year`
            }
            body={
              own
                ? 'The annual figure is the average of the months on record, so it appears as soon as the first month is submitted and grows from there. Nothing is waiting on a year-end step.'
                : 'The annual figure is the average of the months on record, so it appears as soon as the first month is submitted and grows from there.'
            }
          />
        ) : (
          <EmptyState
            label="No KRA set yet"
            heading={
              own
                ? 'Your KPIs have not been set yet'
                : `${data.employee.name}'s KPIs have not been set yet`
            }
            body={
              own
                ? 'An annual figure is the average of your logged months, and months are logged against a KRA set. Until HR publishes yours there is nothing to average. This page fills in on its own once a set exists.'
                : 'There is no KRA set for this person this fiscal year, so no month can be logged and there is nothing to average. Publish a set on their Profile and this page fills in on its own.'
            }
          />
        )}
      </>
    );
  }

  return <ReviewScreen subject={data.subject} own={isEmployeeOwnRecord} />;
}
