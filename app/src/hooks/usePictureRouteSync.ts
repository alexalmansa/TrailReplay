import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { buildComputedJourney } from '@/utils/journeyUtils';
import { projectCoordinateToJourney } from '@/utils/routeProjection';

/**
 * Haelt die Einordnung der Fotos auf der Strecke aktuell.
 *
 * Die Stelle eines Fotos wurde bisher nur einmal beim Einfuegen berechnet -
 * mit dem Massstab, der gerade eingestellt war. Wer die Fotos einfuegt und
 * ERST DANACH auf Constant Pace umschaltet, behielt deshalb die alte, nach
 * Messpunkten gezaehlte Stelle: Das Foto erschien im Video deutlich hinter
 * der Stelle, an der es aufgenommen wurde. Dasselbe galt fuer geladene
 * Projektdateien, die den alten Wert mitbringen.
 *
 * Wichtig fuer die Ausloeser unten: Der Durchlauf haengt bewusst NICHT an
 * der Fotoliste selbst, sondern nur an Anzahl, Strecke und Massstab. Sonst
 * wuerde jede geschriebene Stelle den Effekt erneut ausloesen - und auf
 * einer Hin-und-Rueckstrecke, wo Hin- und Rueckweg uebereinanderliegen,
 * koennte die Zuordnung zwischen beiden Aesten hin- und herspringen und
 * die Oberflaeche endlos neu rechnen. So laeuft je Aenderung genau ein
 * Durchgang. Waehrend eines Exports bleibt er ganz aus.
 *
 * Von Hand gesetzte Fotos werden nie angetastet.
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
      if (picture.placementSource === 'manual') {
        continue;
      }
      if (picture.lat === undefined || picture.lon === undefined) {
        continue;
      }

      const match = projectCoordinateToJourney(
        computedJourney,
        picture.lat,
        picture.lon,
        picture.progress,
        routeTimingMode,
      );

      if (!match || Math.abs(match.progress - picture.progress) <= TOLERANCE) {
        continue;
      }

      store.updatePicturePosition(picture.id, match.progress);
    }
  }, [isExporting, journeySegments, pictureCount, routeTimingMode, tracks]);
}
