'use client';

import { useActionState, useId, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { saveKpiSet, type MasterState } from '@/app/profile/[employeeId]/actions';
import type { KpiSet, KpiSetItem } from '@/lib/profile';
import { KPI_TYPE_LABEL, type KpiType } from '@/lib/types';

type DraftRow = {
  key: string;
  name: string;
  basis: string;
  unit: string;
  weight: string;
  target: string;
  type: KpiType;
};

function toDraftRow(item: KpiSetItem): DraftRow {
  return {
    key: item.id,
    name: item.name,
    basis: item.basis,
    unit: item.unit ?? '',
    weight: String(item.weight),
    target: String(item.target),
    type: item.type,
  };
}

function blankRow(key: string): DraftRow {
  return { key, name: '', basis: '', unit: '', weight: '0', target: '0', type: 'HIGHER_IS_BETTER' };
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--primary" disabled={pending}>
      {pending ? 'Saving…' : 'Save KPI set'}
    </button>
  );
}

export function KpiSetEditor({ employeeId, kpis }: { employeeId: string; kpis: KpiSet }) {
  const startingSet = kpis.pending.length > 0 ? kpis.pending : kpis.current;
  const [rows, setRows] = useState<DraftRow[]>(startingSet.map(toDraftRow));
  const [state, formAction] = useActionState<MasterState, FormData>(saveKpiSet, {
    error: null,
    ok: false,
  });
  const idPrefix = useId();
  let newRowCount = 0;

  const totalWeight = Math.round(rows.reduce((sum, r) => sum + (Number(r.weight) || 0), 0) * 100) / 100;

  function updateRow(key: string, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function addRow() {
    newRowCount += 1;
    setRows((prev) => [...prev, blankRow(`${idPrefix}-new-${prev.length}-${newRowCount}`)]);
  }

  function move(key: string, direction: -1 | 1) {
    setRows((prev) => {
      const index = prev.findIndex((r) => r.key === key);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const takesEffectLabel = kpis.pendingFromLabel ?? (kpis.current.length > 0 ? null : 'immediately');

  return (
    <div className="stack" style={{ gap: 22 }}>
      {kpis.current.length > 0 ? (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--grey-body)', marginBottom: 8 }}>
            Live now{kpis.effectiveDateLabel ? ` · in effect since ${kpis.effectiveDateLabel}` : ''}
          </div>
          <table className="data-table" style={{ fontSize: 14.5 }}>
            <thead>
              <tr>
                <th style={{ padding: '9px 12px' }}>Key result area</th>
                <th style={{ padding: '9px 10px', width: 140 }}>Type</th>
                <th className="is-num" style={{ padding: '9px 10px', width: 90 }}>Weight</th>
                <th className="is-num" style={{ padding: '9px 10px', width: 100 }}>Target</th>
              </tr>
            </thead>
            <tbody>
              {kpis.current.map((kpi) => (
                <tr key={kpi.id}>
                  <td style={{ padding: '9px 12px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{kpi.name}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--grey-body)' }}>
                      {kpi.unit ?? kpi.basis}
                    </div>
                  </td>
                  <td style={{ padding: '9px 10px' }}>{KPI_TYPE_LABEL[kpi.type]}</td>
                  <td className="is-num" style={{ padding: '9px 10px' }}>{kpi.weight}%</td>
                  <td className="is-num" style={{ padding: '9px 10px' }}>{kpi.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>
          {kpis.pending.length > 0
            ? `Editing a scheduled change — takes effect from ${takesEffectLabel}`
            : takesEffectLabel
              ? `Editing — takes effect from ${takesEffectLabel}`
              : 'Editing — takes effect immediately'}
        </div>

        <form action={formAction} className="stack" style={{ gap: 12 }}>
          <input type="hidden" name="employeeId" value={employeeId} />

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: 14.5, minWidth: 760 }}>
              <thead>
                <tr>
                  <th style={{ padding: '9px 8px', width: 56 }} />
                  <th style={{ padding: '9px 10px' }}>Name</th>
                  <th style={{ padding: '9px 10px' }}>Basis</th>
                  <th style={{ padding: '9px 10px', width: 90 }}>Unit</th>
                  <th style={{ padding: '9px 10px', width: 160 }}>Type</th>
                  <th className="is-num" style={{ padding: '9px 10px', width: 90 }}>Weight %</th>
                  <th className="is-num" style={{ padding: '9px 10px', width: 100 }}>Target</th>
                  <th style={{ padding: '9px 10px', width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.key}>
                    <td style={{ padding: '6px 8px' }}>
                      <div className="row" style={{ gap: 2 }}>
                        <button
                          type="button"
                          onClick={() => move(row.key, -1)}
                          disabled={index === 0}
                          className="btn btn--secondary"
                          style={{ padding: '2px 7px', fontSize: 12 }}
                          aria-label={`Move ${row.name || 'this KRA'} up`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => move(row.key, 1)}
                          disabled={index === rows.length - 1}
                          className="btn btn--secondary"
                          style={{ padding: '2px 7px', fontSize: 12 }}
                          aria-label={`Move ${row.name || 'this KRA'} down`}
                        >
                          ↓
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input type="hidden" name="rowKey" value={row.key} />
                      <input
                        name={`name-${row.key}`}
                        value={row.name}
                        onChange={(e) => updateRow(row.key, { name: e.target.value })}
                        className="field"
                        style={{ width: '100%' }}
                        placeholder="KRA name"
                      />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        name={`basis-${row.key}`}
                        value={row.basis}
                        onChange={(e) => updateRow(row.key, { basis: e.target.value })}
                        className="field"
                        style={{ width: '100%' }}
                        placeholder="e.g. MIS, CRM"
                      />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        name={`unit-${row.key}`}
                        value={row.unit}
                        onChange={(e) => updateRow(row.key, { unit: e.target.value })}
                        className="field"
                        style={{ width: '100%' }}
                      />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <select
                        name={`type-${row.key}`}
                        value={row.type}
                        onChange={(e) => updateRow(row.key, { type: e.target.value as KpiType })}
                        className="field"
                        style={{ width: '100%' }}
                      >
                        {(Object.keys(KPI_TYPE_LABEL) as KpiType[]).map((t) => (
                          <option key={t} value={t}>
                            {KPI_TYPE_LABEL[t]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        name={`weight-${row.key}`}
                        type="number"
                        step="0.01"
                        value={row.weight}
                        onChange={(e) => updateRow(row.key, { weight: e.target.value })}
                        className="field field--num"
                        style={{ width: '100%' }}
                      />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        name={`target-${row.key}`}
                        type="number"
                        step="0.01"
                        value={row.target}
                        onChange={(e) => updateRow(row.key, { target: e.target.value })}
                        className="field field--num"
                        style={{ width: '100%' }}
                      />
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        className="btn btn--secondary"
                        style={{ fontSize: 12.5, padding: '5px 9px' }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--navy)' }}>
                  <td colSpan={5} style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--navy)' }}>
                    Total
                  </td>
                  <td
                    className="is-num"
                    style={{
                      padding: '10px 10px',
                      fontWeight: 700,
                      color: totalWeight === 100 ? 'var(--navy)' : 'var(--red)',
                    }}
                  >
                    {totalWeight}%
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>

          <div>
            <button type="button" onClick={addRow} className="btn btn--secondary">
              Add KPI
            </button>
          </div>

          {state.error ? (
            <div className="callout callout--alert" role="alert" style={{ padding: '12px 16px', fontSize: 14 }}>
              {state.error}
            </div>
          ) : null}
          {state.ok ? (
            <div className="callout callout--positive" role="status" style={{ padding: '12px 16px', fontSize: 14 }}>
              Saved. Recorded in the activity log below.
            </div>
          ) : null}

          <div>
            <SubmitButton />
          </div>
        </form>
      </div>

      {kpis.recentChanges.length > 0 ? (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--grey-body)', marginBottom: 8 }}>
            Recent changes
          </div>
          <table className="data-table" style={{ fontSize: 13.5 }}>
            <thead>
              <tr>
                <th style={{ padding: '8px 10px', width: 130 }}>When</th>
                <th style={{ padding: '8px 10px', width: 140 }}>By</th>
                <th style={{ padding: '8px 10px' }}>Change</th>
              </tr>
            </thead>
            <tbody>
              {kpis.recentChanges.map((c, i) => (
                <tr key={i}>
                  <td className="num" style={{ padding: '8px 10px', color: 'var(--grey-body)' }}>
                    {c.atLabel}
                  </td>
                  <td style={{ padding: '8px 10px' }}>{c.actorName}</td>
                  <td style={{ padding: '8px 10px' }}>{c.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
