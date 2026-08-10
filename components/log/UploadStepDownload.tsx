import { Card, SectionLabel } from '@/components/ui';
import { TEMPLATE_PREVIEW, UPLOAD_CONTEXT as U } from '@/lib/upload-data';

const cellBorder = '1px solid var(--grey-surface)';

function ColHead({
  label,
  align = 'left',
  highlight,
  width,
}: {
  label: string;
  align?: 'left' | 'right';
  highlight?: boolean;
  width?: number;
}) {
  return (
    <th
      style={{
        textAlign: align,
        fontWeight: 700,
        color: highlight ? 'var(--blue)' : 'var(--grey-body)',
        padding: '8px 10px',
        borderRight: cellBorder,
        background: highlight ? 'var(--tint-blue)' : undefined,
        width,
      }}
    >
      {label}
    </th>
  );
}

export function UploadStepDownload() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 320px',
        gap: 20,
        alignItems: 'start',
      }}
    >
      <Card style={{ padding: '22px 26px 24px' }}>
        <div className="stack" style={{ gap: 18 }}>
          <div className="spread" style={{ alignItems: 'baseline' }}>
            <SectionLabel>What you are about to download</SectionLabel>
            <span className="num" style={{ fontSize: 13, color: 'var(--grey-body)' }}>
              {U.templateName} · {U.templateRows} rows · {U.templateSize}
            </span>
          </div>

          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, maxWidth: '92ch' }}>
            Every column below is already filled from the KPI master.{' '}
            <strong style={{ color: 'var(--navy)' }}>
              Type into the Actual column only.
            </strong>{' '}
            Do not add rows, rename columns or change targets — a changed target is
            rejected on upload, not silently accepted.
          </p>

          <div
            style={{
              border: '1px solid var(--grey-line)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
            }}
          >
            <div
              className="row"
              style={{
                gap: 10,
                padding: '9px 14px',
                background: 'var(--grey-surface)',
                borderBottom: '1px solid var(--grey-line)',
              }}
            >
              <span
                className="num"
                style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}
              >
                Sheet 1 of 1 · February 2026
              </span>
              <span
                style={{ fontSize: 13, color: 'var(--grey-body)', marginLeft: 'auto' }}
              >
                Preview of the first {TEMPLATE_PREVIEW.length} rows of {U.templateRows}
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ background: 'var(--panel)' }}>
                  <ColHead label="A" width={34} />
                  <ColHead label="B" />
                  <ColHead label="C" />
                  <ColHead label="D" align="right" />
                  <ColHead label="E" align="right" />
                  <ColHead label="F" align="right" highlight />
                  <th
                    style={{
                      textAlign: 'left',
                      fontWeight: 700,
                      color: 'var(--grey-body)',
                      padding: '8px 10px',
                    }}
                  >
                    G
                  </th>
                </tr>
                <tr style={{ background: 'var(--grey-surface)' }}>
                  {['#', 'Employee ID', 'Key result area'].map((label) => (
                    <th
                      key={label}
                      style={{
                        textAlign: 'left',
                        fontWeight: 700,
                        color: 'var(--navy)',
                        padding: '9px 10px',
                        borderRight: '1px solid var(--grey-line)',
                      }}
                    >
                      {label}
                    </th>
                  ))}
                  {['Weight', 'Target'].map((label) => (
                    <th
                      key={label}
                      style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        color: 'var(--navy)',
                        padding: '9px 10px',
                        borderRight: '1px solid var(--grey-line)',
                      }}
                    >
                      {label}
                    </th>
                  ))}
                  <th
                    style={{
                      textAlign: 'right',
                      fontWeight: 700,
                      color: 'var(--blue)',
                      padding: '9px 10px',
                      borderRight: '1px solid var(--grey-line)',
                      background: 'var(--tint-blue)',
                    }}
                  >
                    Actual
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      fontWeight: 700,
                      color: 'var(--navy)',
                      padding: '9px 10px',
                    }}
                  >
                    Context note
                  </th>
                </tr>
              </thead>
              <tbody>
                {TEMPLATE_PREVIEW.map((row, i) => (
                  <tr
                    key={row.n}
                    style={{
                      borderBottom:
                        i < TEMPLATE_PREVIEW.length - 1 ? cellBorder : undefined,
                    }}
                  >
                    <td
                      className="num"
                      style={{ padding: '9px 10px', color: 'var(--grey-body)', borderRight: cellBorder }}
                    >
                      {row.n}
                    </td>
                    <td
                      className="num"
                      style={{ padding: '9px 10px', color: 'var(--navy)', borderRight: cellBorder }}
                    >
                      {row.employeeId}
                    </td>
                    <td style={{ padding: '9px 10px', borderRight: cellBorder }}>
                      {row.kra}
                      {row.lowerIsBetter ? (
                        <span style={{ color: 'var(--amber)', fontWeight: 700 }}>
                          {' '}
                          · lower is better
                        </span>
                      ) : null}
                    </td>
                    <td
                      className="num"
                      style={{ padding: '9px 10px', textAlign: 'right', borderRight: cellBorder }}
                    >
                      {row.weight}%
                    </td>
                    <td
                      className="num"
                      style={{ padding: '9px 10px', textAlign: 'right', borderRight: cellBorder }}
                    >
                      {row.target}
                    </td>
                    {/* The one column a lead is meant to type into. */}
                    <td style={{ padding: '9px 10px', background: '#f7fbfe', borderRight: cellBorder }} />
                    <td style={{ padding: '9px 10px' }} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            className="spread"
            style={{ gap: 24, borderTop: cellBorder, paddingTop: 18 }}
          >
            <div
              style={{
                fontSize: 13.5,
                color: 'var(--grey-body)',
                maxWidth: '56ch',
                lineHeight: 1.5,
              }}
            >
              Downloading does not reserve or lock anything. You can download again at any
              point before 7 March; the file always reflects the current KPI master.
            </div>
            <button type="button" className="btn btn--primary btn--large" style={{ flex: 'none' }}>
              Download template
            </button>
          </div>
        </div>
      </Card>

      <div className="stack" style={{ gap: 16 }}>
        <Card tone="navy" style={{ padding: '18px 20px 20px' }}>
          <div className="stack" style={{ gap: 10 }}>
            <SectionLabel tone="navy">In this file</SectionLabel>
            {[
              ['Employees', String(U.employees)],
              ['Rows', String(U.rows)],
              ['KRAs per person', String(U.krasPerPerson)],
              ['Already logged', `${U.alreadyLogged} of ${U.employees}`],
            ].map(([label, value]) => (
              <div key={label} className="spread" style={{ fontSize: 14 }}>
                <span>{label}</span>
                <span className="num" style={{ fontWeight: 700, color: 'var(--navy)' }}>
                  {value}
                </span>
              </div>
            ))}
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.5,
                color: 'var(--grey-body)',
                marginTop: 4,
              }}
            >
              The {U.alreadyLogged} already logged are included with their saved actuals
              filled in. Overwriting them is allowed and is recorded in the activity log.
            </div>
          </div>
        </Card>

        <div className="callout callout--info" style={{ padding: '16px 18px' }}>
          <div className="callout__title">Excel, not a new habit</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--grey-body)' }}>
            CRM already tracks collection and SLA in a monthly sheet. This route exists so
            that sheet stays the source and nobody retypes it.
          </div>
        </div>
      </div>
    </div>
  );
}
