'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { YearStrip } from '@/components/YearStrip';
import { Card, SectionLabel } from '@/components/ui';
import {
  ENTRY_KRAS,
  ENTRY_SUBJECT,
  NOTE_BAND,
  buildYear,
  memberById,
  type KraRow,
} from '@/lib/data';
import { bandColour, pct } from '@/lib/score';

type RowState = { actual: string; note: string };

function achievementOf(row: KraRow, actual: string): number | null {
  const value = Number.parseFloat(actual);
  if (!Number.isFinite(value)) return null;
  if (row.lowerIsBetter) {
    if (value === 0) return null;
    return (row.target / value) * 100;
  }
  if (row.target === 0) return null;
  return (value / row.target) * 100;
}

function outsideBand(achievement: number | null): boolean {
  if (achievement === null) return false;
  return achievement < NOTE_BAND.low || achievement > NOTE_BAND.high;
}

export function EntryForm() {
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      ENTRY_KRAS.map((k) => [k.id, { actual: k.actual, note: k.note }]),
    ),
  );
  const [submitted, setSubmitted] = useState(false);

  const computed = useMemo(
    () =>
      ENTRY_KRAS.map((kra) => {
        const state = rows[kra.id];
        const achievement = achievementOf(kra, state.actual);
        const needsNote = outsideBand(achievement);
        const noteGiven = state.note.trim().length > 0;
        return {
          kra,
          state,
          achievement,
          needsNote,
          noteGiven,
          blocking: (needsNote && !noteGiven) || achievement === null,
        };
      }),
    [rows],
  );

  const weighted = useMemo(() => {
    let sum = 0;
    let base = 0;
    for (const row of computed) {
      if (row.achievement === null) continue;
      sum += row.achievement * row.kra.weight;
      base += row.kra.weight;
    }
    return base === 0 ? null : sum / base;
  }, [computed]);

  const missingActuals = computed.filter((r) => r.achievement === null).length;
  const missingNotes = computed.filter((r) => r.needsNote && !r.noteGiven).length;
  const blocked = missingActuals > 0 || missingNotes > 0;

  const blockedMessage =
    missingActuals > 0
      ? `${missingActuals} actual${missingActuals === 1 ? '' : 's'} still to enter`
      : `${missingNotes} context note${missingNotes === 1 ? '' : 's'} required before submitting`;

  const update = (id: string, patch: Partial<RowState>) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const member = memberById(ENTRY_SUBJECT.id);

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        padding: '22px 30px 26px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        background: 'var(--white)',
      }}
    >
      <div
        className="spread"
        style={{ alignItems: 'flex-start', gap: 24 }}
      >
        <div className="stack" style={{ gap: 4 }}>
          <div style={{ fontSize: 23, fontWeight: 600, color: 'var(--navy)' }}>
            {ENTRY_SUBJECT.name}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
            {ENTRY_SUBJECT.title} · {ENTRY_SUBJECT.id} · Reports to{' '}
            {ENTRY_SUBJECT.reportsTo} · {ENTRY_SUBJECT.kraSet}
          </div>
        </div>
        <div className="row" style={{ gap: 10, flex: 'none' }}>
          <span style={{ fontSize: 13, color: 'var(--grey-body)' }}>
            Draft saved {ENTRY_SUBJECT.draftSavedAt}
          </span>
          <Link href="/scorecard/EMP-10233" style={{ fontSize: 13.5, fontWeight: 700 }}>
            Previous month
          </Link>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 268px',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <Card className="card--flush" style={{ overflow: 'hidden' }}>
          <table className="data-table" style={{ fontSize: 14.5 }}>
            <thead>
              <tr>
                <th style={{ padding: '10px 14px' }}>Key result area</th>
                <th className="is-num" style={{ padding: '10px 10px', width: 74 }}>
                  Weight
                </th>
                <th className="is-num" style={{ padding: '10px 10px', width: 96 }}>
                  Target
                </th>
                <th className="is-num" style={{ padding: '10px 10px', width: 118 }}>
                  Actual
                </th>
                <th className="is-num" style={{ padding: '10px 10px', width: 110 }}>
                  Achievement
                </th>
                <th style={{ padding: '10px 14px', width: 290 }}>Context note</th>
              </tr>
            </thead>
            <tbody>
              {computed.map(({ kra, state, achievement, needsNote, noteGiven }) => {
                const flag = needsNote && !noteGiven;
                return (
                  <tr key={kra.id}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--navy)' }}>
                        {kra.name}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--grey-body)' }}>
                        {kra.basis}
                        {kra.lowerIsBetter ? (
                          <>
                            {' · '}
                            <span style={{ color: 'var(--amber)', fontWeight: 700 }}>
                              lower is better
                            </span>{' '}
                            — scored target ÷ actual
                          </>
                        ) : null}
                      </div>
                    </td>
                    <td className="is-num" style={{ padding: '12px 10px' }}>
                      {kra.weight}%
                    </td>
                    <td className="is-num" style={{ padding: '12px 10px' }}>
                      {kra.target}
                    </td>
                    <td style={{ padding: '9px 10px' }}>
                      <input
                        className="field field--num"
                        style={{
                          width: '100%',
                          fontSize: 14.5,
                          fontWeight: 700,
                          borderColor: flag ? 'var(--red)' : 'var(--grey-line)',
                        }}
                        inputMode="decimal"
                        aria-label={`${kra.name} actual`}
                        value={state.actual}
                        onChange={(e) => update(kra.id, { actual: e.target.value })}
                      />
                    </td>
                    <td
                      className="is-num"
                      style={{
                        padding: '12px 10px',
                        fontWeight: 700,
                        color:
                          achievement === null
                            ? 'var(--grey-line)'
                            : bandColour(achievement),
                      }}
                    >
                      {pct(achievement)}
                    </td>
                    <td style={{ padding: '9px 14px' }}>
                      <input
                        className="field"
                        style={{
                          width: '100%',
                          fontSize: 13.5,
                          color: 'var(--grey-body)',
                          fontWeight: 400,
                          borderColor: flag ? 'var(--red)' : 'var(--grey-line)',
                        }}
                        aria-label={`${kra.name} context note`}
                        placeholder={
                          needsNote
                            ? `Required — outside ${NOTE_BAND.low}–${NOTE_BAND.high}%`
                            : 'Optional'
                        }
                        value={state.note}
                        onChange={(e) => update(kra.id, { note: e.target.value })}
                      />
                      {flag ? (
                        <div
                          style={{
                            marginTop: 5,
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: 'var(--red)',
                          }}
                        >
                          Context note required before submitting
                        </div>
                      ) : null}
                      {needsNote && noteGiven ? (
                        <div
                          style={{ marginTop: 5, fontSize: 12.5, color: 'var(--green)' }}
                        >
                          Note recorded
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--panel)', borderTop: '2px solid var(--navy)' }}>
                <td style={{ padding: '16px 14px' }} colSpan={2}>
                  <SectionLabel>Weighted score · February</SectionLabel>
                  <div style={{ fontSize: 13, color: 'var(--grey-body)', marginTop: 3 }}>
                    Sum of weight × achievement across 100% of KRAs
                  </div>
                </td>
                <td style={{ padding: '16px 10px', textAlign: 'right' }} colSpan={2}>
                  <div
                    className="num"
                    style={{
                      fontSize: 34,
                      fontWeight: 600,
                      color: 'var(--navy)',
                      lineHeight: 1,
                    }}
                  >
                    {weighted === null ? '—' : weighted.toFixed(1)}
                  </div>
                </td>
                <td style={{ padding: '16px 10px', textAlign: 'right' }} colSpan={2}>
                  <div
                    className="stack"
                    style={{ alignItems: 'flex-end', gap: 10 }}
                  >
                    {blocked ? (
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>
                        {blockedMessage}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: 'var(--green)' }}>
                        {submitted
                          ? 'February submitted'
                          : 'All exceptions explained — ready to submit'}
                      </div>
                    )}
                    <div className="row" style={{ gap: 10 }}>
                      <button
                        type="button"
                        className="btn btn--secondary"
                        style={{ fontSize: 14.5, padding: '10px 18px' }}
                      >
                        Save draft
                      </button>
                      <button
                        type="button"
                        className="btn btn--primary"
                        style={{ fontSize: 14.5 }}
                        disabled={blocked || submitted}
                        onClick={() => setSubmitted(true)}
                      >
                        Submit February
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </Card>

        <div className="stack" style={{ gap: 16 }}>
          <Card tone="navy" style={{ padding: '18px 20px 20px' }}>
            <div className="stack" style={{ gap: 12 }}>
              <SectionLabel tone="navy">12-month record</SectionLabel>
              <YearStrip
                size="medium"
                points={buildYear(member?.closed ?? [])}
                label={`${ENTRY_SUBJECT.name}, twelve months`}
              />
              <div className="spread" style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
                <span>{ENTRY_SUBJECT.monthsLogged} months logged</span>
                <span className="num" style={{ color: 'var(--navy)', fontWeight: 700 }}>
                  Avg {ENTRY_SUBJECT.average.toFixed(1)}
                </span>
              </div>
            </div>
          </Card>

          <div className="callout callout--info" style={{ padding: '16px 18px' }}>
            <div className="callout__title">Why the note matters</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--grey-body)' }}>
              Notes on outlier months are carried into the annual review verbatim. This is
              the evidence the appraisal is built on.
            </div>
          </div>

          <Card style={{ padding: '18px 20px 20px' }}>
            <div className="stack" style={{ gap: 10 }}>
              <SectionLabel>Entry routes</SectionLabel>
              <div style={{ fontSize: 13.5, lineHeight: 1.55 }}>
                You are on <strong style={{ color: 'var(--navy)' }}>form entry</strong>.
                Teams that already track in Excel can upload the monthly sheet instead —
                same KRAs, same validation, same context-note rule.
              </div>
              <Link
                href="/performance-log/upload"
                style={{ fontSize: 13.5, fontWeight: 700 }}
              >
                Switch to spreadsheet upload
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
