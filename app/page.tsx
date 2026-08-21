import Link from 'next/link';
import { forbidden, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmployeeHome } from '@/components/home/EmployeeHome';
import { HrHome } from '@/components/home/HrHome';
import { LeadHome } from '@/components/home/LeadHome';
import { EMPLOYEE_RECORD_VISIBILITY, FISCAL_YEAR } from '@/lib/constants';
import { getEmployeeHomeData } from '@/lib/employee-home';
import { getOrgCompleteness, getPendingExceptions } from '@/lib/org';
import { getLeadHomeData } from '@/lib/team';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  switch (session.user.role) {
    case 'HR': {
      const [completeness, exceptions] = await Promise.all([
        getOrgCompleteness(FISCAL_YEAR),
        getPendingExceptions(),
      ]);
      return <HrHome completeness={completeness} exceptions={exceptions} />;
    }
    case 'MANAGER': {
      const data = await getLeadHomeData(session.user.employeeId, FISCAL_YEAR);
      if (!data) forbidden();
      return <LeadHome data={data} />;
    }
    case 'EMPLOYEE': {
      // Home never redirects. It used to bounce to /profile under the
      // 'hidden' policy, which broke the one navigation an employee
      // actually makes: clicking "Home" from Profile is a client-side
      // navigation, and when the destination only answers with a redirect
      // back to the route they are already on, the App Router swaps the URL
      // to "/" and has nothing to render — a blank screen. Every branch
      // below returns markup instead, so Home always shows something.
      if (EMPLOYEE_RECORD_VISIBILITY === 'hidden') {
        return (
          <>
            <ScreenHeader title="Home" meta={session.user.name ?? undefined} />
            <EmptyState
              label="Not available yet"
              heading="Your record isn't open to you yet"
              body={
                <>
                  Your reporting manager logs your months as the year runs, but your own view of
                  the record hasn&rsquo;t been switched on for this pilot yet. Your{' '}
                  <Link href="/profile" style={{ fontWeight: 700 }}>
                    Profile
                  </Link>{' '}
                  shows the KPI set you are being measured against in the meantime.
                </>
              }
            />
          </>
        );
      }
      const data = await getEmployeeHomeData(session.user.employeeId, FISCAL_YEAR, {
        maskOpenCycleData: EMPLOYEE_RECORD_VISIBILITY === 'after-lock',
      });
      if (!data) forbidden();
      return <EmployeeHome data={data} />;
    }
    default:
      // A role this build doesn't recognize (e.g. a session issued before a
      // role rename, whose value the DB migration hasn't caught up to yet)
      // must not silently render nothing — refuse it visibly instead.
      forbidden();
  }
}
