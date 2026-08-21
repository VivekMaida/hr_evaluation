/**
 * A small, dependency-free CSV reader and writer.
 *
 * The reader serves the seed pipeline's editable input files
 * (prisma/roster.csv, prisma/kpis.csv), handling quoted fields and either
 * line ending; the writer serves the record export
 * (lib/scorecard-export.ts). Neither is a general-purpose CSV library: just
 * enough for a human-edited sheet with a header row, and for producing a
 * file Excel opens cleanly.
 */
export function parseCsv(content: string): Record<string, string>[] {
  const rows = splitCsvRows(content.replace(/\r\n/g, '\n').replace(/\r/g, '\n'));
  const nonEmpty = rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
  if (nonEmpty.length === 0) return [];

  const header = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((cells) => {
    const row: Record<string, string> = {};
    header.forEach((key, i) => {
      row[key] = (cells[i] ?? '').trim();
    });
    return row;
  });
}

function splitCsvRows(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];

    if (inQuotes) {
      if (char === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  row.push(field);
  rows.push(row);
  return rows;
}

/** A cell. null and undefined both write as an empty field. */
export type CsvCell = string | number | null | undefined;

function cell(value: CsvCell): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  // Quote anything that would otherwise change the shape of the row, plus any
  // field with a leading or trailing space a reader might quietly trim.
  return /[",\n\r]|^\s|\s$/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Rows to CSV text, CRLF-terminated. Ragged rows are fine — a short row is
 * just a short row, and parseCsv above pads missing columns with ''.
 */
export function toCsv(rows: CsvCell[][]): string {
  return rows.map((row) => row.map(cell).join(',')).join('\r\n');
}

/**
 * A UTF-8 byte-order mark. Excel on Windows reads a BOM-less CSV as the
 * system codepage, which turns the separators in an employee's identity line
 * and a rupee sign in a KRA unit into mojibake. Every CSV this app hands a
 * user goes out with it.
 */
export const CSV_BOM = '\uFEFF';
