import {interpolate, useCurrentFrame} from 'remotion';
import type {ReactNode} from 'react';
import {easeInOutCubic, easeOutCubic} from './easing';

export const useProgress = (start: number, dur: number, ease = easeOutCubic) => {
  const frame = useCurrentFrame();
  const linear = interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return ease(linear);
};

/**
 * Reveals its children as if a pen were tracing them. Children must carry
 * pathLength={1} so the dash pattern is expressed as a fraction of the stroke,
 * whatever its real length; stroke-dasharray and stroke-dashoffset inherit, so
 * setting them once on the group drives every shape inside it.
 */
export const Draw: React.FC<{
  start: number;
  dur: number;
  children: ReactNode;
}> = ({start, dur, children}) => {
  const progress = useProgress(start, dur, easeInOutCubic);

  return (
    <g
      style={{
        strokeDasharray: 1,
        strokeDashoffset: 1 - progress,
      }}
    >
      {children}
    </g>
  );
};

/** For marks that read better appearing than being traced: bulbs, text, hatching. */
export const FadeIn: React.FC<{
  start: number;
  dur: number;
  children: ReactNode;
}> = ({start, dur, children}) => {
  const opacity = useProgress(start, dur);
  return <g style={{opacity}}>{children}</g>;
};
