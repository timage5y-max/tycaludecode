/** Frame numbers at 30fps. The plan finishes drawing before the dissolve starts. */
export const T = {
  grid: {start: 0, dur: 26},
  surf: {start: 14, dur: 46},
  shore: {start: 24, dur: 44},
  lawn: {start: 46, dur: 40},
  structures: {start: 70, stagger: 12, dur: 34},
  fountain: {start: 96, stagger: 7, dur: 30},
  longTables: {start: 122, stagger: 11, dur: 30},
  aisle: {start: 170, dur: 32},
  rounds: {start: 186, stagger: 9, dur: 26},
  edgeTables: {start: 244, stagger: 10, dur: 26},
  arches: {start: 268, stagger: 11, dur: 32},
  pergolas: {start: 292, stagger: 13, dur: 30},
  palms: {start: 306, stagger: 12, dur: 34},
  lights: {start: 322, stagger: 9, dur: 40},
  notes: {start: 344, dur: 38},
  titleBlock: {start: 356, dur: 30},
  sweep: {start: 348, dur: 64},
  dissolve: {start: 396, dur: 46},
  logo: {start: 448, dur: 28},
} as const;

export const DURATION = 480;
