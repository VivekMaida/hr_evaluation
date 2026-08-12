import { forbidden, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { EmployeeHome } from '@/components/home/EmployeeHome';
import { HrHome } from '@/components/home/HrHome';
import { LeadHome } from '@/components/home/LeadHome';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  switch (session.user.role) {
    case 'HR':
      return <HrHome />;
    case 'MANAGER':
      return <LeadHome />;
    case 'EMPLOYEE':
      return <EmployeeHome />;
    default:
      // A role this build doesn't recognize (e.g. a session issued before a
      // role rename, whose value the DB migration hasn't caught up to yet)
      // must not silently render nothing — refuse it visibly instead.
      forbidden();
  }
}
