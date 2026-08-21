'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { respondToQuery, type ScorecardActionState } from '@/app/scorecard/actions';

/** Sized like RaiseQueryForm's — see the note there on alignSelf. */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn btn--primary"
      style={{ fontSize: 13, padding: '0 14px', flex: 'none', alignSelf: 'stretch' }}
      disabled={pending}
    >
      {pending ? 'Sending…' : 'Respond'}
    </button>
  );
}

/**
 * Manager-only, and only this person's actual manager — the action checks
 * leadId, not just role. Named in the placeholder for the same reason the
 * employee's box names them: the reply is going to a person, not a queue.
 */
export function RespondToQueryForm({
  queryId,
  employeeName,
}: {
  queryId: string;
  employeeName: string;
}) {
  const [state, formAction] = useActionState<ScorecardActionState, FormData>(respondToQuery, {
    error: null,
    ok: false,
  });

  // marginTop, unlike RaiseQueryForm's, is kept: this form always sits under
  // the question it answers and needs separating from it.
  return (
    <form action={formAction} className="stack" style={{ gap: 4, marginTop: 6 }}>
      <input type="hidden" name="queryId" value={queryId} />
      <div className="row" style={{ gap: 8 }}>
        <input
          name="response"
          placeholder={`Reply to ${employeeName}`}
          required
          className="field"
          style={{ fontSize: 13, flex: 1, minWidth: 0 }}
        />
        <SubmitButton />
      </div>
      {state.error ? <span style={{ fontSize: 12, color: 'var(--red)' }}>{state.error}</span> : null}
      {state.ok ? <span style={{ fontSize: 12, color: 'var(--green)' }}>Sent.</span> : null}
    </form>
  );
}
