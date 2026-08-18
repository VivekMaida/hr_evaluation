'use server';

import { randomUUID } from 'crypto';
import { Prisma, type KpiType } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import { canAccessEmployee } from '@/lib/access';
import { FISCAL_YEAR } from '@/lib/constants';
import { prisma } from '@/lib/db';
import { nextEditableMonthIndex } from '@/lib/kpi';

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

const kpiRowSchema = z.object({
  key: z.string().min(1),
  name: z.string().trim().min(1, 'Every KRA needs a name.'),
  basis: z.string().trim().min(1, 'Every KRA needs a basis.'),
  unit: z.string().trim().optional(),
  weight: z.coerce.number().finite('Weight must be a number.'),
  target: z.coerce.number().finite('Target must be a number.'),
  type: z.enum(['HIGHER_IS_BETTER', 'LOWER_IS_BETTER', 'MILESTONE', 'QUALITATIVE']),
});

type KpiRowInput = z.infer<typeof kpiRowSchema>;

/** A protected field — one a month may already have been scored against. */
const PROTECTED_FIELDS = ['name', 'basis', 'unit', 'weight', 'target', 'type'] as const;

function protectedValue(field: (typeof PROTECTED_FIELDS)[number], row: KpiRowInput): string {
  if (field === 'unit') return row.unit ?? '';
  if (field === 'weight' || field === 'target') return String(row[field]);
  return String(row[field]);
}

function protectedValueOf(
  field: (typeof PROTECTED_FIELDS)[number],
  existing: { name: string; basis: string; unit: string | null; weight: unknown; target: unknown; type: KpiType },
): string {
  if (field === 'unit') return existing.unit ?? '';
  if (field === 'weight' || field === 'target') return String(Number(existing[field]));
  return String(existing[field]);
}

/**
 * HR for anyone, or a manager for their own direct report — canAccessEmployee
 * already encodes both rules (see app/profile/[employeeId]/page.tsx). Adds,
 * edits, removes and reorders the whole set in one save — the client submits
 * the full desired set; any existing KPI whose id isn't among the submitted
 * rows is the removal. While a cycle is OPEN its KPI set is frozen, so any
 * change to a field a month could already have been scored against (name,
 * basis, unit, target, weight, type) closes the live row out and opens a new
 * version starting next cycle rather than mutating it — see lib/kpi.ts. A
 * sortOrder-only change (reordering) is pure display and applies to the live
 * row immediately; it never needs a new version, and rides along inside one
 * when a protected field changes too.
 */
