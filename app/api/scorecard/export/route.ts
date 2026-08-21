import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { canAccessEmployee } from '@/lib/access';
import { EMPLOYEE_RECORD_VISIBILITY, now } from '@/lib/constants';
import { CSV_BOM } from '@/lib/csv';
import { getScorecardData } from '@/lib/scorecard';
import { scorecardCsv, scorecardFilename } from '@/lib/scorecard-export';

export const runtime = 'nodejs';
// The record as it stands right now; a cached export is a wrong export.
export const dynamic = 'force-dynamic';

/**
 * "Export record" on the Scorecard — the same year, the same figures, as a
 * file. Under /api so middleware skips it (see middleware.ts): the checks
 * below are the whole gate.
 *
 * Access is decided exactly as the screen decides it, and by the same
 * functions, so there is no second, quietly-looser copy of the rule: read
 * access via canAccessEmployee(), and the employee self-service visibility
 * flag applied on top for an employee exporting their own record. Anything
 * withheld on screen is withheld here.
 */
const query = z.object({ employeeId: z.string().min(1) });

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = query.safeParse({ employeeId: url.searchParams.get('employeeId') });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const { employeeId } = parsed.data;

  if (!(await canAccessEmployee(session.user, employeeId, false))) {
    return NextResponse.json({ error: 'Not your team' }, { status: 403 });
  }

  // Mirrors app/scorecard/page.tsx: the flag only ever gates an EMPLOYEE's
  // own record — a manager or HR exporting anyone, including themselves, is
  // unaffected.
  const isEmployeeOwnRecord =
    session.user.role === 'EMPLOYEE' && session.user.employeeId === employeeId;
  if (isEmployeeOwnRecord && EMPLOYEE_RECORD_VISIBILITY === 'hidden') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
  }
  const maskOpenCycleData = isEmployeeOwnRecord && EMPLOYEE_RECORD_VISIBILITY === 'after-lock';

  const data = await getScorecardData(employeeId, { maskOpenCycleData });
  if (!data) return NextResponse.json({ error: 'No such employee' }, { status: 404 });
  if (!data.subject) {
    return NextResponse.json(
      { error: `${data.employee.name} has no submitted months this year, so there is no record to export.` },
      { status: 409 },
    );
  }

  const csv = scorecardCsv(data.subject, {
    exportedBy: session.user.name ?? session.user.employeeId,
    exportedAt: now(),
  });

  return new NextResponse(CSV_BOM + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${scorecardFilename(employeeId)}"`,
      'Cache-Control': 'no-store',
    },
  });
}
