import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';

/** Stub — content to be specified separately. */
export function EmployeeHome() {
  return (
    <>
      <ScreenHeader title="Home" />
      <EmptyState
        label="Not in round 1"
        heading="Home has not been designed for Employee yet"
        body="What an individual contributor sees here is still to be specified."
      />
    </>
  );
}
