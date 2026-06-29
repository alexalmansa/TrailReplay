import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { mapGlobalRef } from '@/utils/mapRef';
import { getCropRegion } from '@/utils/crop';
import { trackEvent } from '@/utils/analytics';
import { buildSocialShareSummary } from './socialShareData';
import { getPosterSize, renderSocialPoster, exportSocialPosterBlob } from './socialShareRenderer';
import type { RenderInput } from './socialShareRenderer';
import type { CanvasPoint, FitBox } from './socialShareRouteFit';
import { downsampleRoute, fitRouteToBox } from './socialShareRouteFit';

export interface RouteBboxNorm {
  x: number; y: number; w: number; h: number;
}

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
  const [routeBboxNorm, setRouteBboxNorm] = useState<RouteBboxNorm | null>(null);

  const logoRef = useRef<HTMLImageElement | null>(null);
  const photoRef = useRef<HTMLImageElement | null>(null);
  const photoIdRef = useRef<string | null>(null);

  const selectedPicture = pictures.find((p) => p.id === settings.selectedPictureId) ?? null;

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { logoRef.current = img; };
    img.src = '/media/images/logohorizontal.svg';
  }, []);

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

  const buildInput = useCallback((preCapuredMapCanvas: HTMLCanvasElement | null = null): RenderInput => {
    const summary = buildSocialShareSummary(
      settings, tracks, activeTrackId, journey, journeySegments, unitSystem,
    );

    let mapCanvas: HTMLCanvasElement | null = null;
    let projectedRouteForMap: CanvasPoint[] | null = null;
    let routeLatLons: Array<{ lat: number; lon: number }> | null = null;

    if (settings.template === 'map-first') {
      // Use the pre-captured 2D snapshot — raw WebGL canvas is passed here only as a fallback
      mapCanvas = preCapuredMapCanvas;

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

  const computeRouteBbox = useCallback((
    latLons: Array<{ lat: number; lon: number }>,
  ): RouteBboxNorm | null => {
    if (latLons.length < 2) return null;
    const { w: pw, h: ph } = getPosterSize(settings.aspectRatio);
    const routeBox: FitBox = { x: pw * 0.10, y: ph * 0.07, w: pw * 0.85, h: ph * 0.62 };
    const sampled = downsampleRoute(latLons, 300);
    const projected = fitRouteToBox(sampled, routeBox, {
      offsetX: settings.routeTransform.offsetX * pw,
      offsetY: settings.routeTransform.offsetY * ph,
      scale: settings.routeTransform.scale,
    });
    if (projected.length === 0) return null;
    const xs = projected.map((p) => p.x);
    const ys = projected.map((p) => p.y);
    const pad = pw * 0.025;
    return {
      x: Math.max(0, (Math.min(...xs) - pad) / pw),
      y: Math.max(0, (Math.min(...ys) - pad) / ph),
      w: Math.min(1, (Math.max(...xs) - Math.min(...xs) + pad * 2) / pw),
      h: Math.min(1, (Math.max(...ys) - Math.min(...ys) + pad * 2) / ph),
    };
  }, [settings.aspectRatio, settings.routeTransform]);

  const generatePreview = useCallback(async () => {
    if (tracks.length === 0) { setPreviewUrl(null); return; }
    setIsRendering(true);
    try {
      let preCapuredMapCanvas: HTMLCanvasElement | null = null;

      if (settings.template === 'map-first') {
        const map = mapGlobalRef.current;
        if (map) {
          // Copy WebGL pixels to a 2D canvas IMMEDIATELY in the render callback.
          // Reading a WebGL canvas outside its own render cycle can yield blank pixels
          // even with preserveDrawingBuffer:true on some GPU/driver combinations.
          preCapuredMapCanvas = await new Promise<HTMLCanvasElement | null>((resolve) => {
            const timeout = setTimeout(() => resolve(null), 1000);
            map.once('render', () => {
              clearTimeout(timeout);
              try {
                const glCanvas = map.getCanvas();
                const offscreen = document.createElement('canvas');
                offscreen.width = glCanvas.width;
                offscreen.height = glCanvas.height;
                const ctx2d = offscreen.getContext('2d');
                ctx2d?.drawImage(glCanvas, 0, 0);
                resolve(offscreen);
              } catch (e) {
                console.warn('[social] map capture failed:', e);
                resolve(null);
              }
            });
            map.triggerRepaint();
          });
        }
      }

      const input = buildInput(preCapuredMapCanvas);

      // Compute route bbox for photo-first interactive overlay
      if (settings.template === 'photo-first' && input.routeLatLons) {
        setRouteBboxNorm(computeRouteBbox(input.routeLatLons));
      } else {
        setRouteBboxNorm(null);
      }

      const url = renderSocialPoster(input);
      setPreviewUrl(url);
    } catch (e) {
      console.error('Social share preview failed', e);
    } finally {
      setIsRendering(false);
    }
  }, [buildInput, computeRouteBbox, settings.template, tracks.length]);

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
      let preCapuredMapCanvas: HTMLCanvasElement | null = null;
      if (settings.template === 'map-first') {
        const map = mapGlobalRef.current;
        if (map) {
          preCapuredMapCanvas = await new Promise<HTMLCanvasElement | null>((resolve) => {
            const timeout = setTimeout(() => resolve(null), 1000);
            map.once('render', () => {
              clearTimeout(timeout);
              try {
                const glCanvas = map.getCanvas();
                const offscreen = document.createElement('canvas');
                offscreen.width = glCanvas.width;
                offscreen.height = glCanvas.height;
                offscreen.getContext('2d')?.drawImage(glCanvas, 0, 0);
                resolve(offscreen);
              } catch { resolve(null); }
            });
            map.triggerRepaint();
          });
        }
      }
      const blob = await exportSocialPosterBlob(buildInput(preCapuredMapCanvas));
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
    routeBboxNorm,
  };
}
