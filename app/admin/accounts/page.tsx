import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card, Chip, SectionLabel } from '@/components/ui';
import { prisma } from '@/lib/db';
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

  const awaiting = users.filter((u) => u.passwordHash === null).length;

  return (
    <>
      <ScreenHeader
        title="Accounts"
        meta={`${users.length} pilot accounts · ${awaiting} awaiting first sign-in`}
      />

      <div style={{ padding: '26px 36px 34px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="callout callout--info" style={{ padding: '16px 20px' }}>
          <div className="callout__title">How reset works</div>
          <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--grey-body)' }}>
            Resetting clears the password and puts the account back into first-sign-in
            state — the person then chooses a new one the next time they sign in. Tell them
            directly; the pilot sends no email. Every reset is recorded in the activity log
            against your name.
          </div>
        </div>

        <Card style={{ padding: '20px 24px 22px' }}>
          <div className="spread" style={{ alignItems: 'baseline', marginBottom: 16 }}>
            <SectionLabel>Pilot accounts</SectionLabel>
            <span className="num" style={{ fontSize: 13, color: 'var(--grey-body)' }}>
              {users.length - awaiting} of {users.length} claimed
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
                const claimed = user.passwordHash !== null;
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
                      <Chip tone={user.role === 'HR' ? 'cyan' : user.role === 'LEAD' ? 'navy' : 'grey'} tight>
                        {user.role}
                      </Chip>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Chip tone={claimed ? 'green' : 'amber'} tight>
                        {claimed ? 'Password set' : 'Awaiting first sign-in'}
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
                      <ResetForm employeeId={user.employeeId} claimed={claimed} />
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
