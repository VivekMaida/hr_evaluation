import Link from 'next/link';
import { ScreenHeader } from '@/components/ScreenHeader';
import { YearStrip } from '@/components/YearStrip';
import { Card, Chip, ProgressBar, Screen, SectionLabel, StatCard } from '@/components/ui';
import {
  CURRENT_USER,
  DAYS_LEFT,
  FEBRUARY_CHIP,
  LOCK_DATE_LABEL,
  OPEN_MONTH_LABEL,
  RECENT_ACTIVITY,
  TEAM,
  TEAM_SUMMARY,
  TODAY_LABEL,
  buildYear,
} from '@/lib/data';
import { signed } from '@/lib/score';

function outstandingSentence(names: string[]): string {
  if (names.length === 0) return 'Every entry is in.';
  const count = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'][
    names.length
  ] ?? String(names.length);
  const noun = names.length === 1 ? 'entry' : 'entries';
  return `${count} ${noun} outstanding — ${names.join(', ')}.`;
}

export function LeadHome() {
  const lead = CURRENT_USER.lead;
  const { logged, total, outstanding, januaryScore, decemberScore, awaitingNote } =
    TEAM_SUMMARY;

  return (
    <>
      <ScreenHeader
        title="Home"
        meta={`${lead.department} · ${lead.location} · ${TEAM.length} reporting`}
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
              <div style={{ fontSize: 21, fontWeight: 600, color: 'var(--navy)' }}>
                {OPEN_MONTH_LABEL} closes {LOCK_DATE_LABEL}
              </div>
              <div style={{ fontSize: 14.5, color: 'var(--grey-body)' }}>
                {logged} of {total} logged. {outstandingSentence(outstanding)}
              </div>
            </div>

            <div className="stack" style={{ width: 260, flex: 'none', gap: 8 }}>
              <div
                className="spread"
                style={{ fontSize: 13, color: 'var(--grey-body)', gap: 12 }}
              >
                <span>Submission progress</span>
                <span className="num" style={{ fontWeight: 700, color: 'var(--navy)' }}>
                  {logged} / {total}
                </span>
              </div>
              <ProgressBar value={logged} max={total} />
              <div className="num" style={{ fontSize: 13, color: 'var(--grey-body)' }}>
                {DAYS_LEFT} days left
              </div>
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
            label="February entries"
            value={String(logged)}
            suffix={`of ${total}`}
            foot="Sales team completeness"
          />
          <StatCard
            label="Team score · January"
            labelTone="navy"
            tone="navy"
            value={januaryScore.toFixed(1)}
            foot={
              <span className="num">
                December {decemberScore.toFixed(1)} ·{' '}
                {signed(januaryScore - decemberScore)}
              </span>
            }
          />
          <StatCard
            label="Awaiting context note"
            labelTone="amber"
            tone="amber"
            value={String(awaitingNote)}
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
              <SectionLabel>My Team · {OPEN_MONTH_LABEL}</SectionLabel>
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
                  <th style={{ padding: '9px 12px' }}>February</th>
                  <th className="is-num" style={{ padding: '9px 12px' }}>
                    Score
                  </th>
                  <th style={{ padding: '9px 12px' }}>Apr → Mar</th>
                  <th style={{ padding: '9px 12px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {TEAM.map((member) => {
                  const chip = FEBRUARY_CHIP[member.february];
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
                          points={buildYear(member.closed)}
                          label={`${member.name}, twelve months`}
                        />
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <Link
                          href={
                            member.action === 'View'
                              ? `/scorecard/${member.id}`
                              : '/performance-log'
                          }
                          style={{ fontSize: 13.5, fontWeight: 700 }}
                        >
                          {member.action}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <Card style={{ padding: '20px 22px 22px' }}>
            <div className="stack" style={{ gap: 16 }}>
              <SectionLabel>Recent activity</SectionLabel>
              <div className="stack" style={{ gap: 14 }}>
                {RECENT_ACTIVITY.map((item, i) => (
                  <div key={`${item.when}-${item.what}`} className="stack" style={{ gap: 14 }}>
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
                ))}
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
