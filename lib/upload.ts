import { CSV_BOM, parseCsv, toCsv, type CsvCell } from './csv';
import {
  achievementOf,
  blockers,
  buildRows,
  outsideBand,
  weightedScoreOf,
  NOTE_BAND,
} from './entries';
import type { KpiRow } from './kpi';

/* ---------------------------------------------------------------------------
   Spreadsheet upload — template, parsing, and the one validation pass.

   The rule this file exists to enforce: a partially valid file never commits
   silently. `validate()` is pure and is run twice — once to build the report
   the manager confirms, and again at commit time against freshly read data.
   Commit writes exactly what that second pass accepts and reports anything
   that changed in between, so there is no path where a row lands in the
   record without having appeared in a report first.

   Nothing here re-implements scoring. Achievement, the 70/120 note band and
   the submit blockers all come from lib/entries.ts, which is what the form
   uses; if those rules change, both routes change together.

   The six reference columns in the template are never trusted on the way back
   in. Weight, target and unit are re-read from the database — a manager who
   edits them in the sheet changes nothing, which is the point of the KPI set
   being master data.
   --------------------------------------------------------------------------- */

export const TEMPLATE_HEADERS = [
  'Employee ID',
  'Employee',
  'KRA',
  'Weight %',
  'Target',
  'Unit',
  'Actual',
  'Context note',
] as const;

/** The columns a row is matched and scored on. The rest are reference only. */
export const REQUIRED_HEADERS = ['Employee ID', 'KRA', 'Actual'] as const;

export type TemplateSubject = {
  employeeId: string;
  employeeName: string;
  kpis: KpiRow[];
};

/** One row per KRA per employee, with Actual and Context note left blank. */
export function templateRows(subjects: TemplateSubject[]): CsvCell[][] {
  const rows: CsvCell[][] = [[...TEMPLATE_HEADERS]];
  for (const subject of subjects) {
    for (const kpi of subject.kpis) {
      rows.push([
        subject.employeeId,
        subject.employeeName,
        kpi.name,
        kpi.weight,
        kpi.target,
        kpi.unit ?? '',
        '',
        '',
      ]);
    }
  }
  return rows;
}

export function templateCsv(subjects: TemplateSubject[]): string {
  return CSV_BOM + toCsv(templateRows(subjects));
}

export function templateFilename(cycleLabel: string): string {
  return `M3M-Perform-${cycleLabel.replace(/\s+/g, '-')}-entry-template.csv`;
}

/** One line of an uploaded file, before any of it is believed. */
export type RawRow = {
  /** 1-based line in the file, header counted — what the manager sees in Excel. */
  line: number;
  employeeId: string;
  employeeName: string;
  kra: string;
  actual: string;
  contextNote: string;
};

export type ParseResult =
  | { ok: true; rows: RawRow[] }
  | { ok: false; error: string };

/**
 * Excel writes CSV UTF-8 with a byte-order mark, and this app's own template
 * ships with one, so the first header would otherwise parse as "﻿Employee
 * ID" and every row would look like it had no employee.
 */
export function parseTemplate(text: string): ParseResult {
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const parsed = parseCsv(body);
  if (parsed.length === 0) {
    return { ok: false, error: 'That file has no rows in it.' };
  }

  const present = new Set(Object.keys(parsed[0]));
  const missing = REQUIRED_HEADERS.filter((h) => !present.has(h));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `That file is missing the ${missing.join(', ')} column${
        missing.length === 1 ? '' : 's'
      }. Download the template and fill in the Actual column rather than building a sheet by hand.`,
    };
  }

  return {
    ok: true,
    // +2: line 1 is the header, and parseCsv returns the body only.
    rows: parsed.map((r, i) => ({
      line: i + 2,
      employeeId: (r['Employee ID'] ?? '').trim(),
      employeeName: (r['Employee'] ?? '').trim(),
      kra: (r['KRA'] ?? '').trim(),
      actual: (r['Actual'] ?? '').trim(),
      contextNote: (r['Context note'] ?? '').trim(),
    })),
  };
}

export type RejectCode =
  | 'missing-employee-id'
  | 'unknown-employee'
  | 'not-your-team'
  | 'month-locked'
  | 'unknown-kpi'
  | 'ambiguous-kpi'
  | 'duplicate-row'
  | 'not-a-number'
  | 'out-of-range'
  | 'note-required';

