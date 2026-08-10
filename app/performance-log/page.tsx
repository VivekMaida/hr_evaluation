import { ScreenHeader } from '@/components/ScreenHeader';
import { EntryForm } from '@/components/log/EntryForm';
import { EntryRouteSwitch } from '@/components/log/EntryRouteSwitch';
import { TeamRail } from '@/components/log/TeamRail';
import { ENTRY_SUBJECT, LOCK_DATE_LABEL, OPEN_MONTH_LABEL } from '@/lib/data';

export const metadata = { title: 'Performance Log · M3M Perform' };

export default function PerformanceLogPage() {
  return (
    <>
      <ScreenHeader
        title="Performance Log"
        meta={`${OPEN_MONTH_LABEL} · Sales · locks ${LOCK_DATE_LABEL}`}
        aside={<EntryRouteSwitch />}
      />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <TeamRail activeId={ENTRY_SUBJECT.id} />
        <EntryForm />
      </div>
    </>
  );
}
