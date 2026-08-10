'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Role } from '@/lib/types';

/**
 * A lead sees all eight nav items; Calibration, Reports and Admin are dimmed
 * with an HR tag rather than hidden, so the IA stays constant across roles.
 */
export type { Role };

type RoleContextValue = {
  role: Role;
  setRole: (role: Role) => void;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('lead');
  return (
    <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>
  );
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used inside a RoleProvider');
  return ctx;
}
