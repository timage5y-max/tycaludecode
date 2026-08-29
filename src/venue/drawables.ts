// One ordered list of strokes, used twice: the plan renders it, and the hand
// reads it to know where the pencil tip is on any given frame. Keeping both off
// the same source is what stops the two from drifting apart.

import {
  aisle,
  arches,
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
import {theme} from './theme';

export type Drawable = {
  key: string;
  d: string;
  start: number;
  dur: number;
  stroke: string;
  width: number;
};

const ellipseD = (e: Ellipse) =>
  `M ${e.cx - e.rx} ${e.cy} A ${e.rx} ${e.ry} 0 1 0 ${e.cx + e.rx} ${e.cy}` +
  ` A ${e.rx} ${e.ry} 0 1 0 ${e.cx - e.rx} ${e.cy} Z`;

const quadD = (q: Quad) => `M ${q.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`;

/** A table and the centrepiece on it, traced without lifting the pencil twice. */
const roundD = (e: Ellipse) =>
  `${ellipseD(e)} ${ellipseD({...e, rx: e.rx * 0.28, ry: e.ry * 0.28})}`;

const pergolaD = (p: (typeof pergolas)[number]) =>
  quadD(p.roof) + p.posts.map(([x1, y1, x2, y2]) => ` M ${x1} ${y1} L ${x2} ${y2}`).join('');

const palmD = (p: (typeof palms)[number]) => {
  const mx = (p.base[0] + p.top[0]) / 2 + p.bend;
  const my = (p.base[1] + p.top[1]) / 2;
  const trunk = `M ${p.base[0]} ${p.base[1]} Q ${mx} ${my} ${p.top[0]} ${p.top[1]}`;
  const fronds = [-1, -0.62, -0.26, 0.26, 0.62, 1]
    .map(
      (k) =>
        ` M ${p.top[0]} ${p.top[1]} q ${k * 96} ${-34} ${k * 168} ${
          58 + (1 - Math.abs(k)) * 74
        }`,
    )
    .join('');
  return trunk + fronds;
};

const archD = (a: (typeof arches)[number]) =>
  `M ${a.cx - a.rx} ${a.cy} A ${a.rx} ${a.ry} 0 0 1 ${a.cx + a.rx} ${a.cy}`;

type Spec = Omit<Drawable, 'start'>;

const spec = (
  key: string,
  d: string,
  dur: number,
  stroke: string = theme.line,
  width = 2.2,
): Spec => ({
  key,
  d,
  dur,
  stroke,
  width,
});

/** Where the pencil touches down for a stroke. Closed shapes end here too. */
const startPoint = (d: string) => {
  const m = d.match(/M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/);
  return m ? {x: Number(m[1]), y: Number(m[2])} : {x: 0, y: 0};
};

/**
 * Within a group, draw whatever is nearest to hand next. Listing the tables in
 * their natural left-right order would send the pencil skating back and forth
 * across the sheet; this keeps it working an area at a time, the way a person
 * would.
 */
const nearestFirst = (items: Spec[], from: {x: number; y: number}) => {
  const rest = [...items];
  const out: Spec[] = [];
  let at = from;

  while (rest.length) {
    let best = 0;
    let bestDist = Infinity;
    rest.forEach((item, i) => {
      const p = startPoint(item.d);
      const dist = (p.x - at.x) ** 2 + (p.y - at.y) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    const [picked] = rest.splice(best, 1);
    out.push(picked);
    at = startPoint(picked.d);
  }

  return out;
};

/** Draw order: the setting first, then the centrepiece, then outward to the edges. */
const specs: Spec[] = (() => {
  const fixed: Spec[] = [
    ...surfLines.map((d, i) => spec(`surf-${i}`, d, 34, theme.lineFaint, 1.8)),
    spec('shore', shoreline, 40, theme.lineSoft, 2.4),
    spec('lawn', lawnEdge, 40, theme.line, 2.6),
    ...structures.map((q, i) => spec(`structure-${i}`, quadD(q), 26)),
    spec(
      'fountain',
      [fountain.base, fountain.rim, fountain.bowl, fountain.stem].map(ellipseD).join(' '),
      44,
    ),
  ];

  const groups: Spec[][] = [
    longTables.map((q, i) => spec(`long-${i}`, quadD(q), 24)),
    [spec('aisle', quadD(aisle), 20, theme.lineSoft, 1.8)],
    roundTables.map((e, i) => spec(`round-${i}`, roundD(e), 22)),
    edgeTables.map((q, i) => spec(`edge-${i}`, quadD(q), 20)),
    arches.map((a, i) => spec(`arch-${i}`, archD(a), 22, theme.lineSoft)),
    pergolas.map((p, i) => spec(`pergola-${i}`, pergolaD(p), 26)),
    palms.map((p, i) => spec(`palm-${i}`, palmD(p), 32, theme.lineSoft)),
    lightStrings.map((s, i) => spec(`light-${i}`, s.d, 26, theme.lineFaint, 1.6)),
  ];

  const out = [...fixed];
  let at = startPoint(fixed[fixed.length - 1].d);

  for (const group of groups) {
    const ordered = nearestFirst(group, at);
    out.push(...ordered);
    at = startPoint(ordered[ordered.length - 1].d);
  }

  return out;
})();

/**
 * Strokes overlap a little so the plan keeps moving, but not so much that the
 * hand appears to be drawing several things at once.
 */
const OVERLAP = 0.45;
const FIRST_STROKE = 10;

export const DRAWABLES: Drawable[] = (() => {
  let cursor = FIRST_STROKE;
  return specs.map((s) => {
    const start = Math.round(cursor);
    cursor += s.dur * OVERLAP;
    return {...s, start};
  });
})();

export const byKey = (key: string) => DRAWABLES.find((d) => d.key === key);

export const DRAW_END = Math.max(...DRAWABLES.map((d) => d.start + d.dur));
