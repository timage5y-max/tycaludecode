import {Composition} from 'remotion';
import {HelloWorld} from './HelloWorld';
import {YoutubeIntro} from './YoutubeIntro';

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
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
