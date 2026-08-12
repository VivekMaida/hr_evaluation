'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { raiseQuery, type ScorecardActionState } from '@/app/scorecard/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn btn--secondary"
      style={{ fontSize: 12.5, padding: '5px 10px', flex: 'none' }}
      disabled={pending}
    >
      {pending ? 'Sending…' : 'Ask'}
    </button>
  );
}

/** Self-only — routes to the employee's own manager, never HR. */
export function RaiseQueryForm({ cycleId }: { cycleId: string }) {
  const [state, formAction] = useActionState<ScorecardActionState, FormData>(raiseQuery, {
    error: null,
    ok: false,
  });

  return (
    <form action={formAction} className="stack" style={{ gap: 4, marginTop: 8 }}>
      <input type="hidden" name="cycleId" value={cycleId} />
      <div className="row" style={{ gap: 8 }}>
        <input
          name="question"
          placeholder="Ask about this month"
          required
          className="field"
          style={{ fontSize: 13, flex: 1 }}
        />
        <SubmitButton />
      </div>
      {state.error ? <span style={{ fontSize: 12, color: 'var(--red)' }}>{state.error}</span> : null}
      {state.ok ? <span style={{ fontSize: 12, color: 'var(--green)' }}>Sent to your manager.</span> : null}
    </form>
  );
}
