'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { acknowledgeMonth, type ScorecardActionState } from '@/app/scorecard/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn btn--secondary"
      style={{ fontSize: 13, padding: '6px 12px' }}
      disabled={pending}
    >
      {pending ? 'Saving…' : 'Acknowledge'}
    </button>
  );
}

/** Self-only — the action rejects anyone acknowledging someone else's month. */
export function AcknowledgeButton({ cycleId }: { cycleId: string }) {
  const [state, formAction] = useActionState<ScorecardActionState, FormData>(acknowledgeMonth, {
    error: null,
    ok: false,
  });

  return (
    <form action={formAction} className="stack" style={{ gap: 4 }}>
      <input type="hidden" name="cycleId" value={cycleId} />
      <SubmitButton />
      {state.error ? (
        <span style={{ fontSize: 12, color: 'var(--red)' }}>{state.error}</span>
      ) : null}
    </form>
  );
}
