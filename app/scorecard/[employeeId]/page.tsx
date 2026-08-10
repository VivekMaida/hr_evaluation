import { notFound } from 'next/navigation';
import { Scorecard } from '@/components/scorecard/Scorecard';
import { LINKED_EMPLOYEE_IDS, ROHIT, SCORECARDS } from '@/lib/scorecard-data';

export function generateStaticParams() {
  return LINKED_EMPLOYEE_IDS.map((employeeId) => ({ employeeId }));
}

export default async function ScorecardPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  // Roster rows link to every employee; only two have a drawn record so far.
  const subject = SCORECARDS[employeeId] ?? (employeeId.startsWith('EMP-') ? ROHIT : null);
  if (!subject) notFound();
  return <Scorecard subject={subject} />;
}
