import type { Role } from '@prisma/client';
import { prisma } from './db';

export type Actor = { employeeId: string; role: Role };

/**
 * A manager may act for their own team; HR for anyone; everyone may read
 * themselves, but only HR or their own manager may write on their behalf.
 *
 * The one implementation every dynamic, employee-scoped route should call —
 * per-page copies of this logic are how a route like /admin ends up with no
 * check at all.
 */
export async function canAccessEmployee(
  actor: Actor,
  employeeId: string,
  write: boolean,
): Promise<boolean> {
  if (actor.role === 'HR') return true;
  if (actor.employeeId === employeeId) return !write;
  if (actor.role !== 'MANAGER') return false;
  const target = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { leadId: true },
  });
  return target?.leadId === actor.employeeId;
}
