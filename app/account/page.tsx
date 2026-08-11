import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card, Chip, SectionLabel } from '@/components/ui';
import { prisma } from '@/lib/db';
import { ChangePasswordForm } from './ChangePasswordForm';

export const metadata = { title: 'Your account · M3M Perform' };
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { employeeId: session.user.employeeId },
    include: { employee: { include: { department: true } } },
  });
  if (!user) redirect('/login');

  return (
    <>
      <ScreenHeader
        title="Your account"
        meta={`${user.employee.name} · ${user.employee.title} · ${user.employee.department.name}`}
      />

      <div style={{ padding: '26px 36px 34px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 18, alignItems: 'start' }}>
          <Card style={{ padding: '22px 26px 24px' }}>
            <div className="stack" style={{ gap: 18 }}>
              <SectionLabel>Change your password</SectionLabel>
              <ChangePasswordForm neverSet={user.passwordHash === null} />
            </div>
          </Card>

          <Card tone="navy" style={{ padding: '18px 20px 20px' }}>
            <div className="stack" style={{ gap: 12 }}>
              <SectionLabel tone="navy">Sign-in details</SectionLabel>
              <div className="spread" style={{ fontSize: 14 }}>
                <span>Email</span>
                <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{user.email}</span>
              </div>
              <div className="spread" style={{ fontSize: 14 }}>
                <span>Role</span>
                <Chip tone={user.role === 'HR' ? 'cyan' : 'navy'} tight>
                  {user.role}
                </Chip>
              </div>
              <div className="spread" style={{ fontSize: 14 }}>
                <span>Employee</span>
                <span className="num" style={{ color: 'var(--navy)' }}>{user.employeeId}</span>
              </div>
              <div className="spread" style={{ fontSize: 14 }}>
                <span>Last signed in</span>
                <span className="num" style={{ color: 'var(--navy)' }}>
                  {user.lastLoginAt
                    ? user.lastLoginAt.toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : '—'}
                </span>
              </div>
              <div style={{ height: 1, background: 'var(--grey-surface)' }} />
              <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--grey-body)' }}>
                Forgotten your password? HR can reset it — you then set a new one by
                signing in. There is no reset email during the pilot.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
