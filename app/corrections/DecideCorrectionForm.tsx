'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { decideCorrection, type CorrectionState } from './actions';

function Buttons() {
  const { pending } = useFormStatus();
  return (
    <div className="row" style={{ gap: 10 }}>
      <button
        type="submit"
        name="decision"
        value="APPROVED"
        className="btn btn--primary"
        disabled={pending}
      >
        {pending ? 'Saving…' : 'Approve and reopen'}
      </button>
      <button
        type="submit"
        name="decision"
        value="REJECTED"
        className="btn btn--secondary"
        disabled={pending}
      >
        Decline
      </button>
    </div>
  );
}

/**
 * Approve and Decline are two submit buttons on one form, both carrying the
 * same required note — so HR cannot decide either way without saying why.
 */
export function DecideCorrectionForm({ correctionId }: { correctionId: string }) {
  const [state, formAction] = useActionState<CorrectionState, FormData>(decideCorrection, {
    error: null,
    ok: false,
  });

  return (
    <form action={formAction} className="stack" style={{ gap: 10, marginTop: 12 }}>
      <input type="hidden" name="correctionId" value={correctionId} />
      <textarea
        name="decisionNote"
        rows={3}
        className="field"
        placeholder="Your reason — required whether you approve or decline. Kept on the record."
        style={{ maxWidth: 560 }}
      />
      {state.error ? (
        <div className="callout callout--alert" role="alert" style={{ padding: '10px 14px', fontSize: 13.5 }}>
          {state.error}
        </div>
      ) : null}
      <Buttons />
    </form>
  );
}
