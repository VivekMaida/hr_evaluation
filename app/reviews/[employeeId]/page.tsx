import { ReviewScreen } from '@/components/reviews/ReviewScreen';
import { LINKED_EMPLOYEE_IDS } from '@/lib/scorecard-data';

export const metadata = { title: 'Reviews · M3M Perform' };

export function generateStaticParams() {
  return LINKED_EMPLOYEE_IDS.map((employeeId) => ({ employeeId }));
}

/** One drawn record so far; the roster routes here for everyone. */
export default function ReviewForEmployeePage() {
  return <ReviewScreen />;
}
