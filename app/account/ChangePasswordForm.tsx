'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { changePassword, type PasswordState } from './actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--primary" disabled={pending}>
      {pending ? 'Saving…' : 'Change password'}
    </button>
  );
}

export function ChangePasswordForm({ neverSet }: { neverSet: boolean }) {
  const [state, formAction] = useActionState<PasswordState, FormData>(changePassword, {
    error: null,
    ok: false,
  });

  return (
    <form action={formAction} className="stack" style={{ gap: 16, maxWidth: 420 }}>
      {!neverSet ? (
        <div className="stack" style={{ gap: 6 }}>
          <label htmlFor="current" style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>
            Current password
          </label>
          <input
            id="current"
            name="current"
            type="password"
            autoComplete="current-password"
            required
            className="field"
            style={{ fontSize: 15, padding: '11px 12px' }}
          />
        </div>
      ) : null}

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
        <div style={{ fontSize: 13, color: 'var(--grey-body)' }}>
          At least 8 characters.
        </div>
      </div>

      <div className="stack" style={{ gap: 6 }}>
        <label htmlFor="confirm" style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>
          Confirm new password
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
        <div className="callout callout--alert" role="alert" style={{ padding: '12px 16px', fontSize: 14 }}>
          {state.error}
        </div>
      ) : null}
      {state.ok ? (
        <div className="callout callout--positive" role="status" style={{ padding: '12px 16px', fontSize: 14 }}>
          Password changed. It applies the next time you sign in.
        </div>
      ) : null}

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
