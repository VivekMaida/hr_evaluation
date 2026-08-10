'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Entry route is a segmented control at the top of Performance Log, so the
 * spreadsheet path drops in without restructuring the screen.
 */
export function EntryRouteSwitch() {
  const pathname = usePathname();
  const onUpload = pathname.startsWith('/performance-log/upload');

  return (
    <div className="segmented" role="group" aria-label="Entry route">
      <Link
        href="/performance-log"
        className="segmented__option"
        aria-pressed={!onUpload}
        style={{ textDecoration: 'none' }}
      >
        Form entry
      </Link>
      <Link
        href="/performance-log/upload"
        className="segmented__option"
        aria-pressed={onUpload}
        style={{ textDecoration: 'none' }}
      >
        Spreadsheet upload
      </Link>
    </div>
  );
}
