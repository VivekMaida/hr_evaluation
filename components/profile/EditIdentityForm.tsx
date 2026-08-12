'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { updateEmployeeMaster, type MasterState } from '@/app/profile/[employeeId]/actions';
import type { ProfileIdentity } from '@/lib/profile';

export type DepartmentOption = { id: string; name: string };
export type ManagerOption = { id: string; name: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--primary" disabled={pending}>
      {pending ? 'Saving…' : 'Save identity'}
    </button>
  );
}

function joinedOnValue(date: Date | null): string {
  if (!date) return '';
  return date.toISOString().slice(0, 10);
}

export function EditIdentityForm({
  identity,
  departments,
  managers,
}: {
  identity: ProfileIdentity;
  departments: DepartmentOption[];
  managers: ManagerOption[];
}) {
  const [state, formAction] = useActionState<MasterState, FormData>(updateEmployeeMaster, {
    error: null,
    ok: false,
  });

  return (
    <form action={formAction} className="stack" style={{ gap: 14, maxWidth: 480 }}>
      <input type="hidden" name="employeeId" value={identity.id} />

      <div className="spread" style={{ fontSize: 14 }}>
        <span style={{ color: 'var(--grey-body)' }}>Employee ID</span>
        <span className="num" style={{ fontWeight: 700, color: 'var(--navy)' }}>{identity.id}</span>
      </div>

      <label className="stack" style={{ gap: 4, fontSize: 13, color: 'var(--grey-body)' }}>
        Name
        <input name="name" defaultValue={identity.name} required className="field" />
      </label>

      <label className="stack" style={{ gap: 4, fontSize: 13, color: 'var(--grey-body)' }}>
        Email
        <input name="email" type="email" defaultValue={identity.email} required className="field" />
      </label>

      <label className="stack" style={{ gap: 4, fontSize: 13, color: 'var(--grey-body)' }}>
        Designation
        <input name="title" defaultValue={identity.title} required className="field" />
      </label>

      <label className="stack" style={{ gap: 4, fontSize: 13, color: 'var(--grey-body)' }}>
        Department
        <select name="departmentId" defaultValue={identity.departmentId} className="field" required>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>

      <label className="stack" style={{ gap: 4, fontSize: 13, color: 'var(--grey-body)' }}>
        Reporting manager
        <select name="leadId" defaultValue={identity.leadId ?? ''} className="field">
          <option value="">None</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>

      <label className="stack" style={{ gap: 4, fontSize: 13, color: 'var(--grey-body)' }}>
        Date of joining
        <input
          name="joinedOn"
          type="date"
          defaultValue={joinedOnValue(identity.joinedOn)}
          className="field"
        />
      </label>

      <label className="stack" style={{ gap: 4, fontSize: 13, color: 'var(--grey-body)' }}>
        Location
        <input name="location" defaultValue={identity.location ?? ''} className="field" />
      </label>

      {state.error ? (
        <div className="callout callout--alert" role="alert" style={{ padding: '12px 16px', fontSize: 14 }}>
          {state.error}
        </div>
      ) : null}
      {state.ok ? (
        <div className="callout callout--positive" role="status" style={{ padding: '12px 16px', fontSize: 14 }}>
          Saved. Recorded in the activity log against your name.
        </div>
      ) : null}

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
