'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { resetPassword, type ResetState } from './actions';

function ResetButton({ claimed }: { claimed: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn btn--secondary"
      style={{ fontSize: 13.5, padding: '7px 14px' }}
      disabled={pending || !claimed}
      title={claimed ? undefined : 'Already on the default password'}
    >
      {pending ? 'Resetting…' : 'Reset password'}
    </button>
  );
}

export function ResetForm({
  employeeId,
  claimed,
}: {
  employeeId: string;
  claimed: boolean;
}) {
  const [state, formAction] = useActionState<ResetState, FormData>(resetPassword, {
    error: null,
    message: null,
  });

  return (
    <form action={formAction} className="stack" style={{ gap: 6, alignItems: 'flex-end' }}>
      <input type="hidden" name="employeeId" value={employeeId} />
      <ResetButton claimed={claimed} />
      {state.error ? (
        <span style={{ fontSize: 12.5, color: 'var(--red)', fontWeight: 700 }}>
          {state.error}
        </span>
      ) : null}
      {state.message ? (
        <span style={{ fontSize: 12.5, color: 'var(--green)' }}>{state.message}</span>
      ) : null}
    </form>
  );
}
