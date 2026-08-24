'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { Card, Chip, SectionLabel } from '@/components/ui';
import type {
  AcceptedRow,
  BlankRow,
  EmployeeOutcome,
  RejectedRow,
  TemplateSubject,
} from '@/lib/upload';
import { UploadStepper, type UploadStep } from './UploadStepper';

type CommittedEmployee = {
  employeeId: string;
  employeeName: string;
  rowsWritten: number;
  submitted: boolean;
  weightedScore: number | null;
};

type Report = {
  stage: 'validated' | 'committed';
  accepted: AcceptedRow[];
  blank: BlankRow[];
  rejected: RejectedRow[];
  employees: EmployeeOutcome[];
  committed?: CommittedEmployee[];
};

/** What the template preview shows, flattened on the server. */
export type PreviewRow = {
  employeeId: string;
  employeeName: string;
  kra: string;
  weight: number;
  target: number;
  unit: string;
};

const CELL = { padding: '9px 12px' } as const;

function Num({ value }: { value: number | null }) {
  return <span className="num">{value === null ? '—' : value.toFixed(1)}</span>;
}

export function UploadFlow({
  cycleLabel,
  subjects,
  preview,
}: {
  cycleLabel: string;
  subjects: TemplateSubject[];
  preview: PreviewRow[];
}) {
  const [step, setStep] = useState<UploadStep>('download');
  const [report, setReport] = useState<Report | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csv, setCsv] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [correctionsHref, setCorrectionsHref] = useState<string | null>(null);
  const [busy, setBusy] = useState<'idle' | 'checking' | 'committing'>('idle');
  const fileInput = useRef<HTMLInputElement>(null);

  async function send(text: string, name: string, commit: boolean) {
    setError(null);
    setCorrectionsHref(null);
    setBusy(commit ? 'committing' : 'checking');
    try {
      const res = await fetch('/api/entries/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: text, fileName: name, commit }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? 'That upload could not be read.');
        setCorrectionsHref(body.correctionsHref ?? null);
        return;
      }
      setReport(body as Report);
      setStep(commit ? 'confirmed' : 'validate');
    } catch {
      setError('Could not reach the server. Nothing has been saved.');
    } finally {
      setBusy('idle');
    }
  }

  async function onFile(file: File) {
    const text = await file.text();
    setFileName(file.name);
    setCsv(text);
    await send(text, file.name, false);
  }

  function startOver() {
    setReport(null);
    setCsv(null);
    setFileName(null);
    setError(null);
    setCorrectionsHref(null);
    setStep('download');
    if (fileInput.current) fileInput.current.value = '';
  }

  const totalRows = report ? report.accepted.length + report.blank.length + report.rejected.length : 0;

  return (
    <div className="stack" style={{ gap: 18, padding: '22px 36px 34px' }}>
      <UploadStepper step={step} />

      {error ? (
        <div className="callout callout--alert" role="alert" style={{ padding: '14px 18px' }}>
          <div className="callout__title">Nothing has been saved</div>
          <div style={{ fontSize: 14, lineHeight: 1.55 }}>
            {error}
            {correctionsHref ? (
              <>
                {' '}
                <Link href={correctionsHref} style={{ fontWeight: 700 }}>
                  Open corrections
                </Link>
                .
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ---------------------------------------------------------------- 1 */}
      {step === 'download' ? (
        <>
          <Card style={{ padding: '20px 24px 22px' }}>
            <div className="stack" style={{ gap: 12 }}>
              <SectionLabel>Step 1 · The template</SectionLabel>
              <div style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--grey-body)', maxWidth: '80ch' }}>
                One row per KRA per person, for {cycleLabel}. Everything except{' '}
                <strong style={{ color: 'var(--navy)' }}>Actual</strong> and{' '}
                <strong style={{ color: 'var(--navy)' }}>Context note</strong> is filled in for you
                and is read-only in effect: weight, target and unit come from the KRA set when the
                file is read back, so editing them in the sheet changes nothing. Rows are matched
                on <strong style={{ color: 'var(--navy)' }}>Employee ID</strong>, never on name, so
                that column has to survive the round trip intact.
              </div>
              <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
                <a
                  href="/api/entries/template"
                  download
                  className="btn btn--primary"
                  style={{ textDecoration: 'none' }}
                >
                  Download template
                </a>
                <span className="num" style={{ fontSize: 13, color: 'var(--grey-body)' }}>
                  {preview.length} row{preview.length === 1 ? '' : 's'} · {subjects.length}{' '}
                  {subjects.length === 1 ? 'person' : 'people'}
                </span>
              </div>
            </div>
          </Card>

          <Card style={{ padding: '20px 24px 22px' }}>
            <SectionLabel tone="navy">Exactly what you are about to download</SectionLabel>
            <div style={{ overflowX: 'auto', marginTop: 12 }}>
              <table className="data-table" style={{ fontSize: 13.5 }}>
                <thead>
                  <tr>
                    <th style={CELL}>Employee ID</th>
                    <th style={CELL}>Employee</th>
                    <th style={CELL}>KRA</th>
                    <th className="is-num" style={CELL}>Weight %</th>
                    <th className="is-num" style={CELL}>Target</th>
                    <th style={CELL}>Unit</th>
                    <th style={CELL}>Actual</th>
                    <th style={CELL}>Context note</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row) => (
                    <tr key={`${row.employeeId}:${row.kra}`}>
                      <td className="num" style={{ ...CELL, fontWeight: 700, color: 'var(--navy)' }}>
                        {row.employeeId}
                      </td>
                      <td style={CELL}>{row.employeeName}</td>
                      <td style={CELL}>{row.kra}</td>
                      <td className="is-num" style={CELL}>{row.weight}</td>
                      <td className="is-num" style={CELL}>{row.target}</td>
                      <td style={CELL}>{row.unit || '—'}</td>
                      <td style={{ ...CELL, background: 'var(--tint-blue)' }} />
                      <td style={{ ...CELL, background: 'var(--tint-blue)' }} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card style={{ padding: '20px 24px 22px' }}>
            <div className="stack" style={{ gap: 12 }}>
              <SectionLabel>Step 2 · Upload the filled file</SectionLabel>
              <div style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--grey-body)', maxWidth: '80ch' }}>
                Nothing is saved when you upload. You get a report of what would be written and
                what would be refused, and the record only changes once you confirm it.
              </div>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv"
                className="field"
                style={{ maxWidth: 420, fontSize: 14 }}
                disabled={busy !== 'idle'}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onFile(file);
                }}
              />
              {busy === 'checking' ? (
                <div style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>Checking the file…</div>
              ) : null}
            </div>
          </Card>
        </>
      ) : null}

      {/* ---------------------------------------------------------------- 2 */}
      {step === 'validate' && report ? (
        <>
          <Card tone={report.rejected.length > 0 ? 'amber' : 'green'} style={{ padding: '20px 24px 22px' }}>
            <div className="stack" style={{ gap: 10 }}>
              <div className="spread" style={{ alignItems: 'baseline', gap: 16 }}>
                <SectionLabel tone={report.rejected.length > 0 ? 'amber' : 'green'}>
                  Nothing has been saved yet
                </SectionLabel>
                <span className="num" style={{ fontSize: 13, color: 'var(--grey-body)' }}>
                  {fileName}
                </span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>
                {report.accepted.length} of {totalRows} row{totalRows === 1 ? '' : 's'} would be
                written
                {report.rejected.length > 0 ? `, ${report.rejected.length} refused` : ''}
                {report.blank.length > 0 ? `, ${report.blank.length} left blank` : ''}.
              </div>
              {report.rejected.length > 0 ? (
                <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--grey-body)', maxWidth: '82ch' }}>
                  Confirming writes the {report.accepted.length} row
                  {report.accepted.length === 1 ? '' : 's'} that passed and leaves the refused ones
                  out. They are listed below with the reason, and you can fix them in the sheet and
                  upload again, or type them into the form.
                </div>
              ) : null}
            </div>
          </Card>

          {report.employees.length > 0 ? (
            <Card style={{ padding: '20px 24px 22px' }}>
              <SectionLabel>What this does to each person&rsquo;s month</SectionLabel>
              <div style={{ overflowX: 'auto', marginTop: 12 }}>
                <table className="data-table" style={{ fontSize: 14 }}>
                  <thead>
                    <tr>
                      <th style={CELL}>Employee</th>
                      <th className="is-num" style={CELL}>Rows in</th>
                      <th className="is-num" style={CELL}>Refused</th>
                      <th className="is-num" style={CELL}>Score</th>
                      <th style={CELL}>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.employees.map((e) => (
                      <tr key={e.employeeId}>
                        <td style={{ ...CELL, verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{e.employeeName}</div>
                          <div className="num" style={{ fontSize: 12.5, color: 'var(--grey-body)' }}>
                            {e.employeeId}
                          </div>
                        </td>
                        <td className="is-num" style={{ ...CELL, verticalAlign: 'middle' }}>
                          {e.acceptedRows}
                        </td>
                        <td
                          className="is-num"
                          style={{
                            ...CELL,
                            verticalAlign: 'middle',
                            color: e.rejectedRows > 0 ? 'var(--red)' : undefined,
                            fontWeight: e.rejectedRows > 0 ? 700 : 400,
                          }}
                        >
                          {e.rejectedRows}
                        </td>
                        <td className="is-num" style={{ ...CELL, verticalAlign: 'middle' }}>
                          <Num value={e.weightedScore} />
                        </td>
                        <td style={{ ...CELL, verticalAlign: 'middle' }}>
                          {e.willSubmit ? (
                            <Chip tone="green" tight>
                              Submits the month
                            </Chip>
                          ) : (
                            <>
                              <Chip tone="amber" tight>
                                Saves as a draft
                              </Chip>
                              <div style={{ fontSize: 12.5, color: 'var(--grey-body)', marginTop: 4 }}>
                                {e.missingActuals > 0
                                  ? `${e.missingActuals} KRA${e.missingActuals === 1 ? '' : 's'} still without a figure`
                                  : null}
                                {e.missingActuals > 0 && e.missingNotes > 0 ? ' · ' : null}
                                {e.missingNotes > 0
                                  ? `${e.missingNotes} context note${e.missingNotes === 1 ? '' : 's'} still needed`
                                  : null}
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          {report.rejected.length > 0 ? (
            <RejectedTable rows={report.rejected} />
          ) : null}

          {report.accepted.length > 0 ? <AcceptedTable rows={report.accepted} /> : null}

          <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn--primary btn--large"
              disabled={busy !== 'idle' || report.accepted.length === 0}
              onClick={() => csv && fileName && void send(csv, fileName, true)}
            >
              {busy === 'committing'
                ? 'Writing…'
                : `Confirm and write ${report.accepted.length} row${report.accepted.length === 1 ? '' : 's'}`}
            </button>
            <button type="button" className="btn btn--secondary" onClick={startOver} disabled={busy !== 'idle'}>
              Start again
            </button>
            {report.accepted.length === 0 ? (
              <span style={{ fontSize: 13.5, color: 'var(--red)', fontWeight: 700, alignSelf: 'center' }}>
                Nothing in this file can be written, so there is nothing to confirm.
              </span>
            ) : null}
          </div>
        </>
      ) : null}

      {/* ---------------------------------------------------------------- 3 */}
      {step === 'confirmed' && report ? (
        <>
          <Card tone={report.rejected.length > 0 ? 'amber' : 'green'} style={{ padding: '20px 24px 22px' }}>
            <div className="stack" style={{ gap: 10 }}>
              <SectionLabel tone={report.rejected.length > 0 ? 'amber' : 'green'}>
                Written to the record
              </SectionLabel>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>
                {report.accepted.length} row{report.accepted.length === 1 ? '' : 's'} committed for{' '}
                {cycleLabel}
                {report.rejected.length > 0
                  ? `, ${report.rejected.length} skipped`
                  : ''}
                .
              </div>
              {(report.committed ?? []).some((c) => c.submitted) ? (
                <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--grey-body)' }}>
                  A month whose KRAs are all filled in and inside the note rules has been submitted.
                  Anything short of that is saved as a draft and stays open in the form.
                </div>
              ) : null}
            </div>
          </Card>

          {(report.committed ?? []).length > 0 ? (
            <Card style={{ padding: '20px 24px 22px' }}>
              <SectionLabel>What committed</SectionLabel>
              <div style={{ overflowX: 'auto', marginTop: 12 }}>
                <table className="data-table" style={{ fontSize: 14 }}>
                  <thead>
                    <tr>
                      <th style={CELL}>Employee</th>
                      <th className="is-num" style={CELL}>Rows</th>
                      <th className="is-num" style={CELL}>Score</th>
                      <th style={CELL}>State</th>
                      <th style={{ ...CELL, textAlign: 'right' }}>Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.committed ?? []).map((c) => (
                      <tr key={c.employeeId}>
                        <td style={{ ...CELL, verticalAlign: 'middle', fontWeight: 700, color: 'var(--navy)' }}>
                          {c.employeeName}
                        </td>
                        <td className="is-num" style={{ ...CELL, verticalAlign: 'middle' }}>
                          {c.rowsWritten}
                        </td>
                        <td className="is-num" style={{ ...CELL, verticalAlign: 'middle' }}>
                          <Num value={c.weightedScore} />
                        </td>
                        <td style={{ ...CELL, verticalAlign: 'middle' }}>
                          <Chip tone={c.submitted ? 'green' : 'amber'} tight>
                            {c.submitted ? 'Submitted' : 'Draft'}
                          </Chip>
                        </td>
                        <td style={{ ...CELL, verticalAlign: 'middle', textAlign: 'right' }}>
                          <Link
                            href={`/performance-log?employee=${encodeURIComponent(c.employeeId)}`}
                            style={{ fontSize: 13.5, fontWeight: 700 }}
                          >
                            Form
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          {report.rejected.length > 0 ? (
            <RejectedTable rows={report.rejected} skipped />
          ) : null}

          <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
            <Link href="/performance-log" className="btn btn--primary" style={{ textDecoration: 'none' }}>
              Back to form entry
            </Link>
            <button type="button" className="btn btn--secondary" onClick={startOver}>
              Upload another file
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function AcceptedTable({ rows }: { rows: AcceptedRow[] }) {
  return (
    <Card style={{ padding: '20px 24px 22px' }}>
      <SectionLabel tone="green">Rows that passed</SectionLabel>
      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <table className="data-table" style={{ fontSize: 13.5 }}>
          <thead>
            <tr>
              <th className="is-num" style={CELL}>Line</th>
              <th style={CELL}>Employee</th>
              <th style={CELL}>KRA</th>
              <th className="is-num" style={CELL}>Actual</th>
              <th className="is-num" style={CELL}>Achievement</th>
              <th style={CELL}>Context note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.line}`}>
                <td className="is-num" style={CELL}>{r.line}</td>
                <td style={CELL}>
                  {r.employeeName}{' '}
                  <span className="num" style={{ color: 'var(--grey-body)', fontSize: 12.5 }}>
                    {r.employeeId}
                  </span>
                </td>
                <td style={CELL}>{r.kra}</td>
                <td className="is-num" style={CELL}>{r.actual}</td>
                <td className="is-num" style={CELL}>
                  {r.achievement === null ? '—' : `${r.achievement.toFixed(0)}%`}
                </td>
                <td style={{ ...CELL, color: 'var(--grey-body)' }}>{r.contextNote ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function RejectedTable({ rows, skipped = false }: { rows: RejectedRow[]; skipped?: boolean }) {
  return (
    <Card tone="red" style={{ padding: '20px 24px 22px' }}>
      <SectionLabel tone="red">
        {skipped ? 'Skipped — not written' : 'Rows that would be refused'}
      </SectionLabel>
      <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--grey-body)', marginTop: 6, maxWidth: '82ch' }}>
        Line numbers match the file as your spreadsheet shows it, header counted, so you can go
        straight to the row and fix it.
      </div>
      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <table className="data-table" style={{ fontSize: 13.5 }}>
          <thead>
            <tr>
              <th className="is-num" style={CELL}>Line</th>
              <th style={CELL}>Employee ID</th>
              <th style={CELL}>KRA</th>
              <th className="is-num" style={CELL}>Actual</th>
              <th style={CELL}>Why</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.line}`}>
                <td className="is-num" style={CELL}>{r.line}</td>
                <td className="num" style={CELL}>{r.employeeId || '—'}</td>
                <td style={CELL}>{r.kra || '—'}</td>
                <td className="is-num" style={CELL}>{r.actual || '—'}</td>
                <td style={{ ...CELL, color: 'var(--navy)' }}>{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
