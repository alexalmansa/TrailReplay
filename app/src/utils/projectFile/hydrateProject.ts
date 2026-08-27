import type { AppState } from '@/store/storeTypes';
import { parseGPX } from '@/utils/gpxParser';
import type { ComparisonTrack, PictureAnnotation, VideoAnnotation } from '@/types';
import type { ParsedProject, SerializedPicture, SerializedVideo } from './types';

function hydratePicture(serialized: SerializedPicture): PictureAnnotation {
  return {
    id: serialized.id,
    file: null,
    url: '',
    isPlaceholder: true,
    originalFileName: serialized.originalFileName,
    lat: serialized.lat,
    lon: serialized.lon,
    timestamp: serialized.timestamp ? new Date(serialized.timestamp) : undefined,
    progress: serialized.progress,
    position: serialized.position,
    routeDistance: serialized.routeDistance,
    routeSegmentId: serialized.routeSegmentId,
    routeSegmentDistance: serialized.routeSegmentDistance,
    placementSource: serialized.placementSource,
    title: serialized.title,
    description: serialized.description,
    displayDuration: serialized.displayDuration,
  };
}

function hydrateVideo(serialized: SerializedVideo): VideoAnnotation {
  return {
    id: serialized.id,
    file: null,
    url: '',
    isPlaceholder: true,
    originalFileName: serialized.originalFileName,
    lat: serialized.lat,
    lon: serialized.lon,
    timestamp: serialized.timestamp ? new Date(serialized.timestamp) : undefined,
    progress: serialized.progress,
    title: serialized.title,
    description: serialized.description,
  };
}

export function hydrateProject(parsed: ParsedProject, store: AppState): void {
  store.reset();

  for (const { meta, gpxText } of parsed.tracks) {
    const track = parseGPX(gpxText, meta.name);
    track.id = meta.id;
    track.color = meta.color;
    track.activityIcon = meta.activityIcon;
    track.visible = meta.visible;
    store.addTrack(track);
  }

  for (const { meta, gpxText } of parsed.comparisonTracks) {
    const track = parseGPX(gpxText, meta.name);
    track.id = meta.id;
    track.color = meta.color;
    track.visible = meta.visible;

    const comparisonTrack: ComparisonTrack = {
      id: meta.id,
      name: meta.name,
      color: meta.color,
      track,
      visible: meta.visible,
      offset: meta.offset,
    };
    store.addComparisonTrack(comparisonTrack);
  }

  const { project } = parsed;

  store.hydrateState({
    activeTrackId: project.activeTrackId,
    journey: project.journey,
    journeySegments: project.journeySegments,
    pictures: project.pictures.map(hydratePicture),
    videos: project.videos.map(hydrateVideo),
    iconChanges: project.iconChanges,
    textAnnotations: project.textAnnotations,
    userLandmarks: project.userLandmarks,
    enabledLandmarkGroups: project.enabledLandmarkGroups,
    nearbyPlaceTypes: project.nearbyPlaceTypes,
    showAutomaticLandmarks: project.showAutomaticLandmarks,
    settings: project.settings,
    cameraSettings: project.cameraSettings,
    videoExportSettings: project.videoExportSettings,
    socialShareSettings: project.socialShareSettings,
    activePanel: 'tracks',
  });
}
