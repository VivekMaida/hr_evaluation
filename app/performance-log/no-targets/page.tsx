import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';

export const metadata = { title: 'No targets published · M3M Perform' };

/** 08a — a lead opens a month before Admin has published the KRA set. */
export default function NoTargetsPage() {
  return (
    <>
      <ScreenHeader
        title="Performance Log"
        meta="April 2026 · Marketing · FY 2026–27"
      />
      <EmptyState
        label="Nothing to log yet"
        heading="April targets have not been published for Marketing"
        body="The FY 2026–27 KRA set is still in draft. Until Admin publishes it there is nothing to enter actuals against, so this month cannot be opened. Published sets carry weights and monthly targets for all 126 people in the department."
        actions={
          <>
            <button type="button" className="btn btn--primary btn--large">
              Ask Admin to publish
            </button>
            <Link
              href="/performance-log"
              className="btn btn--secondary"
              style={{ padding: '11px 22px', textDecoration: 'none' }}
            >
              Go to March 2026
            </Link>
          </>
        }
        foot="KPI master last published 4 April 2025 by Priya Deshmukh"
      />
    </>
  );
}
