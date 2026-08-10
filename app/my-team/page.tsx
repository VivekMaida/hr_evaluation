import { NotDrawnYet } from '@/components/NotDrawnYet';

export const metadata = { title: 'My Team · M3M Perform' };

export default function MyTeamPage() {
  return (
    <NotDrawnYet
      title="My Team"
      meta="Sales · Gurugram · 7 reporting"
      summary="The full roster with every month, every score and every outstanding entry. Home carries a cut-down version of this table for the open cycle; this screen is the whole year for the whole team."
    />
  );
}
