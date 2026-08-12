import Link from 'next/link';
import { forbidden, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card, SectionLabel } from '@/components/ui';

export const metadata = { title: 'Admin · M3M Perform' };
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'HR') forbidden();

  return (
    <>
      <ScreenHeader title="Admin" meta="KPI master, cycles and accounts · HR only" />
      <div style={{ padding: '26px 36px 34px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'start' }}>
        <Card style={{ padding: '22px 26px 24px' }}>
          <div className="stack" style={{ gap: 12 }}>
            <SectionLabel>Accounts</SectionLabel>
            <div style={{ fontSize: 21, fontWeight: 600, color: 'var(--navy)' }}>
              Pilot sign-ins
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>
              Who has claimed their account, who is still to sign in for the first time,
              and password resets. Every reset is recorded against your name.
            </p>
            <Link href="/admin/accounts" className="btn btn--primary" style={{ alignSelf: 'flex-start', textDecoration: 'none' }}>
              Open accounts
            </Link>
          </div>
        </Card>

        <Card tone="navy" style={{ padding: '22px 26px 24px' }}>
          <div className="stack" style={{ gap: 12 }}>
            <SectionLabel tone="navy">Not built yet</SectionLabel>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>
              Publishing the KRA set for a financial year, opening and locking monthly
              cycles, and deciding the exception requests that queue up on HR Home —
              back-entry, mid-year weight changes, target resets. The database models
              exist; the screens do not.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
