import { NotDrawnYet } from '@/components/NotDrawnYet';

export const metadata = { title: 'Activity log · M3M Perform' };

export default function ActivityPage() {
  return (
    <NotDrawnYet
      title="Activity log"
      meta="FY 2025–26 · every write to the record"
      summary="Who entered what, when, and from which route. Overwrites, corrections and bulk commits are all stamped here — this is what makes a locked month evidence rather than a working document."
    />
  );
}
