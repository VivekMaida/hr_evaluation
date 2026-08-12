import { forbidden, notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ProfileScreen } from '@/components/profile/ProfileScreen';
import { canAccessEmployee } from '@/lib/access';
import { prisma } from '@/lib/db';
import { getProfileData } from '@/lib/profile';

export const metadata = { title: 'Profile · M3M Perform' };
export const dynamic = 'force-dynamic';

/**
 * HR viewing (and editing the master data of) someone else's profile.
 * Self-edit is refused — redirected to the read-only /profile instead —
 * because letting HR use this door on their own record is the same
 * audit-trail hole as letting anyone edit their own reporting manager.
 */
export default async function ProfileForEmployeePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;

  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'HR') forbidden();
  if (employeeId === session.user.employeeId) redirect('/profile');

  if (!(await canAccessEmployee(session.user, employeeId, true))) forbidden();

  const data = await getProfileData(employeeId);
  if (!data) notFound();

  const [departments, managers] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.employee.findMany({
      where: { id: { not: employeeId }, user: { role: 'MANAGER' } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  return <ProfileScreen data={data} own={false} editable departments={departments} managers={managers} />;
}