export type AcceptedRow = {
  line: number;
  employeeId: string;
  employeeName: string;
  kpiId: string;
  kra: string;
  actual: number;
  contextNote: string | null;
  achievement: number | null;
};

export type RejectedRow = {
  line: number;
  employeeId: string;
  kra: string;
  actual: string;
  code: RejectCode;
  /** Written for the manager, not for a log. */
  reason: string;
};

/** A row left as the template shipped it — not an error, just not an entry. */
export type BlankRow = { line: number; employeeId: string; kra: string };

/** What confirming would do to one person's month. */
export type EmployeeOutcome = {
  employeeId: string;
  employeeName: string;
  acceptedRows: number;
  rejectedRows: number;
  /** Weighted score the month would carry after this upload. */
  weightedScore: number | null;
  missingActuals: number;
  missingNotes: number;
  /**
   * A complete, unblocked month submits — the rule the form's Submit button
   * follows, via blockers() in lib/entries.ts — but only when none of this
   * person's rows were refused.
   *
   * That extra condition matters. A refused row leaves whatever was already
   * recorded against that KRA in place, so submitting anyway would close the
   * month on the old figure while the manager believes they have just changed
   * it. Holding it as a draft keeps the month open for the fix they now have
   * to make, in the sheet or on the form.
   */
  willSubmit: boolean;
  /**
   * The score this month is already submitted at, or null if it is not
   * submitted.
   *
   * Read with `willSubmit`: when this is set and `willSubmit` is false, the
   * commit will return a published month to a draft carrying `weightedScore`.
   * That is the one outcome a manager must be told about up front, so it is
   * predicted here rather than only reported afterwards.
   */
  previouslySubmittedScore: number | null;
};

export type UploadReport = {
  accepted: AcceptedRow[];
  blank: BlankRow[];
  rejected: RejectedRow[];
  employees: EmployeeOutcome[];
};

/** Existing entry rows for an employee, so a part-filled sheet reads correctly. */
export type ExistingEntry = { kpiId: string; actual: unknown; contextNote: string | null };

export type SubjectContext = {
  name: string;
  kpis: KpiRow[];
  existing: ExistingEntry[];
  /** null when writable; the refusal text when the month is locked for them. */
  lockedMessage: string | null;
  /**
   * The score this month is currently submitted at, or null if it is not
   * submitted. Carried so the report can warn *before* the manager confirms
   * that confirming would return a published month to a draft — see
   * `previouslySubmittedScore` on EmployeeOutcome.
   */
  submittedScore: number | null;
};

export type UploadContext = {
  /** Employees this actor may write this month, keyed by employee id. */
  subjects: Map<string, SubjectContext>;
  /** Employees that exist but are not this actor's to write. */
  otherEmployeeIds: Set<string>;
};

