import { forbidden, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EntryRouteSwitch } from '@/components/log/EntryRouteSwitch';
import { UploadFlow } from '@/components/log/UploadFlow';
import { LOCK_DATE_LABEL, OPEN_MONTH_LABEL } from '@/lib/data';
import { UPLOAD_CONTEXT } from '@/lib/upload-data';

export const metadata = { title: 'Spreadsheet upload · M3M Perform' };
export const dynamic = 'force-dynamic';

export default async function UploadPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role === 'EMPLOYEE') forbidden();

  return (
    <>
      <ScreenHeader
        title="Performance Log"
        meta={`${OPEN_MONTH_LABEL} · ${UPLOAD_CONTEXT.department} · locks ${LOCK_DATE_LABEL}`}
        aside={<EntryRouteSwitch />}
      />
      <UploadFlow />
    </>
  );
}
