import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { FISCAL_YEAR, now } from '@/lib/constants';
import { deriveCycles } from '@/lib/cycles';
import { prisma } from '@/lib/db';
import { templateCsv, templateFilename } from '@/lib/upload';
import { getUploadScope } from '@/lib/upload-subjects';

export const runtime = 'nodejs';
// The open month and the current KRA sets; a cached template is a wrong one.
export const dynamic = 'force-dynamic';

/**
 * The entry template for the open month, pre-filled with whoever this actor
 * may write — a manager's own reports, or the whole KPI-bearing roster for
 * HR. Built from getUploadScope, the same function the upload validates
 * against, so the sheet can never contain a row the upload would then reject
 * as "not your team".
 *
 * Under /api, so middleware skips it (see middleware.ts): the checks here are
 * the whole gate.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }
  // An employee's month is logged by their manager, never by themselves —
  // the same refusal /performance-log makes.
  if (session.user.role === 'EMPLOYEE') {
    return NextResponse.json({ error: 'Not yours to log' }, { status: 403 });
  }

  const cycles = deriveCycles(
    await prisma.cycle.findMany({ where: { fiscalYear: FISCAL_YEAR }, orderBy: { monthIndex: 'asc' } }),
    now(),
  );
  const openCycle = cycles.find((c) => c.state === 'OPEN');
  if (!openCycle) {
    return NextResponse.json({ error: 'No cycle is open for entry.' }, { status: 409 });
  }

  const scope = await getUploadScope(session.user, FISCAL_YEAR, openCycle);
  if (scope.template.length === 0) {
    return NextResponse.json(
      { error: 'Nobody you can log has a KRA set for this month, so there is nothing to template.' },
      { status: 409 },
    );
  }

  return new NextResponse(templateCsv(scope.template), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${templateFilename(openCycle.label)}"`,
      'Cache-Control': 'no-store',
    },
  });
}
