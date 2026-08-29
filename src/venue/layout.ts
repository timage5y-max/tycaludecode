// Every coordinate lives in the photograph's own 1920x1080 frame, so the plan
// sits exactly on top of the venue it describes and the cross-dissolve lands
// element for element instead of just swapping two pictures.
//
// Positions were measured off the photograph rather than eyeballed: table
// centres come from peak detection on a "not grass" mask, and the symmetry axis
// below is the midpoint four independent left/right pairs agreed on.

export const CANVAS = {width: 1920, height: 1080};

export const AXIS = 982;

export type Ellipse = {cx: number; cy: number; rx: number; ry: number};
export type Quad = [number, number][];

/**
 * Round tables sit further from the lens the higher they are in frame, so both
 * their size and how circular they look follow their depth.
 */
const round = (cx: number, cy: number): Ellipse => {
  const depth = (cy - 490) / 560;
  const rx = 51 + depth * 41;
  return {cx, cy, rx, ry: rx * (0.5 + depth * 0.17)};
};

export const roundTables: Ellipse[] = [
  round(702, 512),
  round(1239, 520),
  round(294, 553),
  round(1609, 555),
  round(322, 652),
  round(1620, 633),
  round(758, 700),
  round(1203, 700),
  round(378, 790),
  round(1602, 772),
  round(597, 846),
  round(1365, 844),
];

/** Banquet tables ringing the fountain, drawn as perspective quads. */
export const longTables: Quad[] = [
  // Head table, directly behind the fountain.
  [
    [868, 520],
    [1096, 520],
    [1104, 578],
    [860, 578],
  ],
  // Two wings either side of the fountain, upper then lower.
  [
    [648, 584],
    [872, 584],
    [878, 644],
    [640, 644],
  ],
  [
    [1092, 584],
    [1316, 584],
    [1324, 644],
    [1086, 644],
  ],
  [
    [640, 650],
    [878, 650],
    [886, 706],
    [630, 706],
  ],
  [
    [1086, 650],
    [1324, 650],
    [1334, 706],
    [1078, 706],
  ],
  // Tables running down either side of the aisle, toward the camera.
  [
    [812, 726],
    [908, 726],
    [922, 890],
    [800, 890],
  ],
  [
    [1062, 726],
    [1158, 726],
    [1172, 890],
    [1050, 890],
  ],
];

/** The pale runner leading from the fountain to the near edge of the lawn. */
export const aisle: Quad = [
  [940, 704],
  [1028, 704],
  [1044, 1010],
  [922, 1010],
];

export const fountain = {
  base: {cx: 978, cy: 612, rx: 116, ry: 50} as Ellipse,
  rim: {cx: 978, cy: 604, rx: 84, ry: 35} as Ellipse,
  bowl: {cx: 978, cy: 586, rx: 46, ry: 19} as Ellipse,
  stem: {cx: 978, cy: 560, rx: 18, ry: 9} as Ellipse,
};

/** Lounge tables tucked under the pergolas at either edge of frame. */
const edgeTable = (cx: number, cy: number, w: number, h: number): Quad => [
  [cx - w / 2, cy - h / 2],
  [cx + w / 2, cy - h / 2 - 6],
  [cx + w / 2 + 8, cy + h / 2 - 6],
  [cx - w / 2 - 8, cy + h / 2],
];

export const edgeTables: Quad[] = [
  edgeTable(20, 535, 180, 62),
  edgeTable(62, 655, 210, 74),
  edgeTable(112, 766, 230, 86),
  edgeTable(1821, 498, 200, 66),
  edgeTable(1861, 640, 214, 76),
  edgeTable(1816, 749, 232, 88),
];

/** Foliage arches. Each is a semi-ellipse standing on the lawn. */
export const arches = [
  {cx: 662, cy: 462, rx: 60, ry: 96},
  {cx: 1288, cy: 458, rx: 60, ry: 96},
  {cx: 432, cy: 700, rx: 70, ry: 120},
  {cx: 1486, cy: 696, rx: 70, ry: 120},
];

/** Pergola roofs at the left and right edges, with their corner posts. */
export const pergolas = [
  {
    roof: [
      [-20, 466],
      [168, 450],
      [184, 516],
      [-20, 534],
    ] as Quad,
    posts: [
      [16, 520, 16, 700],
      [168, 508, 168, 664],
    ] as [number, number, number, number][],
  },
  {
    roof: [
      [1940, 466],
      [1720, 448],
      [1704, 516],
      [1940, 534],
    ] as Quad,
    posts: [
      [1904, 520, 1904, 700],
      [1720, 506, 1720, 664],
    ] as [number, number, number, number][],
  },
];

/** Service structures along the back of the lawn: the bar and the DJ booth. */
export const structures: Quad[] = [
  [
    [782, 404],
    [1180, 398],
    [1184, 466],
    [778, 472],
  ],
  [
    [428, 394],
    [618, 390],
    [622, 446],
    [424, 450],
  ],
];

/** Palm trunks, from base on the lawn up out of frame. */
export const palms = [
  {base: [368, 430] as [number, number], top: [300, 72] as [number, number], bend: 42},
  {base: [1612, 446] as [number, number], top: [1684, 84] as [number, number], bend: -42},
];

/** Water's edge and the sand/lawn boundary, as gently irregular lines. */
export const shoreline =
  'M -20 210 C 300 190, 620 228, 940 206 S 1560 182, 1940 214';

export const surfLines = [
  'M -20 108 C 340 92, 700 126, 1060 104 S 1620 86, 1940 116',
  'M -20 160 C 380 146, 660 176, 1000 156 S 1600 138, 1940 166',
];

export const lawnEdge =
  'M -20 408 C 340 396, 700 414, 1020 402 S 1620 392, 1940 416';

/** Catenaries of festoon lighting strung across the lawn. */
export const lightStrings = [
  {d: 'M 96 500 Q 520 592, 940 504', bulbs: 7},
  {d: 'M 940 504 Q 1400 592, 1848 498', bulbs: 7},
  {d: 'M 150 704 Q 560 804, 900 710', bulbs: 6},
  {d: 'M 1060 710 Q 1420 804, 1800 704', bulbs: 6},
];
