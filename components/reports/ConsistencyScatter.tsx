import { SCATTER, SCATTER_AXES as A, type ScatterPoint } from '@/lib/reports-data';

const HEIGHT = 400;
const X_TICKS = [60, 70, 80, 90, 100, 110, 120, 130];
const Y_TICKS = [24, 18, 12, 6, 0];

const xPct = (x: number) => ((x - A.xMin) / (A.xMax - A.xMin)) * 100;
/** Top-down, because the plot is drawn from the top edge. */
const yPct = (y: number) => (1 - (y - A.yMin) / (A.yMax - A.yMin)) * 100;

function Dot({ point }: { point: ScatterPoint }) {
  const left = `${xPct(point.x)}%`;
  const top = `${yPct(point.y)}%`;
  return (
    <>
      <span
        style={{
          position: 'absolute',
          left,
          top,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          ...(point.lateRun
            ? {
                width: 13,
                height: 13,
                background: 'var(--white)',
                border: '3px solid var(--amber)',
              }
            : { width: 11, height: 11, background: 'var(--navy)' }),
        }}
      />
      {point.label ? (
        <span
          style={{
            position: 'absolute',
            left: `calc(${left} + 10px)`,
            top: `calc(${top} - 18px)`,
            fontSize: 12,
            fontWeight: 700,
            color: point.lateRun ? 'var(--amber)' : 'var(--navy)',
            whiteSpace: 'nowrap',
          }}
        >
          {point.label}
        </span>
      ) : null}
    </>
  );
}

export function ConsistencyScatter() {
  const xDiv = xPct(A.xDivider);
  const yDiv = yPct(A.yDivider);

  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {/* Y axis — standard deviation of the twelve monthly scores. */}
      <div style={{ width: 34, flex: 'none', position: 'relative', height: HEIGHT }}>
        {Y_TICKS.map((tick) => (
          <div
            key={tick}
            className="num"
            style={{
              position: 'absolute',
              right: 0,
              top: `calc(${yPct(tick)}% - 7px)`,
              fontSize: 11.5,
              color: 'var(--grey-body)',
            }}
          >
            {tick}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div
          style={{
            position: 'relative',
            height: HEIGHT,
            borderLeft: '1px solid var(--navy)',
            borderBottom: '1px solid var(--navy)',
            background: 'var(--white)',
          }}
        >
          {/* Steady and at or above target. */}
          <div
            style={{
              position: 'absolute',
              left: `${xDiv}%`,
              right: 0,
              top: `${yDiv}%`,
              bottom: 0,
              background: 'var(--tint-green)',
            }}
          />
          {/* Variable and below target. */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              width: `${xDiv}%`,
              top: 0,
              height: `${yDiv}%`,
              background: 'var(--tint-red)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `${xDiv}%`,
              top: 0,
              bottom: 0,
              width: 1,
              background: 'var(--grey-line)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${yDiv}%`,
              height: 1,
              background: 'var(--grey-line)',
            }}
          />

          {(
            [
              ['Variable, below target', 'var(--red)', { left: '1.5%', top: '3%' }],
              ['Variable, at or above target', 'var(--amber)', { left: '59%', top: '3%' }],
              ['Steady, below target', 'var(--grey-body)', { left: '1.5%', bottom: '3%' }],
              ['Steady, at or above target', 'var(--green)', { left: '59%', bottom: '3%' }],
            ] as const
          ).map(([label, colour, pos]) => (
            <div
              key={label}
              style={{
                position: 'absolute',
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: colour,
                ...pos,
              }}
            >
              {label}
            </div>
          ))}

          {SCATTER.map((point, i) => (
            <Dot key={`${point.x}-${point.y}-${i}`} point={point} />
          ))}
        </div>

        <div style={{ position: 'relative', height: 18 }}>
          {X_TICKS.map((tick) => (
            <span
              key={tick}
              className="num"
              style={{
                position: 'absolute',
                left: `${xPct(tick)}%`,
                transform: 'translateX(-50%)',
                fontSize: 11.5,
                fontWeight: tick === A.xDivider ? 700 : 400,
                color: tick === A.xDivider ? 'var(--navy)' : 'var(--grey-body)',
              }}
            >
              {tick}
            </span>
          ))}
        </div>

        <div
          style={{
            textAlign: 'center',
            fontSize: 12.5,
            fontWeight: 700,
            color: 'var(--navy)',
            letterSpacing: '.04em',
          }}
        >
          Year average score →
        </div>
      </div>
    </div>
  );
}
