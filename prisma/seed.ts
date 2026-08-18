/**
 * Seeds the fixture/demo scenario for local development. Idempotent — safe
 * to re-run. For the real pilot team, KPIs and FY 2026-27 cycles, see
 * prisma/seed-pilot.ts instead — never this file.
 *
 * Refuses to run if it finds a Cycle row for FISCAL_YEAR it didn't write
 * itself (see refuseIfForeignCyclesExist below) — this and seed-pilot.ts
 * share that constant, and this has overwritten real pilot cycles once
 * already when run against the same database.
 *
 * Users get the shared pilot default password and mustSetPassword = true.
 * Re-running seed resets those fields so the handoff credentials stay known.
 * Nobody self-registers.
 *
 * The shared default is pilot-only (in-person handoff). v1 must use per-user
 * temporary passwords at account creation — see lib/pilot-auth.ts.
 *
 * The KPI set below is still the prototype's Sales fixture — that's
 * intentional, it's a fixture. The real sheet goes through prisma/kpis.csv
 * and prisma/seed-pilot.ts, not this file.
 */
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaClient, type CycleState, type Role } from '@prisma/client';
import { FISCAL_YEAR } from '../lib/constants';
import { TEAM, CURRENT_USER, ENTRY_KRAS } from '../lib/data';
import { BCRYPT_ROUNDS, PILOT_DEFAULT_PASSWORD } from '../lib/pilot-auth';

const prisma = new PrismaClient();

/** April first, always all twelve. Index 1 = April. */
const MONTHS = [
  'April 2025',
  'May 2025',
  'June 2025',
  'July 2025',
  'August 2025',
  'September 2025',
  'October 2025',
  'November 2025',
  'December 2025',
  'January 2026',
  'February 2026',
  'March 2026',
];

/** Today is 3 March 2026: Apr–Jan closed, February open, March not reached. */
function stateFor(index: number): CycleState {
  if (index <= 10) return 'LOCKED';
  if (index === 11) return 'OPEN';
  return 'FUTURE';
}

const KPI_TEMPLATE = ENTRY_KRAS.map((k, i) => ({
  name: k.name,
  basis: k.basis,
  unit: k.basis.split('·')[0].trim() || null,
  weight: k.weight,
  target: k.target,
  lowerIsBetter: Boolean(k.lowerIsBetter),
  sortOrder: i,
}));

function emailFor(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z ]/g, '').split(/\s+/).join('.')}@m3mindia.com`;
}

/**
 * This fixture and prisma/seed-pilot.ts's real cycles share FISCAL_YEAR —
 * they key off the same [fiscalYear, monthIndex] row, so upserting here can
 * silently overwrite real Cycle rows (and orphan real Submissions against
 * them) if this is ever run against the pilot's actual database. It has
 * happened once already. Every Cycle row this fixture itself creates always
 * carries exactly `MONTHS[i]` and `stateFor(monthIndex)` — a re-run of this
 * same fixture only ever finds rows matching that. Anything under this
 * fiscal year that doesn't match wasn't written by this script, and this
 * refuses to run rather than guess whether it's safe to overwrite.
 */
async function refuseIfForeignCyclesExist(): Promise<void> {
  const existing = await prisma.cycle.findMany({ where: { fiscalYear: FISCAL_YEAR } });
  const foreign = existing.filter(
    (c) => c.label !== MONTHS[c.monthIndex - 1] || c.state !== stateFor(c.monthIndex),
  );
  if (foreign.length === 0) return;

  const details = foreign
    .map(
      (c) =>
        `  - monthIndex ${c.monthIndex}: label="${c.label}", state=${c.state}` +
        ` (this fixture would set label="${MONTHS[c.monthIndex - 1]}", state=${stateFor(c.monthIndex)})`,
    )
    .join('\n');
  throw new Error(
    `Refusing to seed — ${foreign.length} Cycle row(s) for fiscalYear ${FISCAL_YEAR} don't match ` +
      `what this fixture would set, meaning something else created or changed them (most likely ` +
      `prisma/seed-pilot.ts's real cycles):\n${details}\n\n` +
      `This fixture is for local development only. If this is genuinely a fixture-only database and ` +
      `these rows are just stale, delete the fiscalYear ${FISCAL_YEAR} Cycle rows (and anything ` +
      `referencing them) and re-run. If this is the real pilot's database, do not run this script ` +
      `against it at all.`,
  );
}

