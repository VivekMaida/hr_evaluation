import Link from 'next/link';
import { forbidden, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';

export const metadata = { title: 'Spreadsheet upload · not available · M3M Perform' };
export const dynamic = 'force-dynamic';

/**
 * Deliberately blocked for the pilot.
 *
 * The spreadsheet route was drawn in round 1 and reads convincingly, but it
 * parses no file and writes nothing: `UploadBatch` has no reads or writes
 * anywhere, and every figure in the old flow came from lib/upload-data.ts.
 * Left reachable, a manager who found it would walk through three steps, see
 * a success screen, and believe a month had been submitted when nothing had
 * been recorded at all. That is worse than the screen not existing.
 *
 * The flow's components (components/log/UploadStep*.tsx, UploadFlow.tsx) are
 * kept in the tree for whenever the real parser is built; nothing imports
 * them while this page stands in their place.
 */
export default async function UploadBlockedPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role === 'EMPLOYEE') forbidden();

  return (
    <>
      <ScreenHeader title="Spreadsheet upload" meta="Not available in the pilot" />
      <EmptyState
        label="Not available yet"
        heading="Spreadsheet upload is not switched on"
        body={
          <>
            This route was designed but never wired up — it does not read the file you
            choose and it does not write anything to the record. Nothing you may have
            done here has been saved. Log the month on the form instead; that is the
            only route that records a real submission during the pilot.
          </>
        }
        actions={
          <Link
            href="/performance-log"
            className="btn btn--primary btn--large"
            style={{ textDecoration: 'none' }}
          >
            Go to form entry
          </Link>
        }
      />
    </>
  );
}
