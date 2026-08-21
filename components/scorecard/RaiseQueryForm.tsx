'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { raiseQuery, type ScorecardActionState } from '@/app/scorecard/actions';

/**
 * `alignSelf: 'stretch'` rather than a hand-tuned height: the row centres its
 * children, so without it the button sizes to its own text and sits 6px
 * shorter than the input beside it. Stretching makes it exactly the input's
 * height whatever the two fonts happen to measure.
 */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn btn--secondary"
      style={{ fontSize: 13, padding: '0 14px', flex: 'none', alignSelf: 'stretch' }}
      disabled={pending}
    >
      {pending ? 'Sending…' : 'Ask'}
    </button>
  );
}

/**
 * Self-only — routes to the employee's own manager, never HR.
 *
 * The manager is named in the placeholder and in the confirmation, not only
 * in the prose above the table: by the time someone is typing in the box they
 * are not reading the paragraph, and "who is about to receive this" is the
 * one thing they need at that moment.
 */
export function RaiseQueryForm({
  cycleId,
  managerName,
}: {
  cycleId: string;
  /** null when this person has no lead on record — see the fallback below. */
  managerName: string | null;
}) {
  const [state, formAction] = useActionState<ScorecardActionState, FormData>(raiseQuery, {
    error: null,
    ok: false,
  });

  // raiseQuery refuses when there is no lead to route to, so offering the box
  // would only produce an error after the question had been typed.
  if (!managerName) {
    return (
      <div style={{ fontSize: 12.5, color: 'var(--grey-body)' }}>
        No manager is on record for you, so a query has nowhere to go. Ask HR to set your manager.
      </div>
    );
  }

  return (
    <form action={formAction} className="stack" style={{ gap: 4 }}>
      <input type="hidden" name="cycleId" value={cycleId} />
      <div className="row" style={{ gap: 8 }}>
        <input
          name="question"
          placeholder={`Ask ${managerName} about this month`}
          required
          className="field"
          style={{ fontSize: 13, flex: 1, minWidth: 0 }}
        />
        <SubmitButton />
      </div>
      {state.error ? <span style={{ fontSize: 12, color: 'var(--red)' }}>{state.error}</span> : null}
      {state.ok ? (
        <span style={{ fontSize: 12, color: 'var(--green)' }}>Sent to {managerName}.</span>
      ) : null}
    </form>
  );
}
