import Link from 'next/link';
import { ScreenHeader } from '@/components/ScreenHeader';
import { YearStrip } from '@/components/YearStrip';
import { Card, Chip, ProgressBar, Screen, SectionLabel, StatCard } from '@/components/ui';
import { TODAY_LABEL } from '@/lib/constants';
import { signed } from '@/lib/score';
import { STATUS_CHIP, type LeadHomeData } from '@/lib/team';

function outstandingSentence(names: string[]): string {
  if (names.length === 0) return 'Every entry is in.';
  const count = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'][
    names.length
  ] ?? String(names.length);
  const noun = names.length === 1 ? 'entry' : 'entries';
  return `${count} ${noun} outstanding — ${names.join(', ')}.`;
}

export function LeadHome({ data }: { data: LeadHomeData }) {
  const { manager, openCycle, team, dueNow, scoreTrend, awaitingNoteCount, recentActivity } = data;
  const openMonthShort = openCycle?.label.split(' ')[0] ?? 'This month';

  return (
    <>
      <ScreenHeader
        title="Home"
        meta={`${manager.department} · ${manager.location ?? '—'} · ${team.length} reporting`}
        aside={
          <span className="num" style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
            {TODAY_LABEL}
          </span>
        }
      />

      <Screen>
        {/* Due now — the one thing this screen exists to say. */}
        <Card style={{ padding: '22px 26px' }}>
          <div className="row" style={{ gap: 32 }}>
            <div className="stack" style={{ flex: 1, minWidth: 0, gap: 6 }}>
              <SectionLabel>Due now</SectionLabel>
              {openCycle ? (
                <>
                  <div style={{ fontSize: 21, fontWeight: 600, color: 'var(--navy)' }}>
                    {openCycle.label} closes {openCycle.locksOnLabel}
                  </div>
                  <div style={{ fontSize: 14.5, color: 'var(--grey-body)' }}>
                    {dueNow.logged} of {dueNow.total} logged.{' '}
                    {outstandingSentence(dueNow.outstandingNames)}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 14.5, color: 'var(--grey-body)' }}>
                  No cycle is currently open.
                </div>
              )}
            </div>

            <div className="stack" style={{ width: 260, flex: 'none', gap: 8 }}>
              <div
                className="spread"
                style={{ fontSize: 13, color: 'var(--grey-body)', gap: 12 }}
              >
                <span>Submission progress</span>
                <span className="num" style={{ fontWeight: 700, color: 'var(--navy)' }}>
                  {dueNow.logged} / {dueNow.total}
                </span>
              </div>
              <ProgressBar value={dueNow.logged} max={dueNow.total} />
              {openCycle?.daysLeft !== null && openCycle?.daysLeft !== undefined ? (
                <div className="num" style={{ fontSize: 13, color: 'var(--grey-body)' }}>
                  {openCycle.daysLeft} days left
                </div>
              ) : null}
            </div>

            <Link
              href="/performance-log"
              className="btn btn--primary btn--large"
              style={{ flex: 'none', textDecoration: 'none' }}
            >
              Continue logging
            </Link>
          </div>
        </Card>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 18,
          }}
        >
          <StatCard
            label={`${openMonthShort} entries`}
            value={String(dueNow.logged)}
            suffix={`of ${dueNow.total}`}
            foot="Team completeness"
          />
          <StatCard
            label={`Team score · ${scoreTrend?.current.label.split(' ')[0] ?? '—'}`}
            labelTone="navy"
            tone="navy"
            value={scoreTrend?.current.average === null || scoreTrend?.current.average === undefined ? '—' : scoreTrend.current.average.toFixed(1)}
            foot={
              scoreTrend ? (
                <span className="num">
                  {scoreTrend.previous.label.split(' ')[0]}{' '}
                  {scoreTrend.previous.average === null ? '—' : scoreTrend.previous.average.toFixed(1)}
                  {scoreTrend.current.average !== null && scoreTrend.previous.average !== null
                    ? ` · ${signed(scoreTrend.current.average - scoreTrend.previous.average)}`
                    : ''}
                </span>
              ) : (
                'No locked months yet'
              )
            }
          />
          <StatCard
            label="Awaiting context note"
            labelTone="amber"
            tone="amber"
            value={String(awaitingNoteCount)}
            foot="Actuals outside the 70–120% band"
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 316px',
            gap: 18,
            alignItems: 'start',
          }}
        >
          <Card style={{ padding: '20px 24px 22px' }}>
            <div
              className="spread"
              style={{ alignItems: 'baseline', marginBottom: 16 }}
            >
              <SectionLabel>My Team · {openMonthShort}</SectionLabel>
              <span
                style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--grey-line)' }}
                title="My Team has not been designed yet"
              >
                Open My Team
              </span>
            </div>

            <table className="data-table" style={{ fontSize: 14.5 }}>
              <thead>
                <tr>
                  <th style={{ padding: '9px 12px' }}>Employee</th>
                  <th style={{ padding: '9px 12px' }}>{openMonthShort}</th>
                  <th className="is-num" style={{ padding: '9px 12px' }}>
                    Score
                  </th>
                  <th style={{ padding: '9px 12px' }}>Apr → Mar</th>
                  <th style={{ padding: '9px 12px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {team.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '16px 12px', color: 'var(--grey-body)' }}>
                      No one reports to you yet.
                    </td>
                  </tr>
                ) : (
                  team.map((member) => {
                    const chip = STATUS_CHIP[member.status];
                    const action =
                      member.status === 'submitted'
                        ? 'View'
                        : member.status === 'note-pending'
                          ? 'Add note'
                          : member.status === 'in-progress'
                            ? 'Resume'
                            : 'Log';
                    return (
                      <tr key={member.id}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--navy)' }}>
                            {member.name}
                          </div>
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
                          <YearStrip
                            size="small"
                            points={member.points}
                            label={`${member.name}, twelve months`}
                          />
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <Link
                            href={
                              action === 'View'
                                ? `/scorecard/${member.id}`
                                : `/performance-log?employee=${member.id}`
                            }
                            style={{ fontSize: 13.5, fontWeight: 700 }}
                          >
                            {action}
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </Card>

          <Card style={{ padding: '20px 22px 22px' }}>
            <div className="stack" style={{ gap: 16 }}>
              <SectionLabel>Recent activity</SectionLabel>
              <div className="stack" style={{ gap: 14 }}>
                {recentActivity.length === 0 ? (
                  <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
                    No recent activity for your team.
                  </div>
                ) : (
                  recentActivity.map((item, i) => (
                    <div key={`${item.when}-${item.what}-${i}`} className="stack" style={{ gap: 14 }}>
                      {i > 0 ? (
                        <div style={{ height: 1, background: 'var(--grey-surface)' }} />
                      ) : null}
                      <div className="stack" style={{ gap: 2 }}>
                        <div
                          style={{ fontSize: 14, lineHeight: 1.45, color: 'var(--navy)' }}
                        >
                          {item.who ? (
                            <>
                              <strong>{item.who}</strong> — {item.what}
                            </>
                          ) : (
                            item.what
                          )}
                        </div>
                        <div
                          className="num"
                          style={{ fontSize: 12.5, color: 'var(--grey-body)' }}
                        >
                          {item.when} · {item.by}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Link href="/activity" style={{ fontSize: 13.5, fontWeight: 700 }}>
                Full activity log
              </Link>
            </div>
          </Card>
        </div>
      </Screen>
    </>
  );
}
