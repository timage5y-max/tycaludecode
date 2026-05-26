import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

export const YoutubeIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames, height} = useVideoConfig();

  const barHeight = height * 0.12;
  const barProgress = spring({
    frame,
    fps,
    config: {damping: 18, stiffness: 80, mass: 1},
  });
  const barOffset = interpolate(barProgress, [0, 1], [-barHeight, 0]);

  const filmByOpacity = interpolate(frame, [20, 35], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const filmByLetterSpacing = interpolate(frame, [20, 60], [40, 14], {
    extrapolateRight: 'clamp',
  });

  const nameReveal = spring({
    frame: frame - 45,
    fps,
    config: {damping: 14, stiffness: 90},
  });
  const nameOpacity = interpolate(frame, [45, 65], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const nameBlur = interpolate(frame, [45, 70], [20, 0], {
    extrapolateRight: 'clamp',
  });
  const nameScale = interpolate(nameReveal, [0, 1], [0.85, 1]);

  const sweepStart = 70;
  const sweepProgress = interpolate(frame, [sweepStart, sweepStart + 40], [-30, 130], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const fadeOutOpacity = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames - 1],
    [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  const vignetteOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#000', opacity: fadeOutOpacity}}>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(20,20,30,1) 0%, rgba(0,0,0,1) 75%)',
          opacity: vignetteOpacity,
        }}
      />

      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 44,
            color: 'rgba(255, 255, 255, 0.55)',
            opacity: filmByOpacity,
            letterSpacing: filmByLetterSpacing,
            textTransform: 'uppercase',
            fontWeight: 300,
            marginBottom: 40,
          }}
        >
          film by
        </div>

        <div
          style={{
            position: 'relative',
            opacity: nameOpacity,
            transform: `scale(${nameScale})`,
            filter: `blur(${nameBlur}px)`,
          }}
        >
          <h1
            style={{
              fontSize: 130,
              color: '#fff',
              margin: 0,
              fontWeight: 700,
              letterSpacing: 6,
              textTransform: 'uppercase',
              textShadow: '0 0 40px rgba(255, 255, 255, 0.25)',
            }}
          >
            Tamir Yeshayahu
          </h1>

          <div
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'hidden',
              pointerEvents: 'none',
              mixBlendMode: 'screen',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${sweepProgress}%`,
                width: '25%',
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)',
                transform: 'skewX(-20deg)',
                filter: 'blur(8px)',
              }}
            />
          </div>
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
