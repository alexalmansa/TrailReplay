import { useEffect, type MutableRefObject } from 'react';
import maplibregl from 'maplibre-gl';
import type { PictureAnnotation } from '@/types';

interface UsePictureMarkersParams {
  isMapLoaded: boolean;
  mapRef: MutableRefObject<maplibregl.Map | null>;
  pictures: PictureAnnotation[];
  setSelectedPictureId: (pictureId: string | null) => void;
  showPictures: boolean;
}

export function usePictureMarkers({
  isMapLoaded,
  mapRef,
  pictures,
  setSelectedPictureId,
  showPictures,
}: UsePictureMarkersParams) {
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    const existingMarkers = document.querySelectorAll('.tr-picture-marker');
    existingMarkers.forEach((element) => element.remove());

    if (!showPictures) return;

    pictures.forEach((picture) => {
      if (!picture.lat || !picture.lon) return;

      const element = document.createElement('div');
      element.className = 'tr-picture-marker';
      element.style.cssText = `
        width: 32px;
        height: 32px;
        background: var(--trail-orange);
        border: 3px solid var(--canvas);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      `;
      element.innerHTML = '📷';
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        setSelectedPictureId(picture.id);
      });

      new maplibregl.Marker({ element, anchor: 'bottom' })
        .setLngLat([picture.lon, picture.lat])
        .addTo(mapRef.current!);
    });
  }, [isMapLoaded, mapRef, pictures, setSelectedPictureId, showPictures]);
}
