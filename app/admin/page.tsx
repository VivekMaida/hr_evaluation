import { NotDrawnYet } from '@/components/NotDrawnYet';

export const metadata = { title: 'Admin · M3M Perform' };

export default function AdminPage() {
  return (
    <NotDrawnYet
      title="Admin"
      meta="KPI master, cycles and exception approvals · HR only"
      summary="Publishing the KRA set for a financial year, opening and locking monthly cycles, and deciding the exception requests that queue up on HR Home — back-entry, mid-year weight changes, target resets."
    />
  );
}
