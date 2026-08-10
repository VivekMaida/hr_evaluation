import { Scorecard } from '@/components/scorecard/Scorecard';
import { ROHIT } from '@/lib/scorecard-data';

export const metadata = { title: 'Scorecard · M3M Perform' };

export default function ScorecardIndexPage() {
  return <Scorecard subject={ROHIT} />;
}
