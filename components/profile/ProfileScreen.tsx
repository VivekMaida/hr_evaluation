import Link from 'next/link';
import { CoverageBar } from '@/components/CoverageBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { YearStrip } from '@/components/YearStrip';
import { Card, Chip, SectionLabel } from '@/components/ui';
import type { ProfileData } from '@/lib/profile';
import { consistencyLabel, trendLabel } from '@/lib/scorecard';
import { consistency, signed, trend } from '@/lib/score';
import { signOutAction } from '@/app/login/actions';
import { ChangePasswordForm } from './ChangePasswordForm';
import { EditIdentityForm, type DepartmentOption, type ManagerOption } from './EditIdentityForm';
import { KpiSetEditor } from './KpiSetEditor';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="spread" style={{ fontSize: 14, gap: 16 }}>
      <span style={{ color: 'var(--grey-body)' }}>{label}</span>
      <span style={{ fontWeight: 700, color: 'var(--navy)', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export function ProfileScreen({
  data,
  own,
  editable,
  canEditKpis,
  departments,
  managers,
}: {
  data: ProfileData;
  /** Viewing your own profile — shows the Account section. */
  own: boolean;
  /** HR viewing someone else's — identity becomes editable. */
  editable: boolean;
  /** HR for anyone, or this employee's own manager — KPI set becomes editable. */
  canEditKpis: boolean;
  departments?: DepartmentOption[];
  managers?: ManagerOption[];
}) {
  const { identity, thisCycle, kpis, acknowledgements, record, lastLoginAtLabel, mustSetPassword } = data;

  const totalWeight = kpis.current.reduce((sum, k) => sum + k.weight, 0);

  return (
    <>
      <ScreenHeader
        title={own ? 'Profile' : `${identity.name}'s profile`}
        meta={`${identity.title} · ${identity.department}`}
      />

      <div
        style={{
          padding: '24px 36px 34px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div className="spread" style={{ alignItems: 'flex-start', gap: 32 }}>
          <div className="stack" style={{ gap: 4 }}>
            <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.1 }}>
              {identity.name}
            </div>
            <div
              className="num"
              style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}
              title="Employee ID — the import match key and the reference to quote when asking about this record"
            >
              {identity.id}
            </div>
          </div>
          <Chip tone={identity.role === 'HR' ? 'cyan' : identity.role === 'MANAGER' ? 'navy' : 'grey'} tight>
            {identity.role}
          </Chip>
        </div>

        {/* 1. Identity */}
        <Card style={{ padding: '20px 24px 22px' }}>
          <SectionLabel>Identity</SectionLabel>
          <div style={{ marginTop: 14 }}>
            {editable && departments && managers ? (
              <EditIdentityForm identity={identity} departments={departments} managers={managers} />
            ) : (
              <div className="stack" style={{ gap: 10, maxWidth: 480 }}>
                <Field label="Employee ID" value={identity.id} />
                <Field label="Email" value={identity.email} />
                <Field label="Designation" value={identity.title} />
                <Field label="Department" value={identity.department} />
                <Field label="Reporting manager" value={identity.managerName ?? '—'} />
                <Field
                  label="Date of joining"
                  value={
                    identity.joinedOn
                      ? identity.joinedOn.toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : '—'
                  }
                />
                <Field label="Location" value={identity.location ?? '—'} />
              </div>
            )}
          </div>
        </Card>

        {/* 2. This cycle */}
        <Card style={{ padding: '20px 24px 22px' }}>
          <SectionLabel>This cycle</SectionLabel>
          <div className="stack" style={{ gap: 10, marginTop: 14 }}>
            <Field label="Financial year" value={thisCycle.fiscalYearLabel} />
            <Field
              label="Eligible months"
              value={
                thisCycle.eligibleCount === 0
                  ? '—'
                  : thisCycle.eligibleFromLabel === thisCycle.eligibleToLabel
                    ? thisCycle.eligibleFromLabel
                    : `${thisCycle.eligibleFromLabel} – ${thisCycle.eligibleToLabel}`
              }
            />
            <Field
              label="Coverage"
              value={`${thisCycle.logged} of ${thisCycle.eligibleCount} eligible months`}
            />
            {thisCycle.joinerNote ? (
              <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--grey-body)' }}>
                {thisCycle.joinerNote}
              </div>
            ) : null}
          </div>
        </Card>

        {/* 3. My KPIs */}
        <Card style={{ padding: '20px 24px 22px' }}>
          <div className="spread" style={{ alignItems: 'baseline', marginBottom: 14 }}>
            <SectionLabel>{own ? 'My KPIs' : `${identity.name.split(' ')[0]}'s KPIs`}</SectionLabel>
            <span style={{ fontSize: 13, color: 'var(--grey-body)' }}>{kpis.fiscalYearLabel}</span>
          </div>

          {canEditKpis ? (
            <KpiSetEditor employeeId={identity.id} kpis={kpis} />
          ) : kpis.current.length === 0 ? (
            <div style={{ fontSize: 14, color: 'var(--grey-body)' }}>
              No KPI set has been published for this fiscal year yet.
            </div>
          ) : (
            <>
              <table className="data-table" style={{ fontSize: 14.5 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '9px 12px' }}>Key result area</th>
                    <th className="is-num" style={{ padding: '9px 10px', width: 80 }}>
                      Weight
                    </th>
                    <th className="is-num" style={{ padding: '9px 10px', width: 110 }}>
                      Annual target
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.current.map((kpi) => (
                    <tr key={kpi.id}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{kpi.name}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--grey-body)' }}>
                          {kpi.basis}
                          {kpi.lowerIsBetter ? ' · lower is better' : ''}
                        </div>
                      </td>
                      <td className="is-num" style={{ padding: '10px 10px' }}>
                        {kpi.weight}%
                      </td>
                      <td className="is-num" style={{ padding: '10px 10px' }}>
                        {kpi.target}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--navy)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--navy)' }}>Total</td>
                    <td
                      className="is-num"
                      style={{
                        padding: '10px 10px',
                        fontWeight: 700,
                        color: totalWeight === 100 ? 'var(--navy)' : 'var(--red)',
                      }}
                    >
                      {totalWeight}%
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
              <div style={{ fontSize: 12.5, color: 'var(--grey-body)', marginTop: 10 }}>
                {kpis.effectiveDateLabel ? `In effect since ${kpis.effectiveDateLabel}. ` : ''}
                {kpis.pending.length > 0
                  ? `A change is scheduled, effective ${kpis.pendingFromLabel}.`
                  : ''}
              </div>
            </>
          )}
        </Card>

        {/* 4. Account */}
        {own ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 18, alignItems: 'start' }}>
            <Card style={{ padding: '20px 24px 22px' }}>
              <div className="stack" style={{ gap: 16 }}>
                <SectionLabel>Change your password</SectionLabel>
                <ChangePasswordForm neverSet={mustSetPassword} />
              </div>
            </Card>
            <Card tone="navy" style={{ padding: '18px 20px 20px' }}>
              <div className="stack" style={{ gap: 12 }}>
                <SectionLabel tone="navy">Account</SectionLabel>
                <Field label="Last signed in" value={lastLoginAtLabel ?? '—'} />
                <Field label="On default password" value={mustSetPassword ? 'Yes' : 'No'} />
                <div style={{ height: 1, background: 'var(--grey-surface)' }} />
                <form action={signOutAction}>
                  <button type="submit" className="btn btn--secondary" style={{ width: '100%', justifyContent: 'center' }}>
                    Sign out
                  </button>
                </form>
              </div>
            </Card>
          </div>
        ) : (
          <Card tone="navy" style={{ padding: '18px 20px 20px' }}>
            <div className="stack" style={{ gap: 12 }}>
              <SectionLabel tone="navy">Account</SectionLabel>
              <Field label="Last signed in" value={lastLoginAtLabel ?? '—'} />
              <Field label="On default password" value={mustSetPassword ? 'Yes' : 'No'} />
              <div style={{ fontSize: 13, color: 'var(--grey-body)' }}>
                Reset this person's password from{' '}
                <Link href="/admin/accounts" style={{ fontWeight: 700 }}>
                  Admin → Accounts
                </Link>
                .
              </div>
            </div>
          </Card>
        )}

        {/* 5. My record — gated */}
        {record ? (
          <Card style={{ padding: '20px 24px 22px' }}>
            <SectionLabel>{own ? 'My record' : `${identity.name.split(' ')[0]}'s record`}</SectionLabel>
            {record.subject ? (
              <MyRecordBody subject={record.subject} />
            ) : (
              <div style={{ fontSize: 14, color: 'var(--grey-body)', marginTop: 14 }}>
                Nothing submitted yet this fiscal year.
              </div>
            )}
          </Card>
        ) : null}

        {/* 6. Acknowledgements */}
        <Card style={{ padding: '20px 24px 22px' }}>
          <SectionLabel>Acknowledgements</SectionLabel>
          <div style={{ marginTop: 14 }}>
            {acknowledgements.length === 0 ? (
              <div style={{ fontSize: 14, color: 'var(--grey-body)' }}>
                Nothing acknowledged yet.
              </div>
            ) : (
              <table className="data-table" style={{ fontSize: 14.5 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '9px 12px' }}>Month</th>
                    <th style={{ padding: '9px 12px' }}>Confirmed seen</th>
                  </tr>
                </thead>
                <tbody>
                  {acknowledgements.map((a) => (
                    <tr key={`${a.cycleLabel}-${a.acknowledgedAtLabel}`}>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: 'var(--navy)' }}>
                        {a.cycleLabel}
                      </td>
                      <td className="num" style={{ padding: '9px 12px' }}>{a.acknowledgedAtLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

function MyRecordBody({ subject }: { subject: import('@/lib/scorecard').ScorecardSubject }) {
  const sd = consistency(subject.points);
  const delta = trend(subject.points);

  return (
    <>
      <div style={{ paddingRight: 44, marginTop: 14 }}>
        <YearStrip size="large" points={subject.points} label={`${subject.name}, twelve months`} />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 18,
          marginTop: 18,
        }}
      >
        <Card tone="navy" style={{ padding: '16px 18px' }}>
          <div className="stack" style={{ gap: 5 }}>
            <SectionLabel tone="navy">Year average</SectionLabel>
            <div className="num" style={{ fontSize: 30, fontWeight: 600, color: 'var(--navy)' }}>
              {subject.yearAverage.toFixed(1)}
            </div>
          </div>
        </Card>
        <Card tone="navy" style={{ padding: '16px 18px' }}>
          <div className="stack" style={{ gap: 5 }}>
            <SectionLabel tone="navy">Consistency</SectionLabel>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--navy)' }}>
              {consistencyLabel(sd, subject.monthsLogged)}
            </div>
          </div>
        </Card>
        <Card tone="navy" style={{ padding: '16px 18px' }}>
          <div className="stack" style={{ gap: 5 }}>
            <SectionLabel tone="navy">Trend</SectionLabel>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--navy)' }}>
              {trendLabel(delta)}
              {delta !== null ? (
                <span className="num" style={{ fontSize: 13, fontWeight: 400, color: 'var(--grey-body)' }}>
                  {' '}
                  {signed(delta)}
                </span>
              ) : null}
            </div>
          </div>
        </Card>
        <Card tone="navy" style={{ padding: '16px 18px' }}>
          <div className="stack" style={{ gap: 5 }}>
            <SectionLabel tone="navy">Coverage</SectionLabel>
            <div className="num" style={{ fontSize: 22, fontWeight: 600, color: 'var(--navy)' }}>
              {subject.monthsLogged}{' '}
              <span style={{ fontSize: 14, fontWeight: 400 }}>of {subject.eligibleMonths}</span>
            </div>
            <CoverageBar points={subject.points} />
          </div>
        </Card>
      </div>
    </>
  );
}
