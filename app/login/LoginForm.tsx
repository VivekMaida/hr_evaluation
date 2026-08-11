'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { authenticate, type LoginState } from './actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn btn--primary btn--large"
      disabled={pending}
      style={{ justifyContent: 'center', width: '100%' }}
    >
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(authenticate, {
    error: null,
  });

  return (
    <form action={formAction} className="stack" style={{ gap: 16 }}>
      <div className="stack" style={{ gap: 6 }}>
        <label htmlFor="email" style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="first.last@m3mindia.com"
          className="field"
          style={{ fontSize: 15, padding: '11px 12px' }}
        />
      </div>

      <div className="stack" style={{ gap: 6 }}>
        <label
          htmlFor="password"
          style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          className="field"
          style={{ fontSize: 15, padding: '11px 12px' }}
        />
        <div style={{ fontSize: 13, color: 'var(--grey-body)', lineHeight: 1.5 }}>
          First time? Type the password you want and it becomes yours. Minimum 8
          characters.
        </div>
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