export async function saveKpiSet(_prev: MasterState, formData: FormData): Promise<MasterState> {
  const session = await auth();
  if (!session?.user) return { error: 'Not signed in.', ok: false };

  const employeeId = String(formData.get('employeeId') ?? '');
  if (!employeeId) return { error: 'Bad request.', ok: false };
  if (!(await canAccessEmployee(session.user, employeeId, true))) {
    return { error: "You can't edit this KPI set.", ok: false };
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { name: true } });
  if (!employee) return { error: 'No such employee.', ok: false };

  const keys = formData.getAll('rowKey').map(String);
  const rows: KpiRowInput[] = [];
  for (const key of keys) {
    const parsed = kpiRowSchema.safeParse({
      key,
      name: formData.get(`name-${key}`),
      basis: formData.get(`basis-${key}`),
      unit: formData.get(`unit-${key}`) || undefined,
      weight: formData.get(`weight-${key}`),
      target: formData.get(`target-${key}`),
      type: formData.get(`type-${key}`),
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Check the form.', ok: false };
    }
    rows.push(parsed.data);
  }

  const totalWeight = Math.round(rows.reduce((sum, r) => sum + r.weight, 0) * 100) / 100;
  if (totalWeight !== 100) {
    return {
      error: `${employee.name}'s KPI weights total ${totalWeight}, not 100 — fix before saving.`,
      ok: false,
    };
  }

  const cycles = await prisma.cycle.findMany({ where: { fiscalYear: FISCAL_YEAR } });
  const pendingFrom = nextEditableMonthIndex(cycles);
  if (pendingFrom === null) {
    return {
      error: 'No further cycle this fiscal year to schedule a change into — the year is spent.',
      ok: false,
    };
  }
  const pendingCycle = cycles.find((c) => c.monthIndex === pendingFrom) ?? null;

  const existingRows = await prisma.kpi.findMany({
    where: { employeeId, fiscalYear: FISCAL_YEAR, effectiveTo: null },
  });
  const existingById = new Map(existingRows.map((k) => [k.id, k]));

  const actorId = session.user.employeeId;
  const writes: Prisma.PrismaPromise<unknown>[] = [];
  const logs: { kind: string; summary: string; meta: Record<string, string> }[] = [];

  rows.forEach((row, index) => {
    const existingRow = existingById.get(row.key);

    if (!existingRow) {
      const newId = randomUUID();
      writes.push(
        prisma.kpi.create({
          data: {
            id: newId,
            lineageId: newId,
            employeeId,
            fiscalYear: FISCAL_YEAR,
            name: row.name,
            basis: row.basis,
            unit: row.unit ?? null,
            weight: row.weight,
            target: row.target,
            type: row.type,
            lowerIsBetter: row.type === 'LOWER_IS_BETTER',
            sortOrder: index,
            effectiveFrom: pendingFrom,
            effectiveTo: null,
          },
        }),
      );
      logs.push({
        kind: 'KPI_ADDED',
        summary: `${row.name} added, effective ${pendingCycle?.label ?? 'immediately'}`,
        meta: { field: 'name', newValue: row.name },
      });
      return;
    }

    const isPending = existingRow.effectiveFrom >= pendingFrom;
    const protectedChanged = PROTECTED_FIELDS.some(
      (field) => protectedValue(field, row) !== protectedValueOf(field, existingRow),
    );
    const sortOrderChanged = existingRow.sortOrder !== index;

    if (!protectedChanged) {
      // Reordering only (or nothing changed) — updates the live row in
      // place, pending or not, since it never needs protecting.
      if (sortOrderChanged) {
        writes.push(prisma.kpi.update({ where: { id: existingRow.id }, data: { sortOrder: index } }));
      }
      return;
    }

    const nextData = {
      name: row.name,
      basis: row.basis,
      unit: row.unit ?? null,
      weight: row.weight,
      target: row.target,
      type: row.type,
      lowerIsBetter: row.type === 'LOWER_IS_BETTER',
      sortOrder: index,
    };

    if (isPending) {
      // Never scored against — no history to protect, edit it in place.
      writes.push(prisma.kpi.update({ where: { id: existingRow.id }, data: nextData }));
    } else {
      writes.push(
        prisma.kpi.update({ where: { id: existingRow.id }, data: { effectiveTo: pendingFrom - 1 } }),
      );
      writes.push(
        prisma.kpi.create({
          data: {
            lineageId: existingRow.lineageId,
            employeeId,
            fiscalYear: FISCAL_YEAR,
            effectiveFrom: pendingFrom,
            effectiveTo: null,
            ...nextData,
          },
        }),
      );

      for (const field of PROTECTED_FIELDS) {
        const oldValue = protectedValueOf(field, existingRow);
        const newValue = protectedValue(field, row);
        if (oldValue !== newValue) {
          logs.push({
            kind: 'KPI_FIELD_EDITED',
            summary: `${row.name}: ${field} changed from ${oldValue || '—'} to ${newValue || '—'}, effective ${pendingCycle?.label ?? 'next cycle'}`,
            meta: { field, oldValue, newValue },
          });
        }
      }
    }
  });

  const submittedIds = new Set(rows.map((r) => r.key));
  for (const existingRow of existingRows.filter((r) => !submittedIds.has(r.id))) {
    const isPending = existingRow.effectiveFrom >= pendingFrom;
    writes.push(
      isPending
        ? prisma.kpi.delete({ where: { id: existingRow.id } })
        : prisma.kpi.update({ where: { id: existingRow.id }, data: { effectiveTo: pendingFrom - 1 } }),
    );
    logs.push({
      kind: 'KPI_REMOVED',
      summary: `${existingRow.name} removed, effective ${pendingCycle?.label ?? 'immediately'}`,
      meta: { field: 'name', oldValue: existingRow.name },
    });
  }

  if (writes.length === 0) {
    return { error: null, ok: true };
  }

  await prisma.$transaction([
    ...writes,
    ...logs.map((log) =>
      prisma.activityLog.create({
        data: {
          actorId,
          employeeId,
          cycleId: pendingCycle?.id ?? null,
          kind: log.kind,
          summary: log.summary,
          meta: log.meta,
        },
      }),
    ),
  ]);

  revalidatePath(`/profile/${employeeId}`);
  return { error: null, ok: true };
}
