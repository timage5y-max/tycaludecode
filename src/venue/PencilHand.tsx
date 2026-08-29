import {interpolate, useCurrentFrame} from 'remotion';
import {useMemo} from 'react';
import {DRAWABLES, DRAW_END} from './drawables';
import {easeInOutCubic} from './easing';
import {T} from './timeline';
import {theme} from './theme';

/**
 * Measuring a path costs nothing after the first call, and the geometry never
 * changes, so one detached element per stroke is enough for the whole film.
 */
const measured = new Map<string, SVGPathElement>();

const pathFor = (d: string) => {
  let el = measured.get(d);
  if (!el) {
    el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    el.setAttribute('d', d);
    measured.set(d, el);
  }
  return el;
};

const pointAt = (d: string, t: number) => {
  const el = pathFor(d);
  const p = el.getPointAtLength(el.getTotalLength() * Math.min(1, Math.max(0, t)));
  return {x: p.x, y: p.y};
};

type Pen = {x: number; y: number; lifted: number};

/**
 * Where the pencil is. While a stroke is being drawn the tip sits on its
 * leading edge - the same eased progress the stroke itself uses, so the two
 * cannot disagree. Between strokes the hand travels to the next start and
 * lifts off the paper on the way.
 */
const usePen = (): Pen | null => {
  const frame = useCurrentFrame();

  return useMemo(() => {
    const active = DRAWABLES.filter(
      (d) => frame >= d.start && frame <= d.start + d.dur,
    ).sort((a, b) => b.start - a.start)[0];

    if (active) {
      const t = easeInOutCubic((frame - active.start) / active.dur);
      return {...pointAt(active.d, t), lifted: 0};
    }

    const prev = [...DRAWABLES].reverse().find((d) => d.start + d.dur < frame);
    const next = DRAWABLES.find((d) => d.start > frame);
    if (!prev || !next) {
      return null;
    }

    const from = pointAt(prev.d, 1);
    const to = pointAt(next.d, 0);
    const gapStart = prev.start + prev.dur;
    const span = Math.max(1, next.start - gapStart);
    const k = easeInOutCubic(Math.min(1, (frame - gapStart) / span));

    return {
      x: from.x + (to.x - from.x) * k,
      y: from.y + (to.y - from.y) * k,
      lifted: Math.sin(Math.PI * k),
    };
  }, [frame]);
};

/**
 * The hand is built tip-first: the pencil lies along +X with its point at the
 * origin, everything else is placed around that axis, and the whole assembly is
 * rotated so the barrel recedes toward the lower right - the angle you see when
 * you look down at your own hand drawing on a sheet.
 */
const PENCIL_ANGLE = 36;

const HAND_FILL = 'rgba(6, 22, 37, 0.88)';
const HAND_EDGE = 'rgba(206, 233, 252, 0.34)';

export const PencilHand: React.FC = () => {
  const frame = useCurrentFrame();
  const pen = usePen();

  const opacity =
    interpolate(frame, [DRAWABLES[0].start - 6, DRAWABLES[0].start + 12], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }) *
    interpolate(frame, [T.handOut.start, T.handOut.start + T.handOut.dur], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

  if (!pen || frame > DRAW_END + T.handOut.dur + 12) {
    return null;
  }

  // A little life in the wrist, and a lift off the page between strokes.
  const wobble = Math.sin(frame * 0.42) * 1.1 + Math.sin(frame * 0.17) * 0.6;
  const lift = pen.lifted * 10;

  return (
    <g style={{opacity}}>
      <defs>
        <filter id="handShadow" x="-30%" y="-30%" width="180%" height="180%">
          <feDropShadow
            dx={16}
            dy={22}
            stdDeviation={18}
            floodColor="#00060d"
            floodOpacity={0.5}
          />
        </filter>
        <radialGradient id="tipGlow">
          <stop offset="0%" stopColor="rgba(255,236,190,0.8)" />
          <stop offset="100%" stopColor="rgba(255,236,190,0)" />
        </radialGradient>
      </defs>

      {/* The mark being made, so the eye has something to follow. */}
      <circle cx={pen.x} cy={pen.y} r={24} fill="url(#tipGlow)" />

      <g
        transform={`translate(${pen.x - lift * 0.4}, ${pen.y - lift}) rotate(${
          PENCIL_ANGLE + wobble
        })`}
        filter="url(#handShadow)"
      >
        <g fill={HAND_FILL} stroke={HAND_EDGE} strokeWidth={2} strokeLinejoin="round">
          {/* Forearm, running off the edge of frame so the hand is attached to someone. */}
          <path d="M 424 -34 C 520 14, 760 132, 1180 330 L 1180 560 C 760 372, 500 232, 408 168 Z" />

          {/* Back of the hand. */}
          <path
            d="M 236 -96 C 306 -104, 380 -80, 426 -34
               C 466 6, 470 70, 440 110 C 404 156, 322 164, 262 134
               C 212 110, 188 58, 194 8 C 198 -42, 210 -82, 236 -96 Z"
          />

          {/* Knuckle ridge. */}
          <g fill="none" stroke={HAND_EDGE} strokeWidth={1.6} opacity={0.55}>
            <path d="M 268 -74 C 292 -44, 300 -6, 288 30" />
            <path d="M 326 -72 C 350 -42, 358 -4, 346 32" />
            <path d="M 382 -58 C 404 -28, 410 6, 398 40" />
          </g>
        </g>

        {/* Pencil, tip at the origin, drawn between the palm and the fingers. */}
        <g stroke={theme.lineSoft} strokeWidth={2} strokeLinejoin="round">
          <path d="M 0 0 L 28 -6 L 28 6 Z" fill="#08161f" stroke="none" />
          <path d="M 28 -6 L 60 -14 L 60 14 L 28 6 Z" fill="rgba(255,236,190,0.26)" />
          <path d="M 60 -14 L 300 -14 L 300 14 L 60 14 Z" fill="rgba(255,236,190,0.17)" />
          <path d="M 60 -4 L 300 -4" strokeWidth={1.2} opacity={0.45} />
          <path d="M 300 -14 L 326 -14 L 326 14 L 300 14 Z" fill="rgba(206,233,252,0.24)" />
          <path
            d="M 326 -13 L 342 -13 Q 352 0, 342 13 L 326 13 Z"
            fill="rgba(255,190,180,0.3)"
          />
        </g>

        {/* Index finger and thumb close on the barrel; the rest tuck underneath. */}
        <g fill={HAND_FILL} stroke={HAND_EDGE} strokeWidth={2}>
          <rect
            x={92}
            y={-70}
            width={190}
            height={46}
            rx={23}
            transform="rotate(-8 187 -47)"
          />
          <rect
            x={104}
            y={16}
            width={176}
            height={44}
            rx={22}
            transform="rotate(7 192 38)"
          />
          <rect
            x={168}
            y={58}
            width={158}
            height={42}
            rx={21}
            transform="rotate(13 247 79)"
          />
        </g>
      </g>
    </g>
  );
};
