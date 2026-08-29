import {AbsoluteFill, Img, staticFile} from 'remotion';
import {BlueprintPlan} from './BlueprintPlan';
import {PHOTO} from './VenueReveal';

/**
 * Development aid: the finished plan laid straight over the photograph, so any
 * drift between a drawn element and the thing it represents is visible at a
 * glance. Not part of the film.
 */
export const CalibrationOverlay: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#000'}}>
    <Img
      src={staticFile(PHOTO)}
      style={{width: '100%', height: '100%', objectFit: 'cover'}}
    />
    <AbsoluteFill style={{opacity: 0.72, mixBlendMode: 'screen'}}>
      <BlueprintPlan />
    </AbsoluteFill>
  </AbsoluteFill>
);