/** Trim, collapse inner whitespace, casefold — a KRA typed back by hand still matches. */
function normaliseKra(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * A generous upper bound, not a business rule: it exists to catch a
 * mis-keyed cell (a date pasted as a serial number, a stray run of digits)
 * rather than to police what a KRA can legitimately measure.
 */
const ABSURD = 1e12;

/**
 * The single validation pass. Pure: everything it needs about the database is
 * in `context`, so the report shown to the manager and the decision made at
 * commit time are produced by the same code on the same inputs.
 */
export function validate(rows: RawRow[], context: UploadContext): UploadReport {
  const accepted: AcceptedRow[] = [];
  const blank: BlankRow[] = [];
  const rejected: RejectedRow[] = [];
  const seen = new Set<string>();

  const reject = (row: RawRow, code: RejectCode, reason: string) =>
    rejected.push({
      line: row.line,
      employeeId: row.employeeId,
      kra: row.kra,
      actual: row.actual,
      code,
      reason,
    });

  for (const row of rows) {
    if (!row.employeeId) {
      reject(row, 'missing-employee-id', 'No employee ID. Rows are matched on ID, never on name.');
      continue;
    }

    const subject = context.subjects.get(row.employeeId);
    if (!subject) {
      if (context.otherEmployeeIds.has(row.employeeId)) {
        reject(row, 'not-your-team', `${row.employeeId} does not report to you.`);
      } else {
        reject(row, 'unknown-employee', `No employee with ID ${row.employeeId}.`);
      }
      continue;
    }

    if (subject.lockedMessage) {
      reject(row, 'month-locked', subject.lockedMessage);
      continue;
    }

    if (!row.kra) {
      reject(row, 'unknown-kpi', 'No KRA named on this row.');
      continue;
    }
    const wanted = normaliseKra(row.kra);
    const matches = subject.kpis.filter((k) => normaliseKra(k.name) === wanted);
    if (matches.length === 0) {
      reject(
        row,
        'unknown-kpi',
        `"${row.kra}" is not a KRA on ${subject.name}'s set for this month.`,
      );
      continue;
    }
    if (matches.length > 1) {
      reject(row, 'ambiguous-kpi', `"${row.kra}" matches more than one of ${subject.name}'s KRAs.`);
      continue;
    }
    const kpi = matches[0];

    const key = `${row.employeeId}:${kpi.id}`;
    if (seen.has(key)) {
      reject(row, 'duplicate-row', `${subject.name} / ${kpi.name} appears more than once.`);
      continue;
    }
    seen.add(key);

    if (row.actual === '') {
      blank.push({ line: row.line, employeeId: row.employeeId, kra: kpi.name });
      continue;
    }

    // Strip thousands separators a spreadsheet may have written, but nothing
    // else — a cell reading "12,00,000" is a number; "n/a" is not.
    const cleaned = row.actual.replace(/,/g, '');
    const actual = Number(cleaned);
    if (cleaned === '' || Number.isNaN(actual)) {
      reject(row, 'not-a-number', `"${row.actual}" is not a number.`);
      continue;
    }
    if (!Number.isFinite(actual) || actual < 0 || actual > ABSURD) {
      reject(row, 'out-of-range', `${row.actual} is outside the range a KRA can take.`);
      continue;
    }

    const achievement = achievementOf(kpi.target, actual, kpi.lowerIsBetter);
    const note = row.contextNote || null;
    if (outsideBand(achievement) && !note) {
      reject(
        row,
        'note-required',
        `${(achievement as number).toFixed(0)}% of target needs a context note — anything below ${
          NOTE_BAND.low
        }% or above ${NOTE_BAND.high}% does.`,
      );
      continue;
    }

    accepted.push({
      line: row.line,
      employeeId: row.employeeId,
      employeeName: subject.name,
      kpiId: kpi.id,
      kra: kpi.name,
      actual,
      contextNote: note,
      achievement,
    });
  }

  return { accepted, blank, rejected, employees: outcomes(accepted, rejected, context) };
}

/**
 * What each person's month looks like once the accepted rows are merged over
 * whatever is already recorded. Merged, not replaced: a manager who uploads
 * three of five KRAs and typed the other two into the form still gets a
 * complete month.
 */
function outcomes(
  accepted: AcceptedRow[],
  rejected: RejectedRow[],
  context: UploadContext,
): EmployeeOutcome[] {
  const touched = new Set([...accepted.map((r) => r.employeeId), ...rejected.map((r) => r.employeeId)]);

  const result: EmployeeOutcome[] = [];
  for (const employeeId of touched) {
    const subject = context.subjects.get(employeeId);
    if (!subject) continue;

    const mine = accepted.filter((r) => r.employeeId === employeeId);
    const merged = new Map<string, ExistingEntry>(
      subject.existing.map((e) => [e.kpiId, e]),
    );
    for (const row of mine) {
      merged.set(row.kpiId, {
        kpiId: row.kpiId,
        actual: row.actual,
        contextNote: row.contextNote,
      });
    }

    const rows = buildRows(subject.kpis, [...merged.values()]);
    const check = blockers(rows);
    const rejectedForEmployee = rejected.filter((r) => r.employeeId === employeeId).length;
    result.push({
      employeeId,
      employeeName: subject.name,
      acceptedRows: mine.length,
      rejectedRows: rejectedForEmployee,
      weightedScore: weightedScoreOf(rows),
      missingActuals: check.missingActuals,
      missingNotes: check.missingNotes,
      willSubmit: mine.length > 0 && !check.blocked && rejectedForEmployee === 0,
      // Only meaningful when rows will actually be written for this person; a
      // person whose every row was refused has nothing written and so nothing
      // unsubmitted.
      previouslySubmittedScore: mine.length > 0 ? subject.submittedScore : null,
    });
  }

  return result.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}
