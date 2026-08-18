import { forbidden, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ProfileScreen } from '@/components/profile/ProfileScreen';
import { canAccessEmployee } from '@/lib/access';
import { getProfileData } from '@/lib/profile';

export const metadata = { title: 'Profile · M3M Perform' };
export const dynamic = 'force-dynamic';

/** Your own profile — every role, read-only except password. */
export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  if (!(await canAccessEmployee(session.user, session.user.employeeId, false))) forbidden();

  const data = await getProfileData(session.user.employeeId);
  if (!data) forbidden();

  return <ProfileScreen data={data} own editable={false} canEditKpis={false} />;
}
