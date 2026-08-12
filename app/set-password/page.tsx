import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { SectionLabel } from '@/components/ui';
import { signOutAction } from '@/app/login/actions';
import { SetPasswordForm } from './SetPasswordForm';

export const metadata = { title: 'Choose a password · M3M Perform' };

export default async function SetPasswordPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!session.user.mustSetPassword) redirect('/');

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        background: 'var(--grey-surface)',
      }}
    >
      <div
        className="stack"
        style={{
          gap: 22,
          width: '100%',
          maxWidth: 400,
          background: 'var(--white)',
          border: '1px solid var(--grey-line)',
          borderRadius: 'var(--radius)',
          padding: '32px 28px 28px',
        }}
      >
        <div className="stack" style={{ gap: 8 }}>
          <SectionLabel>M3M Perform</SectionLabel>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.2 }}>
            Choose a password
          </h1>
          <p style={{ margin: 0, fontSize: 14.5, color: 'var(--grey-body)', lineHeight: 1.55 }}>
            This is your first sign-in. Choose a password.
          </p>
        </div>

        <SetPasswordForm />

        <form action={signOutAction}>
          <button
            type="submit"
            className="btn btn--secondary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
