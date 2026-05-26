import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {useEffect, useState} from 'react';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const fontFamily = 'CinematicSerif';

const loadFonts = async () => {
  const regular = new FontFace(
    fontFamily,
    `url(${staticFile('fonts/CinematicSerif.ttf')}) format('truetype')`,
    {weight: '400'},
  );
  const bold = new FontFace(
    fontFamily,
    `url(${staticFile('fonts/CinematicSerif-Bold.ttf')}) format('truetype')`,
    {weight: '700'},
  );
  await Promise.all([regular.load(), bold.load()]);
  document.fonts.add(regular);
  document.fonts.add(bold);
};

export const YoutubeIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames, height} = useVideoConfig();
  const [handle] = useState(() => delayRender('Loading cinematic font'));

  useEffect(() => {
    loadFonts()
      .then(() => continueRender(handle))
      .catch((err) => cancelRender(err));
  }, [handle]);

  const barHeight = height * 0.1;
  const barProgress = interpolate(frame, [0, 35], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const barOffset = interpolate(easeOutCubic(barProgress), [0, 1], [-barHeight, 0]);

  const filmByOpacity = interpolate(frame, [30, 65], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const filmByLetterSpacing = interpolate(frame, [30, 110], [32, 16], {
    extrapolateRight: 'clamp',
  });
  const filmByTranslateY = interpolate(frame, [30, 65], [12, 0], {
    extrapolateRight: 'clamp',
  });

  const nameOpacity = interpolate(frame, [80, 125], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const nameLetterSpacing = interpolate(frame, [80, 170], [24, 14], {
    extrapolateRight: 'clamp',
  });
  const nameTranslateY = interpolate(frame, [80, 125], [16, 0], {
    extrapolateRight: 'clamp',
  });

  const slowZoomProgress = interpolate(frame, [0, durationInFrames], [0, 1]);
  const slowZoom = 1 + easeInOutCubic(slowZoomProgress) * 0.05;

  const fadeOutProgress = interpolate(
    frame,
    [durationInFrames - 75, durationInFrames - 1],
    [0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  const fadeOutOpacity = 1 - easeInOutCubic(fadeOutProgress);

  const vignetteOpacity = interpolate(frame, [0, 40], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#000', opacity: fadeOutOpacity}}>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(18,16,14,1) 0%, rgba(0,0,0,1) 78%)',
          opacity: vignetteOpacity,
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          fontFamily,
          transform: `scale(${slowZoom})`,
        }}
      >
        <div
          style={{
            fontSize: 36,
            color: 'rgba(230, 220, 200, 0.7)',
            opacity: filmByOpacity,
            letterSpacing: filmByLetterSpacing,
            textTransform: 'uppercase',
            fontWeight: 400,
            marginBottom: 52,
            transform: `translateY(${filmByTranslateY}px)`,
          }}
        >
          film by
        </div>

        <div
          style={{
            fontSize: 56,
            color: 'rgba(245, 238, 222, 0.95)',
            opacity: nameOpacity,
            letterSpacing: nameLetterSpacing,
            textTransform: 'uppercase',
            fontWeight: 400,
            transform: `translateY(${nameTranslateY}px)`,
            textShadow: '0 0 24px rgba(245, 238, 222, 0.12)',
          }}
        >
          Tamir Yeshayahu
        </div>
      </AbsoluteFill>

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: barHeight,
          backgroundColor: '#000',
          transform: `translateY(${barOffset}px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: barHeight,
          backgroundColor: '#000',
          transform: `translateY(${-barOffset}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
