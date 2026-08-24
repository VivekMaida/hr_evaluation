import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const ID = '500112';
async function main() {
  console.log(`MonthlyEntry: ${await p.monthlyEntry.count({ where: { employeeId: ID } })}`);
  console.log(`Submission:   ${await p.submission.count({ where: { employeeId: ID } })}`);
  console.log(`Kpi (kept):   ${await p.kpi.count({ where: { employeeId: ID } })}`);
  const logs = await p.activityLog.findMany({ where: { employeeId: ID }, orderBy: { at: 'asc' } });
  console.log(`ActivityLog:  ${logs.length}`);
  for (const l of logs) console.log(`   ${l.at.toISOString().slice(0, 16)}  ${l.kind}`);
  // Nobody else should have been touched.
  console.log(`\nother employees' entries: ${await p.monthlyEntry.count({ where: { employeeId: { not: ID } } })}`);
  console.log(`other employees' submissions: ${await p.submission.count({ where: { employeeId: { not: ID } } })}`);
  process.exit(0);
}
main();
