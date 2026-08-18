/**
 * Seeds the real pilot team, their real KPI sets, and the real FY 2026-27
 * cycles — from prisma/roster.csv and prisma/kpis.csv, not lib/data.ts's
 * fixture roster. Separate from prisma/seed.ts (the fixture/demo seed for
 * local development), which this script never reads from or writes over.
 *
 * Idempotent and upsert-only: re-running it is safe, and it is exactly how
 * a Cycle's state actually advances (there is no scheduled job doing that —
 * see lib/cycles.ts). It never deletes anything — removing a row from either
 * CSV and re-running just leaves that person's or KPI's existing DB row
 * untouched, not deleted.
 *
 * Validates everything in both files before writing anything: if any row is
 * malformed, references an unknown id, or an employee's KPI weights don't
 * sum to 100, the whole run is refused and nothing is written.
 *
 * This shares FISCAL_YEAR with prisma/seed.ts — they key off the same
 * [fiscalYear, monthIndex] Cycle row. That used to mean whichever seed ran
 * most recently silently won; prisma/seed.ts now refuses to run at all if it
 * finds a Cycle row here that doesn't match its own fixture data, so it can
 * no longer overwrite these real cycles by accident. This script has no
 * matching guard in the other direction — it will happily overwrite the
 * fixture's demo cycles if pointed at a fixture-only database, which is a
 * much cheaper mistake (re-run prisma/seed.ts) than the one being guarded
 * against here.
 */
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { PrismaClient, type KpiType, type Role } from '@prisma/client';
import { FISCAL_YEAR, now } from '../lib/constants';
import { parseCsv } from '../lib/csv';
import { calendarMonthFor, cycleStateFor, cycleWindowFor } from '../lib/cycles';
import { BCRYPT_ROUNDS, PILOT_DEFAULT_PASSWORD } from '../lib/pilot-auth';

const prisma = new PrismaClient();

const ROSTER_PATH = path.join(__dirname, 'roster.csv');
const KPIS_PATH = path.join(__dirname, 'kpis.csv');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const VALID_ROLES: Role[] = ['EMPLOYEE', 'MANAGER', 'HR'];

const KPI_TYPES: Record<string, KpiType> = {
  'higher-is-better': 'HIGHER_IS_BETTER',
  'lower-is-better': 'LOWER_IS_BETTER',
  milestone: 'MILESTONE',
  qualitative: 'QUALITATIVE',
};

/** Only the fixture example row's id — real IDs are HR's own choice, not this. */
const EXAMPLE_EMPLOYEE_ID = 'EXAMPLE-0001';

type RosterRow = {
  employeeId: string;
  name: string;
  email: string;
  title: string;
  department: string;
  location: string;
  joinedOn: string;
  leadId: string;
  role: string;
};

