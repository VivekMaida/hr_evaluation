'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { FISCAL_YEAR } from '@/lib/constants';
import { prisma } from '@/lib/db';

export type MasterState = { error: string | null; ok: boolean };

const masterSchema = z.object({
  employeeId: z.string().min(1),
  name: z.string().trim().min(1, 'Name is required.'),
  email: z.string().trim().toLowerCase().email('Enter a valid email.'),
  title: z.string().trim().min(1, 'Designation is required.'),
  departmentId: z.string().min(1, 'Choose a department.'),
  leadId: z.string().optional(),
  joinedOn: z.string().optional(),
  location: z.string().optional(),
});

/**
 * HR-only, and only for someone else's record — self-edit is refused so an
 * employee can never move themselves to a different manager or department,
 * which is exactly the audit-trail hole this route exists to close.
 */
export async function updateEmployeeMaster(
  _prev: MasterState,
  formData: FormData,
): Promise<MasterState> {
  const session = await auth();
  if (!session?.user) return { error: 'Not signed in.', ok: false };
  if (session.user.role !== 'HR') return { error: 'Only HR can edit master data.', ok: false };

  const parsed = masterSchema.safeParse({
    employeeId: String(formData.get('employeeId') ?? ''),
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    title: String(formData.get('title') ?? ''),
    departmentId: String(formData.get('departmentId') ?? ''),
    leadId: formData.get('leadId') ? String(formData.get('leadId')) : undefined,
    joinedOn: formData.get('joinedOn') ? String(formData.get('joinedOn')) : undefined,
    location: formData.get('location') ? String(formData.get('location')) : undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the form.', ok: false };

  const { employeeId, leadId, joinedOn, location, ...rest } = parsed.data;

  if (employeeId === session.user.employeeId) {
    return { error: "You can't edit your own master data here.", ok: false };
  }
  if (leadId === employeeId) {
    return { error: 'An employee cannot report to themselves.', ok: false };
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return { error: 'No such employee.', ok: false };

  await prisma.$transaction([
    prisma.employee.update({
      where: { id: employeeId },
      data: {
        name: rest.name,
        title: rest.title,
        departmentId: rest.departmentId,
        leadId: leadId || null,
        joinedOn: joinedOn ? new Date(joinedOn) : null,
        location: location || null,
      },
    }),
    prisma.user.update({
      where: { employeeId },
      data: { email: rest.email },
    }),
    prisma.activityLog.create({
      data: {
        actorId: session.user.employeeId,
        employeeId,
        kind: 'PROFILE_MASTER_EDITED',
        summary: `Master data edited by ${session.user.name ?? 'HR'}`,
      },
    }),
  ]);

  revalidatePath(`/profile/${employeeId}`);
  return { error: null, ok: true };
}

/** HR-only, and only for someone else's KPI set — see updateEmployeeMaster. */
export async function updateKpiSet(_prev: MasterState, formData: FormData): Promise<MasterState> {
  const session = await auth();
  if (!session?.user) return { error: 'Not signed in.', ok: false };
  if (session.user.role !== 'HR') return { error: 'Only HR can edit KPI weights.', ok: false };

  const employeeId = String(formData.get('employeeId') ?? '');
  if (employeeId === session.user.employeeId) {
    return { error: "You can't edit your own KPI weights here.", ok: false };
  }

  const existing = await prisma.kpi.findMany({
    where: { employeeId, fiscalYear: FISCAL_YEAR },
    select: { id: true },
  });
  const knownIds = new Set(existing.map((k) => k.id));

  const kpiIds = formData.getAll('kpiId').map(String);
  const items: { id: string; weight: number; target: number }[] = [];
  for (const id of kpiIds) {
    if (!knownIds.has(id)) {
      return { error: 'Unknown KPI in the form.', ok: false };
    }
    const weight = Number(formData.get(`weight-${id}`));
    const target = Number(formData.get(`target-${id}`));
    if (!Number.isFinite(weight) || !Number.isFinite(target)) {
      return { error: 'Every weight and target must be a number.', ok: false };
    }
    items.push({ id, weight, target });
  }
  if (items.length === 0) return { error: 'Nothing to save.', ok: false };

  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  if (Math.round(totalWeight) !== 100) {
    return { error: `Weights must sum to 100 — currently ${totalWeight}.`, ok: false };
  }

  await prisma.$transaction([
    ...items.map((item) =>
      prisma.kpi.update({
        where: { id: item.id },
        data: { weight: item.weight, target: item.target },
      }),
    ),
    prisma.activityLog.create({
      data: {
        actorId: session.user.employeeId,
        employeeId,
        kind: 'KPI_WEIGHTS_EDITED',
        summary: `KPI weights edited by ${session.user.name ?? 'HR'}`,
      },
    }),
  ]);

  revalidatePath(`/profile/${employeeId}`);
  return { error: null, ok: true };
}
