'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { updateKpiSet, type MasterState } from '@/app/profile/[employeeId]/actions';
import type { KpiSetItem } from '@/lib/profile';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--primary" disabled={pending}>
      {pending ? 'Saving…' : 'Save KPI weights'}
    </button>
  );
}

export function EditKpiSetForm({
  employeeId,
  items,
}: {
  employeeId: string;
  items: KpiSetItem[];
}) {
  const [state, formAction] = useActionState<MasterState, FormData>(updateKpiSet, {
    error: null,
    ok: false,
  });

  return (
    <form action={formAction} className="stack" style={{ gap: 14 }}>
      <input type="hidden" name="employeeId" value={employeeId} />

      <table className="data-table" style={{ fontSize: 14.5 }}>
        <thead>
          <tr>
            <th style={{ padding: '9px 12px' }}>Key result area</th>
            <th className="is-num" style={{ padding: '9px 10px', width: 100 }}>Weight %</th>
            <th className="is-num" style={{ padding: '9px 10px', width: 120 }}>Annual target</th>
          </tr>
        </thead>
        <tbody>
          {items.map((kpi) => (
            <tr key={kpi.id}>
              <td style={{ padding: '10px 12px' }}>
                <input type="hidden" name="kpiId" value={kpi.id} />
                <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{kpi.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--grey-body)' }}>
                  {kpi.basis}
                  {kpi.lowerIsBetter ? ' · lower is better' : ''}
                </div>
              </td>
              <td style={{ padding: '8px 10px' }}>
                <input
                  name={`weight-${kpi.id}`}
                  type="number"
                  step="0.01"
                  defaultValue={kpi.weight}
                  className="field field--num"
                  style={{ width: '100%' }}
                />
              </td>
              <td style={{ padding: '8px 10px' }}>
                <input
                  name={`target-${kpi.id}`}
                  type="number"
                  step="0.01"
                  defaultValue={kpi.target}
                  className="field field--num"
                  style={{ width: '100%' }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
