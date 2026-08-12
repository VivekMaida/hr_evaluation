'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { setPassword, type SetPasswordState } from './actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn btn--primary btn--large"
      disabled={pending}
      style={{ justifyContent: 'center', width: '100%' }}
    >
      {pending ? 'Saving…' : 'Continue'}
    </button>
  );
}

export function SetPasswordForm() {
  const [state, formAction] = useActionState<SetPasswordState, FormData>(setPassword, {
    error: null,
  });

  return (
    <form action={formAction} className="stack" style={{ gap: 16 }}>
      <div className="stack" style={{ gap: 6 }}>
        <label htmlFor="next" style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>
          New password
        </label>
        <input
          id="next"
          name="next"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="field"
          style={{ fontSize: 15, padding: '11px 12px' }}
        />
        <div style={{ fontSize: 13, color: 'var(--grey-body)', lineHeight: 1.5 }}>
          At least 8 characters. Do not reuse the default password you were given.
        </div>
      </div>

      <div className="stack" style={{ gap: 6 }}>
        <label htmlFor="confirm" style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>
          Confirm password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="field"
          style={{ fontSize: 15, padding: '11px 12px' }}
        />
      </div>

      {state.error ? (
        <div
          className="callout callout--alert"
          role="alert"
          style={{ padding: '12px 16px', fontSize: 14 }}
        >
          {state.error}
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}
