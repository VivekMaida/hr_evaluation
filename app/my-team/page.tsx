import { forbidden, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { NotDrawnYet } from '@/components/NotDrawnYet';

export const metadata = { title: 'My Team · M3M Perform' };
export const dynamic = 'force-dynamic';

/** Only a manager has a team to see — HR and individual employees have none. */
export default async function MyTeamPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'MANAGER') forbidden();

  return (
    <NotDrawnYet
      title="My Team"
      meta="Sales · Gurugram · 7 reporting"
      summary="The full roster with every month, every score and every outstanding entry. Home carries a cut-down version of this table for the open cycle; this screen is the whole year for the whole team."
    />
  );
}
