import {Composition} from 'remotion';
import {HelloWorld} from './HelloWorld';
import {YoutubeIntro} from './YoutubeIntro';
import {VenueReveal} from './venue/VenueReveal';
import {CalibrationOverlay} from './venue/CalibrationOverlay';
import {DURATION} from './venue/timeline';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          titleText: 'שלום עולם!',
          subtitleText: 'הסרטון הראשון שלי ב-Remotion',
        }}
      />
      <Composition
        id="YoutubeIntro"
        component={YoutubeIntro}
        durationInFrames={360}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="VenueReveal"
        component={VenueReveal}
        durationInFrames={DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="CalibrationOverlay"
        component={CalibrationOverlay}
        durationInFrames={DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
