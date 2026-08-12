import Link from 'next/link';
import { SectionLabel } from '@/components/ui';
import { bandColour } from '@/lib/score';
import type { TeamMemberRow } from '@/lib/team';
import styles from './TeamRail.module.css';

/** The roster beside the entry form. `activeId` is the person being edited. */
export function TeamRail({ activeId, team }: { activeId: string; team: TeamMemberRow[] }) {
  const logged = team.filter((m) => m.status === 'submitted').length;

  return (
    <aside className={styles.rail} aria-label="Team">
      <div className={styles.railHead}>
        <SectionLabel>
          Team · {logged} of {team.length} done
        </SectionLabel>
      </div>

      {team.map((member) => {
        const active = member.id === activeId;
        const body = (
          <>
            <span className={styles.who}>
              <span className={styles.name}>{member.name}</span>
              <span className={styles.title}>{member.title}</span>
            </span>
            {active ? (
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: 'var(--cyan)',
                  background: 'var(--tint-blue)',
                  borderRadius: 'var(--radius)',
                  padding: '3px 8px',
                  flex: 'none',
                }}
              >
                Editing
              </span>
            ) : (
              <span
                className={styles.score}
                style={{
                  color:
                    member.score === null ? 'var(--grey-line)' : bandColour(member.score),
                }}
              >
                {member.score === null ? '—' : member.score.toFixed(1)}
              </span>
            )}
          </>
        );

        return active ? (
          <div
            key={member.id}
            className={`${styles.person} ${styles.personActive}`}
            aria-current="true"
          >
            {body}
          </div>
        ) : (
          <Link
            key={member.id}
            href={`/performance-log?employee=${member.id}`}
            className={styles.person}
          >
            {body}
          </Link>
        );
      })}

      <div className={styles.spacer} />

      <div className={styles.foot}>
        Tracking in Excel?{' '}
        <span
          style={{ fontWeight: 700, color: 'var(--grey-line)' }}
          title="Spreadsheet upload doesn't parse or commit a real file yet"
        >
          Upload the sheet
        </span>{' '}
        and skip this form.
      </div>
    </aside>
  );
}
