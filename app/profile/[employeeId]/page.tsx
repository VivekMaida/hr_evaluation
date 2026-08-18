import { forbidden, notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ProfileScreen } from '@/components/profile/ProfileScreen';
import { canAccessEmployee } from '@/lib/access';
import { prisma } from '@/lib/db';
import { getProfileData } from '@/lib/profile';

export const metadata = { title: 'Profile · M3M Perform' };
export const dynamic = 'force-dynamic';

/**
 * Someone else's profile. Identity edits (EditIdentityForm) stay HR-only —
 * self-edit refused, since letting HR use this door on their own record is
 * the same audit-trail hole as letting anyone edit their own reporting
 * manager. KPI edits open up further: HR for anyone, or the employee's own
 * manager for their direct report — canAccessEmployee already encodes both
 * rules, including refusing a manager's own record (not a "direct report").
 */
export default async function ProfileForEmployeePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;

  const session = await auth();
  if (!session?.user) redirect('/login');
  if (employeeId === session.user.employeeId) redirect('/profile');

  const canEditKpis = await canAccessEmployee(session.user, employeeId, true);
  const canEditIdentity = session.user.role === 'HR';
  if (!canEditIdentity && !canEditKpis) forbidden();

  const data = await getProfileData(employeeId);
  if (!data) notFound();

  const [departments, managers] = canEditIdentity
    ? await Promise.all([
        prisma.department.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
        prisma.employee.findMany({
          where: { id: { not: employeeId }, user: { role: 'MANAGER' } },
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        }),
      ])
    : [undefined, undefined];

  return (
    <ProfileScreen
      data={data}
      own={false}
      editable={canEditIdentity}
      canEditKpis={canEditKpis}
      departments={departments}
      managers={managers}
    />
  );
}
