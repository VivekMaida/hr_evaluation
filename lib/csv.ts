/**
 * A small, dependency-free CSV reader for the seed pipeline's editable input
 * files (prisma/roster.csv, prisma/kpis.csv). Handles quoted fields — commas
 * and quotes inside "..." — and either \n or \r\n line endings. Not a
 * general-purpose CSV library: just enough for a human-edited sheet with a
 * header row.
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
