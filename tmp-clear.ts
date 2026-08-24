import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'node:fs';

const prisma = new PrismaClient();
const ID = '500112';

async function main() {
  // Keep a copy of what is about to go, so the delete is reversible for as
  // long as this file survives. Deleting a real record with no record of what
  // it held is not something to do on a one-line instruction.
  const before = {
    entries: await prisma.monthlyEntry.findMany({ where: { employeeId: ID } }),
    submissions: await prisma.submission.findMany({ where: { employeeId: ID } }),
    activity: await prisma.activityLog.findMany({ where: { employeeId: ID, kind: 'MONTH_SUBMITTED' } }),
  };
  writeFileSync('deepak-august-2026-removed.json', JSON.stringify(before, null, 2));

  const result = await prisma.$transaction(async (tx) => {
    // Submissions first: nothing references them, but entries are what the
    // score is derived from, so the order keeps the record from ever being
    // momentarily "submitted with no entries" mid-transaction.
    const subs = await tx.submission.deleteMany({ where: { employeeId: ID } });
    const entries = await tx.monthlyEntry.deleteMany({ where: { employeeId: ID } });
    const logs = await tx.activityLog.deleteMany({ where: { employeeId: ID, kind: 'MONTH_SUBMITTED' } });
    return { subs: subs.count, entries: entries.count, logs: logs.count };
  });

  console.log(`deleted: ${result.entries} entries, ${result.subs} submissions, ${result.logs} MONTH_SUBMITTED rows`);
  console.log('backup written to deepak-august-2026-removed.json');
  process.exit(0);
}
main();
