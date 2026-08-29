import {DRAW_END} from './drawables';

/**
 * Frame numbers at 30fps. Everything after the plan is measured from the last
 * stroke, so retiming the drawing carries the rest of the film with it.
 */
export const T = {
  grid: {start: 0, dur: 26},
  handOut: {start: DRAW_END + 6, dur: 22},
  notes: {start: DRAW_END - 26, dur: 38},
  titleBlock: {start: DRAW_END - 10, dur: 30},
  sweep: {start: DRAW_END + 4, dur: 64},
  dissolve: {start: DRAW_END + 58, dur: 46},
  logo: {start: DRAW_END + 110, dur: 28},
} as const;

export const DURATION = T.logo.start + T.logo.dur + 34;
