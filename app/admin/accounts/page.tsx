import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card, Chip, SectionLabel } from '@/components/ui';
import { prisma } from '@/lib/db';
import { PILOT_DEFAULT_PASSWORD } from '@/lib/pilot-auth';
import { ResetForm } from './ResetForm';

export const metadata = { title: 'Accounts · M3M Perform' };
export const dynamic = 'force-dynamic';

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'HR') {
    return (
      <>
        <ScreenHeader title="Accounts" meta="Admin · HR only" />
        <div style={{ padding: '26px 36px' }}>
          <div className="callout callout--alert" style={{ padding: '16px 20px' }}>
            <div className="callout__title">HR only</div>
            <div style={{ fontSize: 14 }}>
              Account management is restricted to HR. You are signed in as{' '}
              {session.user.role}.
            </div>
          </div>
        </div>
      </>
    );
  }

  const users = await prisma.user.findMany({
    include: { employee: { select: { name: true, title: true } } },
    orderBy: [{ role: 'asc' }, { email: 'asc' }],
  });

  const awaiting = users.filter((u) => u.mustSetPassword).length;

  return (
    <>
      <ScreenHeader
        title="Accounts"
        meta={`${users.length} pilot accounts · ${awaiting} on the default password`}
      />

      <div style={{ padding: '26px 36px 34px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="callout callout--info" style={{ padding: '16px 20px' }}>
          <div className="callout__title">How reset works</div>
          <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--grey-body)' }}>
            Every pilot account starts on the shared default password (
            <code className="num">{PILOT_DEFAULT_PASSWORD}</code>) and must be changed on
            first sign-in. Resetting puts an account back on that default and forces the
            same choose-a-password step on their next sign-in. Tell them directly; the
            pilot sends no email. Every reset is recorded in the activity log against your
            name.
          </div>
        </div>

        <Card style={{ padding: '20px 24px 22px' }}>
          <div className="spread" style={{ alignItems: 'baseline', marginBottom: 16 }}>
            <SectionLabel>Pilot accounts</SectionLabel>
            <span className="num" style={{ fontSize: 13, color: 'var(--grey-body)' }}>
              {users.length - awaiting} of {users.length} personalized
            </span>
          </div>

          <table className="data-table" style={{ fontSize: 14.5 }}>
            <thead>
              <tr>
                <th style={{ padding: '9px 12px' }}>Person</th>
                <th style={{ padding: '9px 12px' }}>Email</th>
                <th style={{ padding: '9px 12px', width: 100 }}>Role</th>
                <th style={{ padding: '9px 12px', width: 190 }}>Status</th>
                <th style={{ padding: '9px 12px', width: 160 }}>Last signed in</th>
                <th style={{ padding: '9px 12px', textAlign: 'right', width: 170 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const claimed = !user.mustSetPassword;
                return (
                  <tr key={user.id}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--navy)' }}>
                        {user.employee.name}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--grey-body)' }}>
                        {user.employee.title} · {user.employeeId}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>{user.email}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <Chip tone={user.role === 'HR' ? 'cyan' : user.role === 'MANAGER' ? 'navy' : 'grey'} tight>
                        {user.role}
                      </Chip>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Chip tone={claimed ? 'green' : 'amber'} tight>
                        {claimed ? 'Password set' : 'Default password'}
                      </Chip>
                    </td>
                    <td className="num" style={{ padding: '10px 12px', color: 'var(--grey-body)' }}>
                      {user.lastLoginAt
                        ? user.lastLoginAt.toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <div className="row" style={{ gap: 10, justifyContent: 'flex-end' }}>
                        <Link
                          href={`/profile/${user.employeeId}`}
                          style={{ fontSize: 13.5, fontWeight: 700 }}
                        >
                          View profile
                        </Link>
                        <ResetForm employeeId={user.employeeId} claimed={claimed} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
