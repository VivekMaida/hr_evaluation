'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Entry route is a segmented control at the top of Performance Log. Both
 * routes write the same record through the same rules — the spreadsheet one
 * validates a whole team's month in one pass and refuses partial files until
 * they are confirmed, the form takes one person at a time.
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
