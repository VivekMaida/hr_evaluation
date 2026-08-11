import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { HrHome } from '@/components/home/HrHome';
import { LeadHome } from '@/components/home/LeadHome';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return session.user.role === 'HR' ? <HrHome /> : <LeadHome />;
}
