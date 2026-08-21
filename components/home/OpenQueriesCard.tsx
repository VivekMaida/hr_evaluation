import Link from 'next/link';
import { Card, Chip, SectionLabel } from '@/components/ui';
import type { OpenQuery } from '@/lib/queries';

/**
 * Unanswered questions, on a screen somebody actually opens.
 *
 * A query can only be answered from the asker's own Scorecard, so every row
 * links there rather than restating the question somewhere it cannot be
 * replied to. Amber throughout: this is work waiting on a person, not a
 * failure — an unanswered question is not yet a problem, it just stops being
 * invisible.
 */
export function OpenQueriesCard({
  queries,
  showManager = false,
  emptyNote,
}: {
  queries: OpenQuery[];
  /** HR needs to know who owes the reply; a manager is always that person. */
  showManager?: boolean;
  emptyNote: string;
}) {
  return (
    <Card tone="amber" style={{ padding: '20px 22px 22px' }}>
      <div className="stack" style={{ gap: 14 }}>
        <div className="spread" style={{ alignItems: 'baseline', gap: 12 }}>
          <SectionLabel tone="amber">Open queries</SectionLabel>
          {queries.length > 0 ? (
            <Chip tone="amber" tight>
              {queries.length} awaiting a reply
            </Chip>
          ) : null}
        </div>

        {queries.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--grey-body)' }}>{emptyNote}</div>
        ) : (
          queries.map((q, i) => (
            <div key={q.id} className="stack" style={{ gap: 14 }}>
              {i > 0 ? <div style={{ height: 1, background: 'var(--grey-surface)' }} /> : null}
              <div className="stack" style={{ gap: 4 }}>
                <div className="spread" style={{ gap: 12, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>
                    {q.employeeName} · {q.cycleLabel}
                  </span>
                  <span
                    className="num"
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      flex: 'none',
                      color: q.daysWaiting >= 7 ? 'var(--red)' : 'var(--grey-body)',
                    }}
                  >
                    {q.daysWaiting === 0
                      ? 'asked today'
                      : `waiting ${q.daysWaiting} day${q.daysWaiting === 1 ? '' : 's'}`}
                  </span>
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--navy)' }}>
                  {q.question}
                </div>
                <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                  <Link href={`/scorecard/${q.employeeId}`} style={{ fontSize: 13, fontWeight: 700 }}>
                    {showManager ? 'Open Scorecard' : 'Reply on their Scorecard'} →
                  </Link>
                  {showManager ? (
                    <span style={{ fontSize: 12.5, color: 'var(--grey-body)' }}>
                      {q.managerName
                        ? `${q.managerName} has to answer this`
                        : 'No manager on record — nobody can answer this'}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
