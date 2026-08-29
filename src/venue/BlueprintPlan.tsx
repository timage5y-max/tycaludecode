import {AbsoluteFill} from 'remotion';
import {Draw, FadeIn, useProgress} from './Draw';
import {T} from './timeline';
import {mono, theme} from './theme';
import {
  aisle,
  arches,
  AXIS,
  CANVAS,
  edgeTables,
  fountain,
  lawnEdge,
  lightStrings,
  longTables,
  palms,
  pergolas,
  roundTables,
  shoreline,
  structures,
  surfLines,
  type Ellipse,
  type Quad,
} from './layout';

const points = (quad: Quad) => quad.map(([x, y]) => `${x},${y}`).join(' ');

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

const Ring: React.FC<{e: Ellipse}> = ({e}) => (
  <ellipse cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} pathLength={1} />
);

export const BlueprintPlan: React.FC = () => {
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

        {/* Everything below is stroke-only: a plan has no fills. */}
        <g fill="none" stroke={theme.line} strokeWidth={2.2} strokeLinejoin="round">
          {/* Context: the sea, the water's edge, the lawn boundary. */}
          <g stroke={theme.lineFaint} strokeWidth={1.8}>
            {surfLines.map((d, i) => (
              <Draw key={d} start={T.surf.start + i * 10} dur={T.surf.dur}>
                <path d={d} pathLength={1} />
              </Draw>
            ))}
          </g>

          <Draw start={T.shore.start} dur={T.shore.dur}>
            <path d={shoreline} pathLength={1} stroke={theme.lineSoft} strokeWidth={2.4} />
          </Draw>

          <Draw start={T.lawn.start} dur={T.lawn.dur}>
            <path d={lawnEdge} pathLength={1} strokeWidth={2.6} />
          </Draw>

          {/* Bar and DJ booth along the back edge. */}
          {structures.map((quad, i) => (
            <Draw
              key={`structure-${i}`}
              start={T.structures.start + i * T.structures.stagger}
              dur={T.structures.dur}
            >
              <polygon points={points(quad)} pathLength={1} />
            </Draw>
          ))}

          {/* The fountain, drawn tier by tier from the base up. */}
          {[fountain.base, fountain.rim, fountain.bowl, fountain.stem].map((e, i) => (
            <Draw
              key={`fountain-${i}`}
              start={T.fountain.start + i * T.fountain.stagger}
              dur={T.fountain.dur}
            >
              <Ring e={e} />
            </Draw>
          ))}

          {/* Banquet tables ringing the fountain. */}
          {longTables.map((quad, i) => (
            <Draw
              key={`long-${i}`}
              start={T.longTables.start + i * T.longTables.stagger}
              dur={T.longTables.dur}
            >
              <polygon points={points(quad)} pathLength={1} />
            </Draw>
          ))}

          <Draw start={T.aisle.start} dur={T.aisle.dur}>
            <polygon
              points={points(aisle)}
              pathLength={1}
              stroke={theme.lineSoft}
              strokeWidth={1.8}
            />
          </Draw>

          {/* Guest tables, one after another, outward from the centre. */}
          {roundTables.map((e, i) => (
            <Draw
              key={`round-${i}`}
              start={T.rounds.start + i * T.rounds.stagger}
              dur={T.rounds.dur}
            >
              <Ring e={e} />
              <ellipse
                cx={e.cx}
                cy={e.cy}
                rx={e.rx * 0.28}
                ry={e.ry * 0.28}
                pathLength={1}
                stroke={theme.lineFaint}
              />
            </Draw>
          ))}

          {edgeTables.map((quad, i) => (
            <Draw
              key={`edge-${i}`}
              start={T.edgeTables.start + i * T.edgeTables.stagger}
              dur={T.edgeTables.dur}
            >
              <polygon points={points(quad)} pathLength={1} />
            </Draw>
          ))}

          {/* Foliage arches: a half-ellipse standing on the grass. */}
          {arches.map((a, i) => (
            <Draw
              key={`arch-${i}`}
              start={T.arches.start + i * T.arches.stagger}
              dur={T.arches.dur}
            >
              <path
                d={`M ${a.cx - a.rx} ${a.cy} A ${a.rx} ${a.ry} 0 0 1 ${a.cx + a.rx} ${a.cy}`}
                pathLength={1}
                stroke={theme.lineSoft}
              />
            </Draw>
          ))}

          {pergolas.map((p, i) => (
            <Draw
              key={`pergola-${i}`}
              start={T.pergolas.start + i * T.pergolas.stagger}
              dur={T.pergolas.dur}
            >
              <polygon points={points(p.roof)} pathLength={1} />
              {p.posts.map(([x1, y1, x2, y2]) => (
                <line
                  key={`${x1}-${y1}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  pathLength={1}
                  stroke={theme.lineSoft}
                />
              ))}
            </Draw>
          ))}

          {palms.map((p, i) => (
            <Draw
              key={`palm-${i}`}
              start={T.palms.start + i * T.palms.stagger}
              dur={T.palms.dur}
            >
              <path
                d={`M ${p.base[0]} ${p.base[1]} Q ${(p.base[0] + p.top[0]) / 2 + p.bend} ${
                  (p.base[1] + p.top[1]) / 2
                } ${p.top[0]} ${p.top[1]}`}
                pathLength={1}
                stroke={theme.lineSoft}
              />
              {[-1, -0.62, -0.26, 0.26, 0.62, 1].map((k) => (
                <path
                  key={k}
                  d={`M ${p.top[0]} ${p.top[1]} q ${k * 96} ${-34} ${k * 168} ${
                    58 + (1 - Math.abs(k)) * 74
                  }`}
                  pathLength={1}
                  stroke={theme.lineFaint}
                />
              ))}
            </Draw>
          ))}

          {/* Festoon lighting, with bulbs settling onto the line after it lands. */}
          {lightStrings.map((s, i) => {
            const start = T.lights.start + i * T.lights.stagger;
            return (
              <g key={s.d}>
                <Draw start={start} dur={T.lights.dur}>
                  <path d={s.d} pathLength={1} stroke={theme.lineFaint} strokeWidth={1.6} />
                </Draw>
                <FadeIn start={start + T.lights.dur * 0.6} dur={20}>
                  {Array.from({length: s.bulbs}, (_, b) => {
                    const {x, y} = pointOnQuadratic(s.d, (b + 0.5) / s.bulbs);
                    return (
                      <circle
                        key={b}
                        cx={x}
                        cy={y}
                        r={4}
                        fill={theme.accent}
                        stroke="none"
                      />
                    );
                  })}
                </FadeIn>
              </g>
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
            <g
              fill={theme.text}
              stroke="none"
              style={{fontFamily: mono, letterSpacing: 3}}
            >
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
              <text x={482} y={1006} fontSize={15} letterSpacing={4} textAnchor="end" fill={theme.textDim}>
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
      </svg>
    </AbsoluteFill>
  );
};