type KpiRow = {
  employeeId: string;
  name: string;
  basis: string;
  unit: string;
  weight: string;
  target: string;
  type: string;
  sortOrder: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(roster: RosterRow[], kpiRows: KpiRow[]): string[] {
  const errors: string[] = [];

  const idSet = new Set(roster.map((r) => r.employeeId).filter(Boolean));
  const seenIds = new Set<string>();
  const seenEmails = new Set<string>();

  roster.forEach((r, i) => {
    const line = i + 2; // header is line 1
    const tag = `roster.csv line ${line}`;

    if (r.employeeId === EXAMPLE_EMPLOYEE_ID) {
      errors.push(`${tag}: still contains the example row (${EXAMPLE_EMPLOYEE_ID}) — replace it with a real person or delete it.`);
    }
    if (!r.employeeId) {
      errors.push(`${tag}: employeeId is required`);
    } else if (seenIds.has(r.employeeId)) {
      errors.push(`${tag}: duplicate employeeId "${r.employeeId}"`);
    } else {
      seenIds.add(r.employeeId);
    }

    if (!r.name) errors.push(`${tag}: name is required`);
    if (!r.title) errors.push(`${tag}: title is required`);
    if (!r.department) errors.push(`${tag}: department is required`);

    if (!r.email || !EMAIL_RE.test(r.email)) {
      errors.push(`${tag}: "${r.email}" is not a valid email`);
    } else if (seenEmails.has(r.email.toLowerCase())) {
      errors.push(`${tag}: duplicate email "${r.email}"`);
    } else {
      seenEmails.add(r.email.toLowerCase());
    }

    const role = r.role.trim().toUpperCase();
    if (!VALID_ROLES.includes(role as Role)) {
      errors.push(`${tag}: role "${r.role}" must be one of EMPLOYEE, MANAGER, HR`);
    }

    if (r.leadId) {
      if (r.leadId === r.employeeId) {
        errors.push(`${tag}: ${r.employeeId} cannot report to themselves`);
      } else if (!idSet.has(r.leadId)) {
        errors.push(`${tag}: leadId "${r.leadId}" does not match any employeeId in roster.csv`);
      }
    }

    if (r.joinedOn && Number.isNaN(new Date(r.joinedOn).getTime())) {
      errors.push(`${tag}: joinedOn "${r.joinedOn}" is not a valid date — use YYYY-MM-DD`);
    }
  });

  const weightsByEmployee = new Map<string, number>();
  kpiRows.forEach((k, i) => {
    const line = i + 2;
    const tag = `kpis.csv line ${line}`;

    if (k.employeeId === EXAMPLE_EMPLOYEE_ID) {
      errors.push(`${tag}: still contains the example row (${EXAMPLE_EMPLOYEE_ID}) — replace it with a real KPI or delete it.`);
    }
    if (!k.employeeId) {
      errors.push(`${tag}: employeeId is required`);
    } else if (!idSet.has(k.employeeId)) {
      errors.push(`${tag}: employeeId "${k.employeeId}" is not in roster.csv`);
    }

    if (!k.name) errors.push(`${tag}: name is required`);
    if (!k.basis) errors.push(`${tag}: basis is required`);

    const weight = Number(k.weight);
    if (!k.weight || !Number.isFinite(weight)) {
      errors.push(`${tag}: weight "${k.weight}" is not a number`);
    } else if (k.employeeId) {
      weightsByEmployee.set(k.employeeId, (weightsByEmployee.get(k.employeeId) ?? 0) + weight);
    }

    const target = Number(k.target);
    if (!k.target || !Number.isFinite(target)) {
      errors.push(`${tag}: target "${k.target}" is not a number`);
    }

    const typeKey = k.type.trim().toLowerCase();
    if (!KPI_TYPES[typeKey]) {
      errors.push(`${tag}: type "${k.type}" must be one of ${Object.keys(KPI_TYPES).join(', ')}`);
    }

    if (k.sortOrder && Number.isNaN(Number(k.sortOrder))) {
      errors.push(`${tag}: sortOrder "${k.sortOrder}" is not a number`);
    }
  });

  for (const [employeeId, total] of weightsByEmployee) {
    const rounded = Math.round(total * 100) / 100;
    if (rounded !== 100) {
      errors.push(`kpis.csv: ${employeeId}'s KPI weights sum to ${rounded}, not 100`);
    }
  }

  return errors;
}

/**
 * FY 2026-27's real cycles — August (monthIndex 5) through March (12).
 * Nothing is created for April-July (1-4): this programme didn't exist yet,
 * and a month before someone's (or the programme's) own start already
 * renders as "not applicable" with no Cycle row at all (see
 * eligibleFromMonthIndex / pointsFromCycleScores in lib/employee-year.ts).
 *
 * Unconditional — this runs whether or not roster.csv/kpis.csv are ready
 * yet. Cycles are org-wide, not tied to any one employee's data, so there's
 * no reason to gate them behind roster completeness; re-running this is also
 * exactly how a cycle's stored state actually advances, since nothing else
 * (no scheduled job) recomputes it between runs.
 *
 * Uses now() from lib/constants.ts, not `new Date()` directly — so a local
 * PREVIEW_NOW override (see there) computes state as of the previewed
 * moment instead of the real one. Re-run this once PREVIEW_NOW is unset to
 * restore the real state.
 */
async function seedCycles(): Promise<void> {
  const [fyStartYear] = FISCAL_YEAR.split('-').map(Number);
  const asOf = now();
  console.log(`  (computing cycle state as of ${asOf.toISOString()})`);
  for (let monthIndex = 5; monthIndex <= 12; monthIndex += 1) {
    const cal = calendarMonthFor(monthIndex, fyStartYear);
    const label = `${MONTH_NAMES[cal.month - 1]} ${cal.year}`;
    const window = cycleWindowFor(monthIndex, fyStartYear);
    const state = cycleStateFor(window, asOf);

    await prisma.cycle.upsert({
      where: { fiscalYear_monthIndex: { fiscalYear: FISCAL_YEAR, monthIndex } },
      update: { label, state, opensOn: window.opensOn, locksOn: window.locksOn },
      create: {
        fiscalYear: FISCAL_YEAR,
        monthIndex,
        label,
        state,
        opensOn: window.opensOn,
        locksOn: window.locksOn,
      },
    });
    console.log(`  ${label}: ${state} (locks ${window.locksOn.toISOString()})`);
  }
}

async function main() {
  console.log(`Cycles, ${FISCAL_YEAR}:`);
  await seedCycles();

  if (!existsSync(ROSTER_PATH)) {
    throw new Error(`Missing ${ROSTER_PATH} — it should already exist with a header row and an example row to replace.`);
  }
  const roster = parseCsv(readFileSync(ROSTER_PATH, 'utf-8')) as unknown as RosterRow[];
  const kpiRows = existsSync(KPIS_PATH)
    ? (parseCsv(readFileSync(KPIS_PATH, 'utf-8')) as unknown as KpiRow[])
    : [];

  const errors = validate(roster, kpiRows);
  if (errors.length > 0) {
    throw new Error(
      `Cycles are seeded. Refusing to seed the roster/KPIs — ${errors.length} problem${errors.length === 1 ? '' : 's'} found:\n` +
        errors.map((e) => `  - ${e}`).join('\n'),
    );
  }

  // --- Departments, upserted once per distinct name ---
  const departmentNames = Array.from(new Set(roster.map((r) => r.department)));
  const departmentIds = new Map<string, string>();
  for (const name of departmentNames) {
    const dept = await prisma.department.upsert({ where: { name }, update: {}, create: { name } });
    departmentIds.set(name, dept.id);
  }

  // --- Employees + accounts, pass one: everyone exists before anyone's leadId is set ---
  const passwordHash = await bcrypt.hash(PILOT_DEFAULT_PASSWORD, BCRYPT_ROUNDS);
  for (const r of roster) {
    const departmentId = departmentIds.get(r.department)!;
    const joinedOn = r.joinedOn ? new Date(r.joinedOn) : null;
    await prisma.employee.upsert({
      where: { id: r.employeeId },
      update: { name: r.name, title: r.title, location: r.location || null, joinedOn, departmentId },
      create: {
        id: r.employeeId,
        name: r.name,
        title: r.title,
        location: r.location || null,
        joinedOn,
        departmentId,
      },
    });

    const role = r.role.trim().toUpperCase() as Role;
    await prisma.user.upsert({
      where: { employeeId: r.employeeId },
      update: { email: r.email.toLowerCase(), role },
      create: {
        email: r.email.toLowerCase(),
        role,
        employeeId: r.employeeId,
        passwordHash,
        mustSetPassword: true,
      },
    });
  }

  // --- Pass two: link reporting managers, now that every id in the file exists ---
  for (const r of roster) {
    await prisma.employee.update({
      where: { id: r.employeeId },
      data: { leadId: r.leadId || null },
    });
  }

  // --- KPIs ---
  const sortCounters = new Map<string, number>();
  for (const k of kpiRows) {
    const type = KPI_TYPES[k.type.trim().toLowerCase()];
    const nextAuto = sortCounters.get(k.employeeId) ?? 0;
    const sortOrder = k.sortOrder ? Number(k.sortOrder) : nextAuto;
    sortCounters.set(k.employeeId, nextAuto + 1);

    // effectiveFrom: 1 — this seed only ever runs pre-season, before any
    // cycle opens, so it always targets the one original version of a KPI.
    // A re-run after edits have created later versions would collide with
    // this key rather than silently overwriting a live/pending row.
    // A fresh KRA's lineageId is its own id — the identity later versions
    // carry forward when this one gets edited.
    const newId = randomUUID();
    await prisma.kpi.upsert({
      where: {
        employeeId_fiscalYear_name_effectiveFrom: {
          employeeId: k.employeeId,
          fiscalYear: FISCAL_YEAR,
          name: k.name,
          effectiveFrom: 1,
        },
      },
      update: {
        basis: k.basis,
        unit: k.unit || null,
        weight: Number(k.weight),
        target: Number(k.target),
        type,
        lowerIsBetter: type === 'LOWER_IS_BETTER',
        sortOrder,
      },
      create: {
        id: newId,
        lineageId: newId,
        employeeId: k.employeeId,
        fiscalYear: FISCAL_YEAR,
        name: k.name,
        effectiveFrom: 1,
        basis: k.basis,
        unit: k.unit || null,
        weight: Number(k.weight),
        target: Number(k.target),
        type,
        lowerIsBetter: type === 'LOWER_IS_BETTER',
        sortOrder,
      },
    });
  }

  const counts = {
    departments: departmentNames.length,
    employees: roster.length,
    kpis: kpiRows.length,
  };
  console.log('\nRoster and KPIs seeded:', counts);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
