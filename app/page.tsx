import { forbidden, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { EmployeeHome } from '@/components/home/EmployeeHome';
import { HrHome } from '@/components/home/HrHome';
import { LeadHome } from '@/components/home/LeadHome';
import { getOrgCompleteness, getPendingExceptions } from '@/lib/org';
import { getLeadHomeData } from '@/lib/team';

export const dynamic = 'force-dynamic';

const FISCAL_YEAR = '2025-26';

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
    case 'EMPLOYEE':
      return <EmployeeHome />;
    default:
      // A role this build doesn't recognize (e.g. a session issued before a
      // role rename, whose value the DB migration hasn't caught up to yet)
      // must not silently render nothing — refuse it visibly instead.
      forbidden();
  }
}
