import Link from 'next/link';
import { forbidden, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card, Chip, SectionLabel } from '@/components/ui';
import { STATUS_CHIP, getManagerTeam } from '@/lib/team';

export const metadata = { title: 'Performance Log · M3M Perform' };
export const dynamic = 'force-dynamic';

const FISCAL_YEAR = '2025-26';

/**
 * Reached at the end of a manager's auto-advance run through Performance
 * Log — the confirmation of what was submitted and what, if anything, is
 * still outstanding. Only a manager has a team-shaped round to complete.
 */
export default async function PerformanceLogDonePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'MANAGER') forbidden();

  const team = await getManagerTeam(session.user.employeeId, FISCAL_YEAR);
  const submitted = team.filter((m) => m.status === 'submitted');
  const outstanding = team.filter((m) => m.status !== 'submitted');

  return (
    <>
      <ScreenHeader title="Performance Log" meta={`${submitted.length} of ${team.length} submitted`} />

      <div style={{ padding: '26px 36px 34px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760 }}>
        {outstanding.length === 0 ? (
          <div className="callout callout--positive" style={{ padding: '18px 22px' }}>
            <div className="callout__title">All caught up</div>
            <div style={{ fontSize: 14, color: 'var(--grey-body)' }}>
              Every report is submitted for this cycle. Nothing outstanding.
            </div>
          </div>
        ) : (
          <div className="callout callout--info" style={{ padding: '18px 22px' }}>
            <div className="callout__title">
              {submitted.length} of {team.length} submitted this round
            </div>
            <div style={{ fontSize: 14, color: 'var(--grey-body)' }}>
              {outstanding.length} still outstanding — pick up where you left off below.
            </div>
          </div>
        )}

        <Card style={{ padding: '18px 22px 20px' }}>
          <SectionLabel>Submitted</SectionLabel>
          {submitted.length === 0 ? (
            <div style={{ fontSize: 13.5, color: 'var(--grey-body)', marginTop: 10 }}>
              Nobody yet.
            </div>
          ) : (
            <div className="stack" style={{ gap: 10, marginTop: 12 }}>
              {submitted.map((m) => (
                <div key={m.id} className="spread" style={{ fontSize: 14 }}>
                  <span>
                    <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{m.name}</span>{' '}
                    <span style={{ fontSize: 12.5, color: 'var(--grey-body)' }}>{m.title}</span>
                  </span>
                  <span className="num" style={{ fontWeight: 700, color: 'var(--navy)' }}>
                    {m.score?.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {outstanding.length > 0 ? (
          <Card tone="amber" style={{ padding: '18px 22px 20px' }}>
            <SectionLabel tone="amber">Outstanding</SectionLabel>
            <div className="stack" style={{ gap: 10, marginTop: 12 }}>
              {outstanding.map((m) => {
                const chip = STATUS_CHIP[m.status];
                return (
                  <div key={m.id} className="spread" style={{ fontSize: 14 }}>
                    <span>
                      <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{m.name}</span>{' '}
                      <span style={{ fontSize: 12.5, color: 'var(--grey-body)' }}>{m.title}</span>
                    </span>
                    <div className="row" style={{ gap: 10 }}>
                      <Chip tone={chip.tone} tight>
                        {chip.label}
                      </Chip>
                      <Link
                        href={`/performance-log?employee=${m.id}`}
                        style={{ fontSize: 13.5, fontWeight: 700 }}
                      >
                        Continue
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}

        <Link href="/" className="btn btn--primary btn--large" style={{ textDecoration: 'none', alignSelf: 'flex-start' }}>
          Back to Home
        </Link>
      </div>
    </>
  );
}
