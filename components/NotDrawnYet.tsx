import Link from 'next/link';
import { EmptyState } from './EmptyState';
import { ScreenHeader } from './ScreenHeader';

/**
 * Round 1 of the design covers Home, Performance Log, Scorecard, Reviews and
 * Reports. The remaining nav items exist in the IA and are reachable, so the
 * shape of the product is honest — they just have nothing drawn behind them
 * yet. Replace each of these with the real screen as it lands.
 */
export function NotDrawnYet({
  title,
  meta,
  summary,
}: {
  title: string;
  meta: string;
  summary: string;
}) {
  return (
    <>
      <ScreenHeader title={title} meta={meta} />
      <EmptyState
        label="Not in round 1"
        heading={`${title} has not been designed yet`}
        body={summary}
        actions={
          <Link
            href="/"
            className="btn btn--primary btn--large"
            style={{ textDecoration: 'none' }}
          >
            Back to Home
          </Link>
        }
      />
    </>
  );
}
