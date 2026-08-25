import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { buildComputedJourney, progressForRouteDistance } from '@/utils/journeyUtils';

/**
 * Keeps photo timing in step with the route and the timing mode.
 *
 * A photo's `progress` is computed once, when it is added, using whichever
 * timing mode is active at that moment. Add the photos first and switch to
 * Constant Pace afterwards and a photo keeps its old, point-counted value: it
 * then appears well behind the place it was taken.
 *
 * The recalculation uses the anchor the placement already established -
 * `routeDistance`, the distance from the start of the journey - and never
 * looks the photo up on the route again. Distance along the route increases
 * monotonically, so it names one specific point even where an out-and-back
 * route covers the same coordinates twice; searching by coordinates could
 * land on the wrong leg. Photos without an anchor - placed by hand, or coming
 * from a project saved before this field existed - are left untouched.
 *
 * The effect deliberately does not depend on the picture list it writes to,
 * only on route and timing mode, so one change means exactly one pass.
 */
const TOLERANCE = 1e-6;

export function usePictureRouteSync() {
  const tracks = useAppStore((state) => state.tracks);
  const journeySegments = useAppStore((state) => state.journeySegments);
  const routeTimingMode = useAppStore((state) => state.playback.routeTimingMode);
  const pictureCount = useAppStore((state) => state.pictures.length);
  const isExporting = useAppStore((state) => state.isExporting);

  useEffect(() => {
    if (isExporting || pictureCount === 0) {
      return;
    }

    const store = useAppStore.getState();
    const computedJourney = buildComputedJourney(store.journeySegments, store.tracks);
    if (!computedJourney || computedJourney.coordinates.length === 0) {
      return;
    }

    for (const picture of store.pictures) {
      if (picture.placementSource === 'manual' || picture.routeDistance === undefined) {
        continue;
      }

      const progress = progressForRouteDistance(
        computedJourney.coordinates,
        computedJourney.segmentTimings,
        picture.routeDistance,
        routeTimingMode,
      );

      if (progress === null || Math.abs(progress - picture.progress) <= TOLERANCE) {
        continue;
      }

      store.updatePicturePosition(picture.id, progress);
    }
  }, [isExporting, journeySegments, pictureCount, routeTimingMode, tracks]);
}
