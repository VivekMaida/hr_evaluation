import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/AppShell';
import { RoleProvider } from '@/components/RoleContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'M3M Perform',
  description:
    'Monthly performance logging, scorecards and annual reviews for M3M India.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
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
        <RoleProvider>
          <AppShell>{children}</AppShell>
        </RoleProvider>
      </body>
    </html>
  );
}
