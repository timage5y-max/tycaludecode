import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {BlueprintPlan} from './BlueprintPlan';
import {easeInOutCubic} from './easing';
import {mono, theme} from './theme';
import {T} from './timeline';

/** Drop the aerial photograph here; the plan is traced onto its exact framing. */
export const PHOTO = 'venue.png';

export const VenueReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();

  const dissolve = easeInOutCubic(
    interpolate(frame, [T.dissolve.start, T.dissolve.start + T.dissolve.dur], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  // One slow push shared by both layers, so the dissolve reads as the drawing
  // filling in rather than as two separate images being swapped.
  const zoom =
    1 + easeInOutCubic(interpolate(frame, [0, durationInFrames], [0, 1])) * 0.045;

  const logoOpacity = interpolate(frame, [T.logo.start, T.logo.start + T.logo.dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const openFade = interpolate(frame, [0, 14], [0, 1], {extrapolateRight: 'clamp'});
  const endFade = interpolate(frame, [durationInFrames - 16, durationInFrames - 1], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#000', opacity: openFade * endFade}}>
      <AbsoluteFill style={{transform: `scale(${zoom})`}}>
        {/* The finished venue sits underneath and is uncovered by the plan fading off. */}
        <Sequence from={T.dissolve.start - 12} layout="none">
          <AbsoluteFill style={{opacity: dissolve}}>
            <Img
              src={staticFile(PHOTO)}
              style={{width: '100%', height: '100%', objectFit: 'cover'}}
            />
          </AbsoluteFill>
        </Sequence>

        <AbsoluteFill style={{opacity: 1 - dissolve}}>
          <BlueprintPlan />
        </AbsoluteFill>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 64,
          opacity: logoOpacity,
        }}
      >
        <div
          style={{
            fontFamily: mono,
            fontSize: 62,
            letterSpacing: 10,
            color: '#fff',
            textShadow: '0 4px 24px rgba(0,0,0,0.55)',
          }}
        >
          TY
        </div>
        <div
          style={{
            fontFamily: mono,
            fontSize: 18,
            letterSpacing: 9,
            marginTop: 10,
            color: 'rgba(255,255,255,0.88)',
            textShadow: '0 2px 16px rgba(0,0,0,0.6)',
          }}
        >
          TAMIR YESHAYAHU
        </div>
        <div
          style={{
            fontFamily: mono,
            fontSize: 12,
            letterSpacing: 8,
            marginTop: 6,
            color: theme.textDim,
            textShadow: '0 2px 16px rgba(0,0,0,0.6)',
          }}
        >
          VIDEO ARTIST
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
