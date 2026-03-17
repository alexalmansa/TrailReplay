import { useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';

interface UseThreeDDragModeParams {
  isMapLoaded: boolean;
  mapRef: React.MutableRefObject<maplibregl.Map | null>;
}

const BEARING_SENSITIVITY = 0.35;
const PITCH_SENSITIVITY = 0.45;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function useThreeDDragMode({ isMapLoaded, mapRef }: UseThreeDDragModeParams) {
  const [isThreeDDragMode, setIsThreeDDragMode] = useState(false);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded || !isThreeDDragMode) {
      return;
    }

    const canvas = map.getCanvas();
    let isDragging = false;
    let lastClientX = 0;
    let lastClientY = 0;
    const previousCursor = canvas.style.cursor;

    map.dragPan.disable();
    canvas.style.cursor = 'grab';

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      isDragging = true;
      lastClientX = event.clientX;
      lastClientY = event.clientY;
      canvas.style.cursor = 'grabbing';
      event.preventDefault();
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging || !mapRef.current) return;

      const deltaX = event.clientX - lastClientX;
      const deltaY = event.clientY - lastClientY;
      lastClientX = event.clientX;
      lastClientY = event.clientY;

      const nextBearing = mapRef.current.getBearing() - deltaX * BEARING_SENSITIVITY;
      const nextPitch = clamp(mapRef.current.getPitch() - deltaY * PITCH_SENSITIVITY, 0, 85);

      mapRef.current.stop();
      mapRef.current.jumpTo({
        bearing: nextBearing,
        pitch: nextPitch,
      });
    };

    const stopDragging = () => {
      isDragging = false;
      canvas.style.cursor = 'grab';
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopDragging);
    window.addEventListener('mouseleave', stopDragging);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('mouseleave', stopDragging);
      map.dragPan.enable();
      canvas.style.cursor = previousCursor;
    };
  }, [isMapLoaded, isThreeDDragMode, mapRef]);

  return {
    isThreeDDragMode,
    setIsThreeDDragMode,
    toggleThreeDDragMode: () => setIsThreeDDragMode((value) => !value),
  };
}