async function main() {
  await refuseIfForeignCyclesExist();

  const totalWeight = KPI_TEMPLATE.reduce((sum, k) => sum + k.weight, 0);
  if (totalWeight !== 100) {
    throw new Error(`KPI weights must sum to 100, got ${totalWeight}`);
  }

  const department = await prisma.department.upsert({
    where: { name: 'Sales' },
    update: { headName: CURRENT_USER.lead.name },
    create: { name: 'Sales', headName: CURRENT_USER.lead.name },
  });

  const hrDepartment = await prisma.department.upsert({
    where: { name: 'Human Resources' },
    update: {},
    create: { name: 'Human Resources' },
  });

  // The lead first — team members reference them.
  const lead = await prisma.employee.upsert({
    where: { id: 'EMP-10001' },
    update: { name: CURRENT_USER.lead.name },
    create: {
      id: 'EMP-10001',
      name: CURRENT_USER.lead.name,
      title: 'Team Lead',
      location: CURRENT_USER.lead.location,
      departmentId: department.id,
    },
  });

  const hr = await prisma.employee.upsert({
    where: { id: 'EMP-10002' },
    update: { name: CURRENT_USER.hr.name },
    create: {
      id: 'EMP-10002',
      name: CURRENT_USER.hr.name,
      title: 'HR · Performance',
      location: CURRENT_USER.hr.location,
      departmentId: hrDepartment.id,
    },
  });

  for (const member of TEAM) {
    await prisma.employee.upsert({
      where: { id: member.id },
      update: { name: member.name, title: member.title, leadId: lead.id },
      create: {
        id: member.id,
        name: member.name,
        title: member.title,
        location: 'Gurugram',
        departmentId: department.id,
        leadId: lead.id,
      },
    });
  }

  // Accounts: HR pre-creates with the shared pilot default; first sign-in
  // forces a personal password via /set-password.
  const passwordHash = await bcrypt.hash(PILOT_DEFAULT_PASSWORD, BCRYPT_ROUNDS);
  const accounts: { employeeId: string; name: string; role: Role }[] = [
    { employeeId: lead.id, name: lead.name, role: 'MANAGER' },
    { employeeId: hr.id, name: hr.name, role: 'HR' },
    ...TEAM.map((m) => ({ employeeId: m.id, name: m.name, role: 'EMPLOYEE' as Role })),
  ];

  for (const account of accounts) {
    const email = emailFor(account.name);
    await prisma.user.upsert({
      where: { employeeId: account.employeeId },
      update: {
        email,
        role: account.role,
        passwordHash,
        mustSetPassword: true,
      },
      create: {
        email,
        role: account.role,
        employeeId: account.employeeId,
        passwordHash,
        mustSetPassword: true,
      },
    });
  }

  // Twelve cycles, always all twelve.
  const cycles = [];
  for (let i = 0; i < MONTHS.length; i += 1) {
    const monthIndex = i + 1;
    const cycle = await prisma.cycle.upsert({
      where: { fiscalYear_monthIndex: { fiscalYear: FISCAL_YEAR, monthIndex } },
      update: { label: MONTHS[i], state: stateFor(monthIndex) },
      create: {
        fiscalYear: FISCAL_YEAR,
        monthIndex,
        label: MONTHS[i],
        state: stateFor(monthIndex),
        locksOn: monthIndex === 11 ? new Date('2026-03-07T23:59:59+05:30') : null,
      },
    });
    cycles.push(cycle);
  }

  // KPI set per employee.
  for (const member of TEAM) {
    for (const kpi of KPI_TEMPLATE) {
      // effectiveFrom: 1 — this fixture seed always targets the one
      // original version of a KPI, same reasoning as seed-pilot.ts. A fresh
      // KRA's lineageId is its own id — the identity later versions carry
      // forward when this one gets edited.
      const newId = randomUUID();
      await prisma.kpi.upsert({
        where: {
          employeeId_fiscalYear_name_effectiveFrom: {
            employeeId: member.id,
            fiscalYear: FISCAL_YEAR,
            name: kpi.name,
            effectiveFrom: 1,
          },
        },
        update: {
          basis: kpi.basis,
          weight: kpi.weight,
          target: kpi.target,
          lowerIsBetter: kpi.lowerIsBetter,
          sortOrder: kpi.sortOrder,
        },
        create: {
          id: newId,
          lineageId: newId,
          employeeId: member.id,
          fiscalYear: FISCAL_YEAR,
          name: kpi.name,
          effectiveFrom: 1,
          basis: kpi.basis,
          unit: kpi.unit,
          weight: kpi.weight,
          target: kpi.target,
          lowerIsBetter: kpi.lowerIsBetter,
          sortOrder: kpi.sortOrder,
        },
      });
    }
  }

  // Historical months, so the year strips and Scorecard have a record to show.
  // These carry a weighted score only — the per-KPI actuals behind them predate
  // the system. Real actuals start with the open cycle.
  for (const member of TEAM) {
    for (let i = 0; i < member.closed.length; i += 1) {
      const score = member.closed[i];
      if (score === null) continue;
      const cycle = cycles[i];
      const existing = await prisma.submission.findFirst({
        where: { employeeId: member.id, cycleId: cycle.id, state: 'SUBMITTED' },
      });
      if (existing) continue;
      await prisma.submission.create({
        data: {
          employeeId: member.id,
          cycleId: cycle.id,
          weightedScore: score,
          state: 'SUBMITTED',
          source: 'FORM',
          submittedAt: new Date(),
          submittedById: lead.id,
        },
      });
    }
  }

  const counts = {
    departments: await prisma.department.count(),
    employees: await prisma.employee.count(),
    users: await prisma.user.count(),
    cycles: await prisma.cycle.count(),
    kpis: await prisma.kpi.count(),
    submissions: await prisma.submission.count(),
  };
  console.log('Seed complete:', counts);
  console.log('\nAccounts (default password; must change on first sign-in):');
  for (const account of accounts) console.log(`  ${emailFor(account.name)}  ${account.role}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
