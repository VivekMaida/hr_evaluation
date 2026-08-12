'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { respondToQuery, type ScorecardActionState } from '@/app/scorecard/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn btn--primary"
      style={{ fontSize: 12.5, padding: '5px 10px', flex: 'none' }}
      disabled={pending}
    >
      {pending ? 'Sending…' : 'Respond'}
    </button>
  );
}

/** Manager-only, and only this person's actual manager — the action checks leadId, not just role. */
export function RespondToQueryForm({ queryId }: { queryId: string }) {
  const [state, formAction] = useActionState<ScorecardActionState, FormData>(respondToQuery, {
    error: null,
    ok: false,
  });

  return (
    <form action={formAction} className="stack" style={{ gap: 4, marginTop: 6 }}>
      <input type="hidden" name="queryId" value={queryId} />
      <div className="row" style={{ gap: 8 }}>
        <input
          name="response"
          placeholder="Respond"
          required
          className="field"
          style={{ fontSize: 13, flex: 1 }}
        />
        <SubmitButton />
      </div>
      {state.error ? <span style={{ fontSize: 12, color: 'var(--red)' }}>{state.error}</span> : null}
      {state.ok ? <span style={{ fontSize: 12, color: 'var(--green)' }}>Sent.</span> : null}
    </form>
  );
}
