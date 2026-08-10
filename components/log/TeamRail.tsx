import Link from 'next/link';
import { SectionLabel } from '@/components/ui';
import { TEAM, TEAM_SUMMARY } from '@/lib/data';
import { bandColour } from '@/lib/score';
import styles from './TeamRail.module.css';

/** The roster beside the entry form. `activeId` is the person being edited. */
export function TeamRail({ activeId }: { activeId: string }) {
  return (
    <aside className={styles.rail} aria-label="Team">
      <div className={styles.railHead}>
        <SectionLabel>
          Team · {TEAM_SUMMARY.logged} of {TEAM_SUMMARY.total} done
        </SectionLabel>
      </div>

      {TEAM.map((member) => {
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
        <Link href="/performance-log/upload" style={{ fontWeight: 700 }}>
          Upload the sheet
        </Link>{' '}
        and skip this form.
      </div>
    </aside>
  );
}
