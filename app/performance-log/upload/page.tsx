import { ScreenHeader } from '@/components/ScreenHeader';
import { EntryRouteSwitch } from '@/components/log/EntryRouteSwitch';
import { UploadFlow } from '@/components/log/UploadFlow';
import { LOCK_DATE_LABEL, OPEN_MONTH_LABEL } from '@/lib/data';
import { UPLOAD_CONTEXT } from '@/lib/upload-data';

export const metadata = { title: 'Spreadsheet upload · M3M Perform' };

export default function UploadPage() {
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
