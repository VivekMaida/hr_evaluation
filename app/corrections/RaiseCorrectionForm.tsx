'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { raiseCorrection, type CorrectionState } from './actions';
import type { CorrectableCycle } from '@/lib/corrections';

export type CorrectionTarget = {
  employeeId: string;
  employeeName: string;
  cycles: CorrectableCycle[];
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--primary" disabled={pending}>
      {pending ? 'Sending…' : 'Request correction'}
    </button>
  );
}

export function RaiseCorrectionForm({
  targets,
  initialEmployeeId,
}: {
  targets: CorrectionTarget[];
  /** Preselects this person if they are one of the targets; ignored if not. */
  initialEmployeeId?: string;
}) {
  const [state, formAction] = useActionState<CorrectionState, FormData>(raiseCorrection, {
    error: null,
    ok: false,
  });
  const preselected = targets.some((t) => t.employeeId === initialEmployeeId)
    ? (initialEmployeeId as string)
    : (targets[0]?.employeeId ?? '');
  const [employeeId, setEmployeeId] = useState(preselected);

  const selected = targets.find((t) => t.employeeId === employeeId) ?? null;
  const cycles = selected?.cycles ?? [];

  if (targets.length === 0) {
    return (
      <div style={{ fontSize: 14, color: 'var(--grey-body)' }}>
        Nobody on your team has a locked month yet, so there is nothing to correct.
      </div>
    );
  }

  return (
    <form action={formAction} className="stack" style={{ gap: 14, maxWidth: 560 }}>
      <label className="stack" style={{ gap: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>Whose record</span>
        <select
          name="employeeId"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="field"
        >
          {targets.map((t) => (
            <option key={t.employeeId} value={t.employeeId}>
              {t.employeeName}
            </option>
          ))}
        </select>
      </label>

      <label className="stack" style={{ gap: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>Which month</span>
        {cycles.length === 0 ? (
          <span style={{ fontSize: 13.5, color: 'var(--grey-body)' }}>
            No locked month is available to correct for this person — either none has locked yet, or
            every locked month already has a request open.
          </span>
        ) : (
          <select name="cycleId" className="field" defaultValue={cycles[0]?.id}>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        )}
      </label>

      <label className="stack" style={{ gap: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
          Why it needs reopening
        </span>
        <textarea
          name="reason"
          rows={4}
          className="field"
          placeholder="What is wrong, and what it should be. This is kept on the record and HR reads it before deciding."
        />
      </label>

      {state.error ? (
        <div className="callout callout--alert" role="alert" style={{ padding: '12px 16px', fontSize: 14 }}>
          {state.error}
        </div>
      ) : null}
      {state.ok ? (
        <div className="callout callout--positive" role="status" style={{ padding: '12px 16px', fontSize: 14 }}>
          Sent to HR. You'll be able to edit the month once it's approved.
        </div>
      ) : null}

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
