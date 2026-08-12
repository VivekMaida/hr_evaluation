import { forbidden, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { NotDrawnYet } from '@/components/NotDrawnYet';

export const metadata = { title: 'Calibration · M3M Perform' };
export const dynamic = 'force-dynamic';

export default async function CalibrationPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'HR') forbidden();

  return (
    <NotDrawnYet
      title="Calibration"
      meta="Annual appraisal FY 2025–26 · HR only"
      summary="Where HR reviews submitted ratings against the record — the gaps Reviews flags, the leads Report 02 surfaces, and the justifications written when a rating departs from the twelve months. No distribution is imposed here."
    />
  );
}
