'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { YearStrip } from '@/components/YearStrip';
import { Card, SectionLabel } from '@/components/ui';
import {
  NOTE_BAND,
  achievementOf,
  blockers,
  outsideBand,
  weightedScoreOf,
  type EntryRow,
} from '@/lib/entries';
import { bandColour, pct } from '@/lib/score';
import type { TeamMemberRow } from '@/lib/team';
import type { MonthPoint } from '@/lib/types';

type ApiPayload = {
  employee: { id: string; name: string; title: string };
  cycle: { id: string; label: string; monthIndex: number; state: string };
  rows: EntryRow[];
  weightedScore: number | null;
  submission: { state: string; weightedScore: number | null; submittedAt: string | null } | null;
  editable: boolean;
  points: MonthPoint[];
};

type Draft = { actual: string; contextNote: string };

function toDraft(rows: EntryRow[]): Record<string, Draft> {
  return Object.fromEntries(
    rows.map((r) => [
      r.kpiId,
      { actual: r.actual === null ? '' : String(r.actual), contextNote: r.contextNote ?? '' },
    ]),
  );
}

export function EntryForm({
  employeeId,
  monthIndex,
  team = [],
}: {
  employeeId: string;
  monthIndex: number;
  /** Ordered roster this employee sits in — drives auto-advance and the "N of M" count. */
  team?: TeamMemberRow[];
}) {
  const router = useRouter();
  const [data, setData] = useState<ApiPayload | null>(null);
  const [draft, setDraft] = useState<Record<string, Draft>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'idle' | 'saving' | 'submitting'>('idle');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const currentIndex = useMemo(() => team.findIndex((m) => m.id === employeeId), [team, employeeId]);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setLoadError(null);
    setSaveError(null);
    setSavedAt(null);

    fetch(`/api/entries?employeeId=${encodeURIComponent(employeeId)}&monthIndex=${monthIndex}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
        return res.json() as Promise<ApiPayload>;
      })
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
        setDraft(toDraft(payload.rows));
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, [employeeId, monthIndex]);

  // Recompute against what is typed, so the score moves as you type rather than
  // waiting for a round trip.
  const rows = useMemo(() => {
    if (!data) return [];
    return data.rows.map((row) => {
      const d = draft[row.kpiId] ?? { actual: '', contextNote: '' };
      const value = d.actual.trim() === '' ? null : Number.parseFloat(d.actual);
      const actual = value !== null && Number.isFinite(value) ? value : null;
      const achievement = achievementOf(row.target, actual, row.lowerIsBetter);
      return {
        ...row,
        actual,
        contextNote: d.contextNote,
        achievement,
        needsNote: outsideBand(achievement),
      };
    });
  }, [data, draft]);

  const weighted = useMemo(() => weightedScoreOf(rows), [rows]);
  const check = useMemo(() => blockers(rows), [rows]);

  const update = useCallback((kpiId: string, patch: Partial<Draft>) => {
    setDraft((prev) => ({ ...prev, [kpiId]: { ...prev[kpiId], ...patch } }));
    setSavedAt(null);
  }, []);

  const persist = useCallback(
    async (submit: boolean) => {
      if (!data) return;
      setBusy(submit ? 'submitting' : 'saving');
      setSaveError(null);
      try {
        const res = await fetch('/api/entries', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            employeeId,
            monthIndex,
            submit,
            rows: rows.map((r) => ({
              kpiId: r.kpiId,
              actual: r.actual,
              contextNote: r.contextNote.trim() === '' ? null : r.contextNote,
            })),
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `Save failed (${res.status})`);
        setSavedAt(
          new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }),
        );
        if (submit) {
          setData((prev) =>
            prev
              ? { ...prev, submission: { state: 'SUBMITTED', weightedScore: body.weightedScore, submittedAt: new Date().toISOString() } }
              : prev,
          );
          // Auto-advance: after submitting one person, load the next outstanding
          // person directly rather than returning to the roster. Only a manager
          // has a team-shaped round to advance through.
          if (currentIndex !== -1) {
            const next = team.slice(currentIndex + 1).find((m) => m.status !== 'submitted');
            router.push(next ? `/performance-log?employee=${next.id}` : '/performance-log/done');
          }
        }
      } catch (error) {
        setSaveError((error as Error).message);
      } finally {
        setBusy('idle');
      }
    },
    [data, employeeId, monthIndex, rows, currentIndex, team, router],
  );

  const shell = (children: React.ReactNode) => (
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
      {children}
    </div>
  );

  if (loadError) {
    return shell(
      <div className="callout callout--alert" style={{ padding: '16px 20px' }}>
        <div className="callout__title">Could not load this month</div>
        <div style={{ fontSize: 14 }}>{loadError}</div>
      </div>,
    );
  }

  if (!data) {
    return shell(
      <div style={{ fontSize: 14.5, color: 'var(--grey-body)' }}>Loading the month…</div>,
    );
  }

  const submitted = data.submission?.state === 'SUBMITTED';
  const editable = data.editable;

  return shell(
    <>
      <div className="spread" style={{ alignItems: 'flex-start', gap: 24 }}>
        <div className="stack" style={{ gap: 4 }}>
          <div style={{ fontSize: 23, fontWeight: 600, color: 'var(--navy)' }}>
            {data.employee.name}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
            {data.employee.title} · {data.employee.id} · {data.cycle.label}
          </div>
        </div>
        <div className="row" style={{ gap: 10, flex: 'none' }}>
          {currentIndex !== -1 ? (
            <span
              className="num"
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--navy)',
                background: 'var(--grey-surface)',
                borderRadius: 'var(--radius)',
                padding: '4px 10px',
              }}
            >
              {currentIndex + 1} of {team.length}
            </span>
          ) : null}
          <span style={{ fontSize: 13, color: 'var(--grey-body)' }}>
            {savedAt ? `Saved ${savedAt}` : submitted ? 'Submitted' : 'Not saved yet'}
          </span>
          <Link href={`/scorecard/${employeeId}`} style={{ fontSize: 13.5, fontWeight: 700 }}>
            Open Scorecard
          </Link>
        </div>
      </div>

      {!editable ? (
        <div className="callout callout--neutral" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>
            {data.cycle.label} is {data.cycle.state.toLowerCase()}. This month is read-only.
          </div>
          <div style={{ fontSize: 14, color: 'var(--grey-body)', marginTop: 4 }}>
            To change a figure here, raise a correction request.
          </div>
        </div>
      ) : null}

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
                <th className="is-num" style={{ padding: '10px 10px', width: 74 }}>Weight</th>
                <th className="is-num" style={{ padding: '10px 10px', width: 96 }}>Target</th>
                <th className="is-num" style={{ padding: '10px 10px', width: 118 }}>Actual</th>
                <th className="is-num" style={{ padding: '10px 10px', width: 110 }}>Achievement</th>
                <th style={{ padding: '10px 14px', width: 290 }}>Context note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const noteGiven = row.contextNote.trim().length > 0;
                const flag = row.needsNote && !noteGiven;
                return (
                  <tr key={row.kpiId}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{row.name}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--grey-body)' }}>
                        {row.basis}
                        {row.lowerIsBetter ? (
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
                    <td className="is-num" style={{ padding: '12px 10px' }}>{row.weight}%</td>
                    <td className="is-num" style={{ padding: '12px 10px' }}>{row.target}</td>
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
                        aria-label={`${row.name} actual`}
                        disabled={!editable}
                        value={draft[row.kpiId]?.actual ?? ''}
                        onChange={(e) => update(row.kpiId, { actual: e.target.value })}
                      />
                    </td>
                    <td
                      className="is-num"
                      style={{
                        padding: '12px 10px',
                        fontWeight: 700,
                        color:
                          row.achievement === null
                            ? 'var(--grey-line)'
                            : bandColour(row.achievement),
                      }}
                    >
                      {pct(row.achievement)}
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
                        aria-label={`${row.name} context note`}
                        disabled={!editable}
                        placeholder={
                          row.needsNote
                            ? `Required — outside ${NOTE_BAND.low}–${NOTE_BAND.high}%`
                            : 'Optional'
                        }
                        value={draft[row.kpiId]?.contextNote ?? ''}
                        onChange={(e) => update(row.kpiId, { contextNote: e.target.value })}
                      />
                      {flag ? (
                        <div style={{ marginTop: 5, fontSize: 12.5, fontWeight: 700, color: 'var(--red)' }}>
                          Context note required before submitting
                        </div>
                      ) : null}
                      {row.needsNote && noteGiven ? (
                        <div style={{ marginTop: 5, fontSize: 12.5, color: 'var(--green)' }}>
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
                  <SectionLabel>Weighted score · {data.cycle.label}</SectionLabel>
                  <div style={{ fontSize: 13, color: 'var(--grey-body)', marginTop: 3 }}>
                    Sum of weight × achievement across 100% of KRAs
                  </div>
                </td>
                <td style={{ padding: '16px 10px', textAlign: 'right' }} colSpan={2}>
                  <div className="num" style={{ fontSize: 34, fontWeight: 600, color: 'var(--navy)', lineHeight: 1 }}>
                    {weighted === null ? '—' : weighted.toFixed(1)}
                  </div>
                </td>
                <td style={{ padding: '16px 10px', textAlign: 'right' }} colSpan={2}>
                  <div className="stack" style={{ alignItems: 'flex-end', gap: 10 }}>
                    {saveError ? (
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>
                        {saveError}
                      </div>
                    ) : check.blocked ? (
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>
                        {check.missingActuals > 0
                          ? `${check.missingActuals} actual${check.missingActuals === 1 ? '' : 's'} still to enter`
                          : `${check.missingNotes} context note${check.missingNotes === 1 ? '' : 's'} required before submitting`}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: 'var(--green)' }}>
                        {submitted
                          ? `${data.cycle.label} submitted`
                          : 'All exceptions explained — ready to submit'}
                      </div>
                    )}
                    <div className="row" style={{ gap: 10 }}>
                      <button
                        type="button"
                        className="btn btn--secondary"
                        style={{ fontSize: 14.5, padding: '10px 18px' }}
                        disabled={!editable || busy !== 'idle'}
                        onClick={() => persist(false)}
                      >
                        {busy === 'saving' ? 'Saving…' : 'Save draft'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--primary"
                        style={{ fontSize: 14.5 }}
                        disabled={!editable || check.blocked || busy !== 'idle'}
                        onClick={() => persist(true)}
                      >
                        {busy === 'submitting' ? 'Submitting…' : `Submit ${data.cycle.label.split(' ')[0]}`}
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
                points={data.points}
                label={`${data.employee.name}, twelve months`}
              />
              <div style={{ fontSize: 12.5, color: 'var(--grey-body)', lineHeight: 1.45 }}>
                This employee's real submitted months. The open month updates as it's
                logged.
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
              </div>
              <span
                style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--grey-line)' }}
                title="Spreadsheet upload doesn't parse or commit a real file yet"
              >
                Switch to spreadsheet upload
              </span>
            </div>
          </Card>
        </div>
      </div>
    </>,
  );
}
