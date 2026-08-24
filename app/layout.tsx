import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { auth } from '@/auth';
import { AppShell } from '@/components/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'M3M Perform',
  description:
    'Monthly performance logging, scorecards and annual reviews for M3M India.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Nothing but the session. The sidebar's team-scoped Scorecard and Reviews
  // links used to need an employee id in them, so this ran an
  // employee.findFirst on every authenticated render just to pick one; those
  // links now point at the team index, which needs no id at all.
  const session = await auth();

  return (
    <html lang="en-IN">
      <head>
        {/* Corporate typeface is Calibri. On screen we set Carlito — metric-
            compatible, near-identical — falling back to system-ui, sans-serif. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Carlito:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppShell
          user={
            session?.user
              ? {
                  name: session.user.name ?? session.user.email ?? 'Signed in',
                  role: session.user.role,
                  employeeId: session.user.employeeId,
                }
              : null
          }
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
