import Link from 'next/link';
import { forbidden, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ScreenHeader } from '@/components/ScreenHeader';
import { YearStrip } from '@/components/YearStrip';
import { Card, Chip, Screen, SectionLabel } from '@/components/ui';
import { FISCAL_YEAR } from '@/lib/constants';
import { prisma } from '@/lib/db';
import { STATUS_CHIP, getManagerTeam } from '@/lib/team';

export const metadata = { title: 'My Team · M3M Perform' };
export const dynamic = 'force-dynamic';

/** Only a manager has a team to see — HR and individual employees have none. */
export default async function MyTeamPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'MANAGER') forbidden();

  const [manager, { team }] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: session.user.employeeId },
      select: { department: { select: { name: true } }, location: true },
    }),
    getManagerTeam(session.user.employeeId, FISCAL_YEAR),
  ]);

  const outOfBalance = team.filter((m) => m.kpiWeightTotal !== 100).length;

  return (
    <>
      <ScreenHeader
        title="My Team"
        meta={`${manager?.department.name ?? '—'} · ${manager?.location ?? '—'} · ${team.length} reporting`}
      />

      <Screen>
        <Card style={{ padding: '20px 24px 22px' }}>
          <div className="spread" style={{ alignItems: 'baseline', marginBottom: 16 }}>
            <SectionLabel>Full roster · {FISCAL_YEAR}</SectionLabel>
            <span
              className="num"
              style={{ fontSize: 13, color: outOfBalance > 0 ? 'var(--red)' : 'var(--grey-body)' }}
            >
              {outOfBalance > 0
                ? `${outOfBalance} of ${team.length} KPI sets don't total 100%`
                : `All ${team.length} KPI sets total 100%`}
            </span>
          </div>

          <table className="data-table" style={{ fontSize: 14.5 }}>
            <thead>
              <tr>
                <th style={{ padding: '9px 12px' }}>Employee</th>
                <th style={{ padding: '9px 12px' }}>This month</th>
                <th className="is-num" style={{ padding: '9px 12px' }}>Score</th>
                <th style={{ padding: '9px 12px' }}>Apr → Mar</th>
                <th style={{ padding: '9px 12px', width: 140 }}>KPI weights</th>
                <th style={{ padding: '9px 12px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {team.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '16px 12px', color: 'var(--grey-body)' }}>
                    No one reports to you yet.
                  </td>
                </tr>
              ) : (
                team.map((member) => {
                  const chip = STATUS_CHIP[member.status];
                  const balanced = member.kpiWeightTotal === 100;
                  return (
                    <tr key={member.id}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{member.name}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--grey-body)' }}>
                          {member.title} · {member.id}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Chip tone={chip.tone} tight>
                          {chip.label}
                        </Chip>
                      </td>
                      <td
                        className="is-num"
                        style={{
                          padding: '10px 12px',
                          color: member.score === null ? 'var(--grey-line)' : 'var(--navy)',
                          fontWeight: member.score === null ? 400 : 700,
                        }}
                      >
                        {member.score === null ? '—' : member.score.toFixed(1)}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <YearStrip size="small" points={member.points} label={`${member.name}, twelve months`} />
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Chip tone={balanced ? 'green' : 'red'} tight>
                          {balanced ? '100%' : `${member.kpiWeightTotal}% · fix`}
                        </Chip>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <Link href={`/profile/${member.id}`} style={{ fontSize: 13.5, fontWeight: 700 }}>
                          View profile
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Card>
      </Screen>
    </>
  );
}
