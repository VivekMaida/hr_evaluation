import Link from 'next/link';

/**
 * Entry route is a segmented control at the top of Performance Log. Only the
 * form route exists: the spreadsheet route was drawn but never wired up — it
 * parsed no file and wrote nothing — so it is named here as a planned route
 * and is not a link. There is no /performance-log/upload page to link to.
 */
export function EntryRouteSwitch() {
  return (
    <div className="segmented" role="group" aria-label="Entry route">
      <Link
        href="/performance-log"
        className="segmented__option"
        aria-pressed={true}
        style={{ textDecoration: 'none' }}
      >
        Form entry
      </Link>
      <span
        className="segmented__option"
        aria-pressed={false}
        style={{ color: 'var(--grey-line)', cursor: 'not-allowed' }}
        title="Spreadsheet upload isn't built yet — the form is the only route that records a month"
      >
        Spreadsheet upload
      </span>
    </div>
  );
}
