import { forbidden, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EntryRouteSwitch } from '@/components/log/EntryRouteSwitch';
import { UploadFlow, type PreviewRow } from '@/components/log/UploadFlow';
import { FISCAL_YEAR, now } from '@/lib/constants';
import { deriveCycles } from '@/lib/cycles';
import { prisma } from '@/lib/db';
import { getUploadScope } from '@/lib/upload-subjects';

export const metadata = { title: 'Spreadsheet upload · M3M Perform' };
export const dynamic = 'force-dynamic';

/**
 * The spreadsheet route into the Performance Log.
 *
 * Same month, same scoring, same note thresholds and same locked-month
 * refusal as the form beside it — this screen decides nothing about the
 * record on its own. Validation and writing both live in
 * /api/entries/upload; this page only establishes who is asking, which month
 * is open, and what their template would contain.
 */
export default async function UploadPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  // An employee's month is logged by their manager, not by themselves — the
  // same refusal the form page makes.
  if (session.user.role === 'EMPLOYEE') forbidden();

  const cycles = deriveCycles(
    await prisma.cycle.findMany({ where: { fiscalYear: FISCAL_YEAR }, orderBy: { monthIndex: 'asc' } }),
    now(),
  );
  const openCycle = cycles.find((c) => c.state === 'OPEN') ?? null;
  if (!openCycle) redirect('/performance-log/no-targets');

  const scope = await getUploadScope(session.user, FISCAL_YEAR, openCycle);

  const header = (
    <ScreenHeader
      title="Performance Log"
      meta={`${openCycle.label} · spreadsheet upload`}
      aside={<EntryRouteSwitch />}
    />
  );

  if (scope.template.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          label="Nothing to template"
          heading="Nobody you can log has a KRA set for this month"
          body="The template is built from the KRA sets in force for the open month, so there is nothing to download until at least one is published."
        />
      </>
    );
  }

  // Flattened here rather than in the client component: the browser has no
  // business holding a KpiRow it cannot use.
  const preview: PreviewRow[] = scope.template.flatMap((subject) =>
    subject.kpis.map((kpi) => ({
      employeeId: subject.employeeId,
      employeeName: subject.employeeName,
      kra: kpi.name,
      weight: kpi.weight,
      target: kpi.target,
      unit: kpi.unit ?? '',
    })),
  );

  return (
    <>
      {header}
      <UploadFlow cycleLabel={openCycle.label} subjects={scope.template} preview={preview} />
    </>
  );
}
