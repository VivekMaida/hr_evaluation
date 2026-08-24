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

/**
 * One person's Scorecard — including your own, which is what the sidebar's
 * "My record" entry points at. There is no separate own-record route: the
 * bare /scorecard is the team index now, and `own` below is the only thing
 * that changes when the id happens to be yours.
 */
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
  // record; it never affects what a manager or HR sees of someone else, nor
  // what either sees of their own record.
  const isEmployeeOwnRecord = own && session.user.role === 'EMPLOYEE';
  if (isEmployeeOwnRecord && EMPLOYEE_RECORD_VISIBILITY === 'hidden') redirect('/profile');
  const maskOpenCycleData = isEmployeeOwnRecord && EMPLOYEE_RECORD_VISIBILITY === 'after-lock';

  const [data, recordMonths] = await Promise.all([
    getScorecardData(employeeId, { maskOpenCycleData }),
    getRecordMonthRows(employeeId, FISCAL_YEAR),
  ]);
  if (!data) notFound();

  if (!data.subject) {
    // Second person on your own record, third on someone else's — the same
    // fact reads as an accusation if it addresses the wrong reader.
    return (
      <>
        <ScreenHeader title="Scorecard" meta={`${FY_LABEL} · ${FY_RANGE_LABEL}`} />
        {data.hasKpiSet ? (
          <EmptyState
            label="Nothing logged yet"
            heading={
              own
                ? 'You have no submitted months this year'
                : `${data.employee.name} has no submitted months this year`
            }
            body="Once a month is submitted, it will show here — the weighted score, the KRA matrix and the record status."
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
                ? 'Your own record starts once HR publishes the KRA set you are measured against. Until then there is nothing to score, and nothing here is missing on your side. This page fills in on its own the moment a set exists.'
                : 'There is no KRA set for this person this fiscal year, so there is nothing to log against and nothing to score. Publish a set on their Profile and this page fills in on its own.'
            }
          />
        )}
      </>
    );
  }

  return (
    <Scorecard
      subject={data.subject}
      recordMonths={recordMonths}
      own={own}
      isManager={isManager}
      canRequestCorrection={isManager}
    />
  );
}
