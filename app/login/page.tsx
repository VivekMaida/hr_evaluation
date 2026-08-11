import Image from 'next/image';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { asset } from '@/lib/base-path';
import { SectionLabel } from '@/components/ui';
import { LoginForm } from './LoginForm';

export const metadata = { title: 'Sign in · M3M Perform' };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect('/');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--white)' }}>
      {/* Elevation line-art as an ambient layer — cover panel and login only. */}
      <div
        style={{
          flex: '1 1 55%',
          background: 'var(--navy)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-end',
          minWidth: 0,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.22,
            backgroundImage:
              'repeating-linear-gradient(90deg,transparent 0 46px,#FFFFFF 46px 47px),repeating-linear-gradient(0deg,transparent 0 34px,#FFFFFF 34px 35px)',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 36,
            bottom: 0,
            width: 150,
            height: 210,
            border: '1px solid rgba(255,255,255,.5)',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 196,
            bottom: 0,
            width: 96,
            height: 140,
            border: '1px solid rgba(255,255,255,.35)',
          }}
        />
        <div
          style={{
            position: 'relative',
            padding: '46px 48px 44px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <Image
            src={asset('/m3m-logo.png')}
            alt="M3M"
            width={120}
            height={47}
            priority
            style={{
              background: 'var(--white)',
              padding: '8px 10px',
              borderRadius: 'var(--radius)',
              alignSelf: 'flex-start',
              height: 'auto',
            }}
          />
          <div style={{ fontSize: 30, fontWeight: 600, color: 'var(--white)', lineHeight: 1.2 }}>
            Sign in to continue
          </div>
          <div
            style={{
              fontSize: 14.5,
              color: 'rgba(255,255,255,.72)',
              maxWidth: '36ch',
              lineHeight: 1.55,
            }}
          >
            M3M Perform records the monthly performance log, scorecards and annual
            reviews. Accounts are created by HR for pilot participants.
          </div>
        </div>
      </div>

      <div
        style={{
          flex: '0 0 460px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 44px',
          minWidth: 0,
        }}
      >
        <div className="stack" style={{ gap: 22, width: '100%', maxWidth: 340 }}>
          <div className="stack" style={{ gap: 8 }}>
            <SectionLabel>M3M Perform</SectionLabel>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600, color: 'var(--navy)', lineHeight: 1.15 }}>
              Sign in
            </h1>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
