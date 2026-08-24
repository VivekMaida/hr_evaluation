import Link from 'next/link';
import type { ReactNode } from 'react';
import { Card, SectionLabel } from '@/components/ui';
import type { RosterRow } from '@/lib/roster';

/**
 * One column of the roster table, past the person. The name column is built
 * in — it is the link into the record, and it reads the same on every index —
 * so callers only describe what is theirs: Scorecard wants this month and the
 * year strip, Reviews wants the annual figure and its band.
 */
export type RosterColumn = {
  header: ReactNode;
  /** Right-aligns and switches to tabular figures. */
  numeric?: boolean;
  width?: number;
  cell: (row: RosterRow) => ReactNode;
};

/**
 * The team-scoped index shared by /scorecard and /reviews: the people the
 * signed-in person can see, one row each, the name linking to that person's
 * record. Nothing here is editable and nothing is a summary of the group —
 * it exists to get you to a record, which is what the two screens it fronts
 * used to do by guessing at one report and opening it directly.
 */
export function RosterIndex({
  rows,
  hrefFor,
  columns,
  caption,
  aside,
  showOrg = false,
}: {
  rows: RosterRow[];
  /** Where a person's name goes. */
  hrefFor: (row: RosterRow) => string;
  columns: RosterColumn[];
  /** The label over the table — who this list is. */
  caption: string;
  /** Optional line opposite the caption, for a count or a warning. */
  aside?: ReactNode;
  /**
   * Show department and reporting line under each name. On for HR, whose list
   * is the whole company and where "which Rohit Verma" is a real question; off
   * for a manager, whose rows all report to them and mostly sit in one
   * department, making both lines noise.
   */
  showOrg?: boolean;
}) {
  return (
    <Card style={{ padding: '20px 24px 22px' }}>
      <div className="spread" style={{ alignItems: 'baseline', marginBottom: 16 }}>
        <SectionLabel>{caption}</SectionLabel>
        {aside ? (
          <div style={{ fontSize: 13, color: 'var(--grey-body)', flex: 'none' }}>{aside}</div>
        ) : null}
      </div>

      <table className="data-table" style={{ fontSize: 14.5 }}>
        <thead>
          <tr>
            <th style={{ padding: '9px 12px' }}>Employee</th>
            {columns.map((column, i) => (
              <th
                key={i}
                className={column.numeric ? 'is-num' : undefined}
                style={{ padding: '9px 12px', width: column.width }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td style={{ padding: '10px 12px' }}>
                <Link href={hrefFor(row)} style={{ fontWeight: 700 }}>
                  {row.name}
                </Link>
                <div style={{ fontSize: 12.5, color: 'var(--grey-body)' }}>
                  {row.title} · {row.id}
                </div>
                {showOrg ? (
                  <div style={{ fontSize: 12.5, color: 'var(--grey-line)' }}>
                    {row.department} · reports to {row.leadName ?? 'nobody on record'}
                  </div>
                ) : null}
              </td>
              {columns.map((column, i) => (
                <td
                  key={i}
                  className={column.numeric ? 'is-num' : undefined}
                  style={{ padding: '10px 12px' }}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
