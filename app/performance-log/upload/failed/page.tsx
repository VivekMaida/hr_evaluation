import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

/**
 * The old "every row rejected" report (design screen 08c) rendered a
 * hardcoded rejection list and was reachable only by typing the URL. With the
 * upload route blocked for the pilot there is no flow that can land here, so
 * it redirects to the one page that explains why rather than showing a
 * fabricated import result.
 */
export default async function UploadFailedBlockedPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  redirect('/performance-log/upload');
}
