import {AbsoluteFill} from 'remotion';
import {Draw, FadeIn, useProgress} from './Draw';
import {byKey, DRAWABLES} from './drawables';
import {AXIS, CANVAS, lightStrings} from './layout';
import {PencilHand} from './PencilHand';
import {T} from './timeline';
import {mono, theme} from './theme';

/** Point at parameter t along a quadratic path of the form "M x y Q cx cy x y". */
const pointOnQuadratic = (d: string, t: number) => {
  const [mx, my, cx, cy, ex, ey] = d
    .replace(/[MQ]/g, ' ')
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const inv = 1 - t;
  return {
    x: inv * inv * mx + 2 * inv * t * cx + t * t * ex,
    y: inv * inv * my + 2 * inv * t * cy + t * t * ey,
  };
};

export const BlueprintPlan: React.FC<{showHand: boolean}> = ({showHand}) => {
  const gridOpacity = useProgress(T.grid.start, T.grid.dur);
  const sweep = useProgress(T.sweep.start, T.sweep.dur);

  return (
    <AbsoluteFill style={{backgroundColor: theme.paper}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 42%, ${theme.paper} 0%, ${theme.paperDeep} 82%)`,
        }}
      />

      <svg
        viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
        width="100%"
        height="100%"
        style={{position: 'absolute', inset: 0}}
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={theme.grid} strokeWidth={1} />
          </pattern>
          <pattern id="gridMajor" width="200" height="200" patternUnits="userSpaceOnUse">
            <path
              d="M 200 0 L 0 0 0 200"
              fill="none"
              stroke={theme.gridMajor}
              strokeWidth={1.4}
            />
          </pattern>
          <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0.4">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="45%" stopColor="rgba(190,225,255,0.16)" />
            <stop offset="55%" stopColor="rgba(190,225,255,0.16)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        <g style={{opacity: gridOpacity}}>
          <rect width={CANVAS.width} height={CANVAS.height} fill="url(#grid)" />
          <rect width={CANVAS.width} height={CANVAS.height} fill="url(#gridMajor)" />
        </g>

        {/* The plan itself. A drawing has no fills, only strokes. */}
        <g fill="none" strokeLinejoin="round" strokeLinecap="round">
          {DRAWABLES.map((item) => (
            <Draw key={item.key} start={item.start} dur={item.dur}>
              <path
                d={item.d}
                pathLength={1}
                stroke={item.stroke}
                strokeWidth={item.width}
              />
            </Draw>
          ))}

          {/* Bulbs settle onto each festoon line once the pencil has passed. */}
          {lightStrings.map((s, i) => {
            const item = byKey(`light-${i}`);
            if (!item) return null;
            return (
              <FadeIn key={s.d} start={item.start + item.dur * 0.65} dur={20}>
                {Array.from({length: s.bulbs}, (_, b) => {
                  const {x, y} = pointOnQuadratic(s.d, (b + 0.5) / s.bulbs);
                  return <circle key={b} cx={x} cy={y} r={4} fill={theme.accent} />;
                })}
              </FadeIn>
            );
          })}

          {/* Draughting notes: centre line, an overall dimension, and callouts. */}
          <FadeIn start={T.notes.start} dur={T.notes.dur}>
            <g stroke={theme.lineFaint} strokeWidth={1.4} strokeDasharray="12 10">
              <line x1={AXIS} y1={396} x2={AXIS} y2={1040} />
            </g>
            <g stroke={theme.textDim} strokeWidth={1.4}>
              <line x1={120} y1={352} x2={1800} y2={352} />
              <line x1={120} y1={338} x2={120} y2={366} />
              <line x1={1800} y1={338} x2={1800} y2={366} />
            </g>
            <g fill={theme.text} stroke="none" style={{fontFamily: mono, letterSpacing: 3}}>
              <text x={960} y={340} fontSize={22} textAnchor="middle">
                28.00 m
              </text>
              <text x={AXIS} y={700} fontSize={19} textAnchor="middle" fill={theme.textDim}>
                FOUNTAIN
              </text>
              <text x={AXIS} y={500} fontSize={19} textAnchor="middle" fill={theme.textDim}>
                HEAD TABLE
              </text>
              <text x={300} y={624} fontSize={17} textAnchor="middle" fill={theme.textDim}>
                12 x ROUND / 10 PAX
              </text>
              <text x={1616} y={624} fontSize={17} textAnchor="middle" fill={theme.textDim}>
                FESTOON LIGHTING
              </text>
              <text x={960} y={252} fontSize={17} textAnchor="middle" fill={theme.textDim}>
                SHORELINE
              </text>
            </g>
          </FadeIn>

          {/* Title block, bottom left, the way a real sheet is signed. */}
          <FadeIn start={T.titleBlock.start} dur={T.titleBlock.dur}>
            <g stroke={theme.textDim} strokeWidth={1.4}>
              <rect x={72} y={936} width={430} height={96} fill="none" />
              <line x1={72} y1={976} x2={502} y2={976} />
            </g>
            <g fill={theme.text} stroke="none" style={{fontFamily: mono}}>
              <text x={92} y={966} fontSize={22} letterSpacing={6}>
                VENUE LAYOUT / BEACH
              </text>
              <text x={92} y={1006} fontSize={15} letterSpacing={4} fill={theme.textDim}>
                TAMIR YESHAYAHU
              </text>
              <text
                x={482}
                y={1006}
                fontSize={15}
                letterSpacing={4}
                textAnchor="end"
                fill={theme.textDim}
              >
                SCALE 1:100
              </text>
            </g>
          </FadeIn>
        </g>

        {/* A single pass of light across the finished sheet, before it becomes real. */}
        <rect
          x={-CANVAS.width + sweep * CANVAS.width * 2}
          y={0}
          width={CANVAS.width}
          height={CANVAS.height}
          fill="url(#sweep)"
        />

        {showHand ? <PencilHand /> : null}
      </svg>
    </AbsoluteFill>
  );
};
