import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

type HelloWorldProps = {
  titleText: string;
  subtitleText: string;
};

export const HelloWorld: React.FC<HelloWorldProps> = ({titleText, subtitleText}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const titleScale = spring({
    frame,
    fps,
    config: {damping: 12, stiffness: 100},
  });

  const subtitleOpacity = interpolate(frame, [30, 60], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const subtitleTranslateY = interpolate(frame, [30, 60], [20, 0], {
    extrapolateRight: 'clamp',
  });

  const backgroundHue = interpolate(frame, [0, 150], [220, 280]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, hsl(${backgroundHue}, 70%, 25%), hsl(${backgroundHue + 40}, 70%, 15%))`,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        direction: 'rtl',
      }}
    >
      <h1
        style={{
          fontSize: 140,
          color: 'white',
          margin: 0,
          transform: `scale(${titleScale})`,
          textShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
        }}
      >
        {titleText}
      </h1>
      <p
        style={{
          fontSize: 50,
          color: 'rgba(255, 255, 255, 0.85)',
          marginTop: 24,
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleTranslateY}px)`,
        }}
      >
        {subtitleText}
      </p>
    </AbsoluteFill>
  );
};
