import { forbidden, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card, Chip, Screen, SectionLabel } from '@/components/ui';
import { FISCAL_YEAR } from '@/lib/constants';
import {
  getCorrectableCyclesForEmployees,
  getCorrectionsRaisedBy,
  getDecidedCorrections,
  getPendingCorrections,
  type CorrectionItem,
} from '@/lib/corrections';
import { getManagerTeam } from '@/lib/team';
import { DecideCorrectionForm } from './DecideCorrectionForm';
import { RaiseCorrectionForm, type CorrectionTarget } from './RaiseCorrectionForm';

export const metadata = { title: 'Corrections · M3M Perform' };
export const dynamic = 'force-dynamic';

const STATE_TONE = {
  PENDING: 'amber',
  APPROVED: 'green',
  REJECTED: 'red',
} as const;

function stateLabel(item: CorrectionItem): string {
  if (item.state === 'PENDING') return 'Awaiting HR';
  if (item.state === 'REJECTED') return 'Declined';
  return item.reopenInForce ? 'Reopened' : 'Corrected';
}

function RequestCard({ item, children }: { item: CorrectionItem; children?: React.ReactNode }) {
  return (
    <Card style={{ padding: '16px 20px 18px' }}>
      <div className="spread" style={{ alignItems: 'baseline', gap: 16 }}>
        <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 15.5 }}>
          {item.employeeName} · {item.cycleLabel}
        </div>
        <Chip tone={STATE_TONE[item.state]} tight>
          {stateLabel(item)}
        </Chip>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--grey-body)', marginTop: 3 }}>
        Raised by {item.raisedByName} on {item.raisedAtLabel}
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.55, marginTop: 10 }}>{item.reason}</div>
      {item.decisionNote ? (
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px solid var(--grey-surface)',
            fontSize: 13.5,
            color: 'var(--grey-body)',
          }}
        >
          <strong style={{ color: 'var(--navy)' }}>
            {item.state === 'APPROVED' ? 'Approved' : 'Declined'} by {item.decidedByName} on{' '}
            {item.decidedAtLabel}:
          </strong>{' '}
          {item.decisionNote}
        </div>
      ) : null}
      {children}
    </Card>
  );
}

/**
 * Locked months are evidence, so changing one takes a request and a decision,
 * both with a reason on the record. A manager raises one against their own
 * report; HR approves or declines. An approved request reopens that one month
 * for that one person until it is resubmitted.
 */
export default async function CorrectionsPage({
  searchParams,
}: {
  /**
   * `?employee=<id>` prefills the form. Set by "Request back-entry" on the
   * Scorecard, so a manager who spotted a hole in someone's record arrives
   * with that person already chosen rather than picking them out again. Only
   * a hint: an id that isn't one of this manager's correctable reports is
   * ignored and the form falls back to its first target.
   */
  searchParams: Promise<{ employee?: string }>;
}) {
  const { employee: requestedEmployeeId } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role === 'EMPLOYEE') forbidden();

  if (session.user.role === 'HR') {
    const [pending, decided] = await Promise.all([
      getPendingCorrections(),
      getDecidedCorrections(),
    ]);

    return (
      <>
        <ScreenHeader
          title="Corrections"
          meta={`${FISCAL_YEAR} · ${pending.length} awaiting your decision`}
        />
        <Screen>
          <Card style={{ padding: '18px 22px' }}>
            <SectionLabel>How this works</SectionLabel>
            <div style={{ fontSize: 14, lineHeight: 1.6, marginTop: 8, maxWidth: '72ch' }}>
              Approving reopens that one month for that one employee so their manager can re-enter
              the figures. It re-locks itself the moment the month is resubmitted. Declining leaves
              the month as it stands. Either way your reason is kept on the record.
            </div>
          </Card>

          <div className="stack" style={{ gap: 12 }}>
            <SectionLabel tone="amber">Awaiting a decision</SectionLabel>
            {pending.length === 0 ? (
              <div style={{ fontSize: 14, color: 'var(--grey-body)' }}>
                Nothing is waiting. Requests appear here as managers raise them.
              </div>
            ) : (
              pending.map((item) => (
                <RequestCard key={item.id} item={item}>
                  <DecideCorrectionForm correctionId={item.id} />
                </RequestCard>
              ))
            )}
          </div>

          {decided.length > 0 ? (
            <div className="stack" style={{ gap: 12 }}>
              <SectionLabel tone="navy">Already decided</SectionLabel>
              {decided.map((item) => (
                <RequestCard key={item.id} item={item} />
              ))}
            </div>
          ) : null}
        </Screen>
      </>
    );
  }

  // MANAGER — raise one against their own reports, and see where each stands.
  const { team } = await getManagerTeam(session.user.employeeId, FISCAL_YEAR);
  const [correctable, mine] = await Promise.all([
    getCorrectableCyclesForEmployees(team.map((m) => m.id)),
    getCorrectionsRaisedBy(session.user.employeeId),
  ]);

  const targets: CorrectionTarget[] = team
    .map((m) => ({
      employeeId: m.id,
      employeeName: m.name,
      cycles: correctable.get(m.id) ?? [],
    }))
    .filter((t) => t.cycles.length > 0);

  return (
    <>
      <ScreenHeader title="Corrections" meta={`${FISCAL_YEAR} · your team`} />
      <Screen>
        <Card style={{ padding: '18px 22px' }}>
          <SectionLabel>Correcting a locked month</SectionLabel>
          <div style={{ fontSize: 14, lineHeight: 1.6, marginTop: 8, maxWidth: '72ch' }}>
            A month locks on the 7th and becomes part of the record, so it cannot simply be edited.
            Ask HR to reopen it and say why. If they approve, that month becomes editable for that
            person in the Performance Log, and locks again as soon as you resubmit it.
          </div>
        </Card>

        <Card style={{ padding: '20px 24px 22px' }}>
          <SectionLabel>Request a correction</SectionLabel>
          <div style={{ marginTop: 14 }}>
            <RaiseCorrectionForm targets={targets} initialEmployeeId={requestedEmployeeId} />
          </div>
        </Card>

        <div className="stack" style={{ gap: 12 }}>
          <SectionLabel tone="navy">Your requests</SectionLabel>
          {mine.length === 0 ? (
            <div style={{ fontSize: 14, color: 'var(--grey-body)' }}>
              You haven't raised any correction requests.
            </div>
          ) : (
            mine.map((item) => <RequestCard key={item.id} item={item} />)
          )}
        </div>
      </Screen>
    </>
  );
}
