import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { mapGlobalRef } from '@/utils/mapRef';
import { getCropRegion } from '@/utils/crop';
import { trackEvent } from '@/utils/analytics';
import { buildSocialShareSummary } from './socialShareData';
import { getPosterSize, renderSocialPoster, exportSocialPosterBlob } from './socialShareRenderer';
import type { RenderInput } from './socialShareRenderer';
import type { CanvasPoint } from './socialShareRouteFit';

export function useSocialShareExport() {
  const settings = useAppStore((s) => s.socialShareSettings);
  const setSocialShareSettings = useAppStore((s) => s.setSocialShareSettings);
  const tracks = useAppStore((s) => s.tracks);
  const activeTrackId = useAppStore((s) => s.activeTrackId);
  const journey = useAppStore((s) => s.journey);
  const journeySegments = useAppStore((s) => s.journeySegments);
  const pictures = useAppStore((s) => s.pictures);
  const unitSystem = useAppStore((s) => s.settings.unitSystem);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(0);

  const logoRef = useRef<HTMLImageElement | null>(null);
  const photoRef = useRef<HTMLImageElement | null>(null);
  const photoIdRef = useRef<string | null>(null);

  const selectedPicture = pictures.find((p) => p.id === settings.selectedPictureId) ?? null;

  // Preload logo once
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { logoRef.current = img; };
    img.src = '/media/images/logohorizontal.svg';
  }, []);

  // Load selected photo when the selection changes
  useEffect(() => {
    if (!selectedPicture) {
      photoRef.current = null;
      photoIdRef.current = null;
      setPhotoVersion((v) => v + 1);
      return;
    }
    if (photoIdRef.current === selectedPicture.id && photoRef.current) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      photoRef.current = img;
      photoIdRef.current = selectedPicture.id;
      setPhotoVersion((v) => v + 1);
    };
    img.onerror = () => setPhotoVersion((v) => v + 1);
    img.src = selectedPicture.url;
  }, [selectedPicture]);

  const buildInput = useCallback((): RenderInput => {
    const summary = buildSocialShareSummary(
      settings, tracks, activeTrackId, journey, journeySegments, unitSystem,
    );

    let mapCanvas: HTMLCanvasElement | null = null;
    let projectedRouteForMap: CanvasPoint[] | null = null;
    let routeLatLons: Array<{ lat: number; lon: number }> | null = null;

    if (settings.template === 'map-first') {
      mapCanvas = (mapGlobalRef.current?.getCanvas()
        ?? document.querySelector('.maplibregl-canvas')) as HTMLCanvasElement | null;

      const map = mapGlobalRef.current;
      const container = document.getElementById('map-capture-container');
      if (map && container && tracks.length > 0) {
        const { w: posterW, h: posterH } = getPosterSize(settings.aspectRatio);
        const rect = container.getBoundingClientRect();
        const { cropX, cropY, cropW, cropH } = getCropRegion(rect, posterW, posterH);
        const pts: CanvasPoint[] = [];
        for (const track of tracks) {
          if (!track.visible) continue;
          const step = Math.max(1, Math.floor(track.points.length / 300));
          for (let i = 0; i < track.points.length; i += step) {
            const pt = track.points[i];
            const sp = map.project([pt.lon, pt.lat]);
            pts.push({
              x: (sp.x - cropX) / cropW * posterW,
              y: (sp.y - cropY) / cropH * posterH,
            });
          }
        }
        projectedRouteForMap = pts;
      }
    } else {
      const pts: Array<{ lat: number; lon: number }> = [];
      for (const track of tracks) {
        if (!track.visible) continue;
        const step = Math.max(1, Math.floor(track.points.length / 300));
        for (let i = 0; i < track.points.length; i += step) {
          pts.push({ lat: track.points[i].lat, lon: track.points[i].lon });
        }
      }
      routeLatLons = pts;
    }

    return {
      settings,
      summary,
      mapCanvas,
      projectedRouteForMap,
      routeLatLons,
      selectedPhoto: photoRef.current,
      logo: logoRef.current,
    };
  }, [settings, tracks, activeTrackId, journey, journeySegments, unitSystem]);

  const generatePreview = useCallback(async () => {
    if (tracks.length === 0) { setPreviewUrl(null); return; }
    setIsRendering(true);
    try {
      const url = renderSocialPoster(buildInput());
      setPreviewUrl(url);
    } catch (e) {
      console.error('Social share preview failed', e);
    } finally {
      setIsRendering(false);
    }
  }, [buildInput, tracks.length]);

  // Regenerate preview when settings, tracks, or photo change
  useEffect(() => {
    void generatePreview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings.template,
    settings.aspectRatio,
    settings.selectedPictureId,
    settings.titleMode,
    settings.customTitle,
    settings.locationLabel,
    settings.showLocation,
    settings.showStats,
    settings.showElevationMiniChart,
    settings.routeTransform.scale,
    settings.routeTransform.offsetX,
    settings.routeTransform.offsetY,
    settings.routeTransform.opacity,
    tracks.length,
    photoVersion,
    generatePreview,
  ]);

  const exportPng = useCallback(async () => {
    if (tracks.length === 0) return;
    setIsRendering(true);
    try {
      const blob = await exportSocialPosterBlob(buildInput());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trailreplay-social-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      trackEvent('social_share_exported', {
        template: settings.template,
        aspect_ratio: settings.aspectRatio,
      });
    } catch (e) {
      console.error('Social share export failed', e);
    } finally {
      setIsRendering(false);
    }
  }, [buildInput, settings.aspectRatio, settings.template, tracks.length]);

  return {
    previewUrl,
    isRendering,
    selectedPicture,
    generatePreview,
    exportPng,
    settings,
    setSocialShareSettings,
    pictures,
    hasTracks: tracks.length > 0,
  };
}
