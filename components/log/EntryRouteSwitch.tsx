'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Entry route is a segmented control at the top of Performance Log. Upload
 * isn't linked here — it parses no file, so nothing would actually commit.
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
      <span
        className="segmented__option"
        aria-pressed={onUpload}
        style={{ color: 'var(--grey-line)', cursor: 'not-allowed' }}
        title="Spreadsheet upload doesn't parse or commit a real file yet"
      >
        Spreadsheet upload
      </span>
    </div>
  );
}
