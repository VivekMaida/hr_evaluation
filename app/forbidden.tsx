import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';

/** Rendered by forbidden() wherever a role or record check refuses access. */
export default function Forbidden() {
  return (
    <>
      <ScreenHeader title="Forbidden" />
      <EmptyState
        label="403 · Forbidden"
        heading="You don't have access to this page"
        body="Your account doesn't have permission to view this record or screen. If that's wrong, ask HR."
        actions={
          <Link href="/" className="btn btn--primary btn--large" style={{ textDecoration: 'none' }}>
            Back to Home
          </Link>
        }
      />
    </>
  );
}
