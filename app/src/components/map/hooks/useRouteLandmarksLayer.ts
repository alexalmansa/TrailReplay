import { useEffect, type MutableRefObject } from 'react';
import type { FeatureCollection, Point } from 'geojson';
import maplibregl from 'maplibre-gl';
import type { RouteLandmark } from '@/types/landmarks';

const SOURCE = 'route-landmarks';
const HALO = 'route-landmarks-halo';
const ICON = 'route-landmarks-icon';
const LABEL = 'route-landmarks-label';
const IMAGE_PREFIX = 'route-landmark-glyph-';

// Mapbox Maki v8 icons (CC0): https://github.com/mapbox/maki
// Kept locally as path data so map rendering has no runtime icon requests.
const MAKI_PATHS: Record<string, string> = {
  summit: 'm7.5 1c-.3 0-.4.2-.6.4l-5.8 9.5c-.1.1-.1.3-.1.4 0 .5.4.7.7.7h11.6c.4 0 .7-.2.7-.7 0-.2 0-.2-.1-.4l-5.7-9.5c-.2-.2-.4-.4-.7-.4zm0 1.5 3.3 5.5h-.8l-1.5-1.5-1 1.5-1-1.5-1.5 1.5h-.9z',
  waypoint: 'm7.5385 1c-.2948 0-.4883.1772-.6154.3846l-5.8462 9.5385c-.0769.0769-.0769.2307-.0769.3846 0 .5385.3846.6923.6923.6923h11.6154c.3846 0 .6923-.1538.6923-.6923 0-.1538 0-.2308-.0769-.3846l-5.7693-9.5385c-.1258-.2081-.3656-.3846-.6153-.3846z',
  viewpoint: 'M6.02,8.425a2.3859,2.3859,0,0,0-.46.44l-4.55-3.5a7.9976,7.9976,0,0,1,1.51-1.51Zm6.46-4.56-3.5,4.55a2.3971,2.3971,0,0,1,.45.45l4.56-3.5A7.945,7.945,0,0,0,12.48,3.865ZM7.3042,10.0129a1.5,1.5,0,1,0,1.6829,1.2914h0A1.5,1.5,0,0,0,7.3042,10.0129ZM6.43,2.235a7.9329,7.9329,0,0,0-2.06.55l2.2,5.32a2.0438,2.0438,0,0,1,.61-.17Zm2.14.01-.75,5.69a2.49,2.49,0,0,1,.61.16l2.2-5.3A7.2129,7.2129,0,0,0,8.57,2.245Z',
  town: 'm10.651 6.121c-.0445-.0357-.0999-.05516-.157-.05516s-.1125.01946-.157.05516l-2.245 1.808c-.02881.02323-.05204.05263-.06796.08603-.01593.03341-.02414.06997-.02404.10697v4.625c0 .0671.02666.1315.0741.1789.04745.0474.1118.0741.1789.0741h1.494c.0671 0 .13145-.0267.1789-.0741s.0741-.1118.0741-.1789v-1.747h1v1.747c0 .0671.0267.1315.0741.1789.0475.0474.1118.0741.1789.0741h1.494c.0671 0 .1315-.0267.1789-.0741s.0741-.1118.0741-.1789v-4.627c.0007-.03831-.0074-.07627-.0237-.11095s-.0404-.06514-.0703-.08905zm-.651 3.879h-1v-1h1zm2 0h-1v-1h1zm-6.29-9.184997c-.02299-.034654-.05419-.063081-.09083-.082746s-.07758-.029956-.11917-.029956c-.04158 0-.08252.010291-.11916.029956-.03665.019665-.06785.048092-.09084.082746l-3.248 4.120997c-.02752.0415-.04214.09021-.042.14v7.671c-.00013.0331.00626.0659.0188.0965s.031.0585.0543.082c.02331.0235.05102.0422.08154.0549.03053.0128.06327.0195.09636.0196h2.5c.06632-.0008.12964-.0277.17626-.0749.04661-.0471.07275-.1108.07274-.1771v-1.748h1v1.748c0 .0668.02655.1309.07381.1782s.11136.0738.17819.0738h.748v-6c-.00004-.07511.01684-.14926.04938-.21695.03255-.06769.07993-.12718.13862-.17405l1.812-1.609c0-.05-3.29-4.184997-3.29-4.184997zm-1.71 8.184997h-1v-1h1zm0-3h-1v-1h1zm2 3h-1v-1h1zm0-3h-1v-1h1z',
  water: 'M7.5 14C9.57688 14 12 12.7117 12 9.43241C12 7.20724 8.53844 2.2883 7.5 1C6.57691 2.2883 3 7.09007 3 9.43241C3 12.7117 5.42312 14 7.5 14Z',
  waterfall: 'M14 1H5C3.34315 1 2 2.34314 2 4V8.87918C1.39704 9.28261 1 9.96937 1 10.75C1 11.9927 2.00736 13 3.25 13C3.7127 13 4.14279 12.8599 4.5 12.6209C4.85721 12.8599 5.2873 13 5.75 13C6.28601 13 6.77826 12.812 7.16413 12.5H7.51743C8.01909 12.8165 8.61403 13 9.25 13C11.0449 13 12.5 11.5449 12.5 9.75002C12.5 8.39777 11.6747 7.23919 10.5 6.74934V5C10.5 3.89543 11.3954 3 12.5 3H14V1ZM11.5 9.75C11.5 10.9926 10.4926 12 9.25 12C8.71418 12 8.2221 11.8127 7.83567 11.5H6.75009C6.52204 11.8036 6.15895 12 5.75 12C5.34105 12 4.97796 11.8036 4.74991 11.5H4.25009C4.02204 11.8036 3.65895 12 3.25 12C2.55964 12 2 11.4404 2 10.75C2 10.1453 2.42944 9.64082 3 9.525V5.75C3 5.33579 3.33579 5 3.75 5C4.16421 5 4.5 5.33579 4.5 5.75V9C4.5 9.27614 4.72386 9.5 5 9.5C5.27614 9.5 5.5 9.27614 5.5 9V6.75C5.5 6.33579 5.83579 6 6.25 6C6.66421 6 7 6.33579 7 6.75V9C7 9.27614 7.22386 9.5 7.5 9.5C7.77614 9.5 8 9.27614 8 9V5.75C8 5.33579 8.33579 5 8.75 5C9.16421 5 9.5 5.33579 9.5 5.75V7.51373C10.625 7.63809 11.5 8.59186 11.5 9.75Z',
  shelter: 'M13 2L1 6V8L2 7.66667V13H12V11H4V7L13 4V2Z',
  camp: 'M14 10V11C14 11.5523 13.5523 12 13 12H2C1.44772 12 1 11.5523 1 11V10C1 9.44772 1.44772 9.00001 2 9.00001H2.25L7.03206 1.25762C7.24699.90965 7.75302.909651 7.96794 1.25762L12.75 9.00001H13C13.5523 9.00001 14 9.44772 14 10ZM10.5 9.00001L7.5 4.00001L4.5 9.00001H10.5Z',
  pin: 'M5.11697 2.81756C5.76952 2.26561 6.65195 2 7.5 2C8.34805 2 9.23048 2.26561 9.88303 2.81756C10.5075 3.34579 11 4.20017 11 5.56759C11 5.94031 10.8461 6.52407 10.5105 7.29145C10.1859 8.03354 9.73523 8.85087 9.24257 9.65811C8.64175 10.6426 7.999 11.579 7.48195 12.3097C6.96023 11.5798 6.31599 10.6237 5.71947 9.62296C5.2343 8.80934 4.79303 7.98717 4.47608 7.24844C4.14708 6.48162 4 5.91216 4 5.56759C4 4.20017 4.49248 3.34579 5.11697 2.81756Z',
};

function data(landmarks: RouteLandmark[]): FeatureCollection<Point> {
  return { type: 'FeatureCollection', features: landmarks.map((landmark) => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: [landmark.lon, landmark.lat] },
    properties: {
      title: landmark.elevation && ['highest-point', 'high-point', 'summit'].includes(landmark.type) ? `${landmark.title}\n${Math.round(landmark.elevation).toLocaleString()} m` : landmark.title,
      importance: landmark.importance,
      icon: iconFor(landmark.type),
      color: landmark.color ?? colorFor(landmark),
      opacity: landmark.source === 'automatic' ? 0.92 : 1,
    },
  })) };
}

function colorFor(landmark: RouteLandmark) {
  // A restrained alpine palette: category hues remain clear over satellite
  // imagery without competing with the route's orange accent.
  if (landmark.source === 'user') return '#E86F51';
  if (['summit', 'high-point', 'highest-point'].includes(landmark.type)) return '#E86F51';
  if (['pass', 'finish', 'halfway'].includes(landmark.type)) return '#A86CC1';
  if (['town', 'trailhead', 'aid-station'].includes(landmark.type)) return '#F7F2E8';
  if (landmark.type === 'waterfall') return '#63C5D9';
  if (['lake', 'water', 'river-crossing'].includes(landmark.type)) return '#3C9DCC';
  if (['hut', 'shelter', 'camp'].includes(landmark.type)) return '#B85E3C';
  if (landmark.type === 'viewpoint') return '#3E9DB0';
  return '#536B65';
}

function iconFor(type: RouteLandmark['type']) {
  if (['summit', 'high-point', 'highest-point'].includes(type)) return 'summit';
  if (['pass', 'halfway', 'finish'].includes(type)) return 'waypoint';
  if (['town', 'trailhead', 'aid-station'].includes(type)) return 'town';
  if (type === 'waterfall') return 'waterfall';
  if (['lake', 'water', 'river-crossing'].includes(type)) return 'water';
  if (type === 'camp') return 'camp';
  if (['hut', 'shelter'].includes(type)) return 'shelter';
  if (type === 'viewpoint') return 'viewpoint';
  return 'pin';
}

function glyphImage(kind: string) {
  const canvas = document.createElement('canvas'); canvas.width = 36; canvas.height = 36;
  const context = canvas.getContext('2d')!;
  context.clearRect(0, 0, 36, 36); context.fillStyle = '#ffffff';
  context.scale(2.4, 2.4);
  context.fill(new Path2D(MAKI_PATHS[kind] ?? MAKI_PATHS.pin));
  return context.getImageData(0, 0, 36, 36);
}

export function useRouteLandmarksLayer({ landmarks, isMapLoaded, mapRef }: { landmarks: RouteLandmark[]; isMapLoaded: boolean; mapRef: MutableRefObject<maplibregl.Map | null> }) {
  useEffect(() => {
    const map = mapRef.current; if (!map || !isMapLoaded) return;
    ['summit', 'waypoint', 'town', 'water', 'waterfall', 'shelter', 'camp', 'viewpoint', 'pin'].forEach((kind) => {
      const imageId = `${IMAGE_PREFIX}${kind}`;
      if (!map.hasImage(imageId)) map.addImage(imageId, glyphImage(kind), { sdf: true });
    });
    if (!map.getSource(SOURCE)) map.addSource(SOURCE, { type: 'geojson', data: data([]) });
    if (!map.getLayer(HALO)) map.addLayer({ id: HALO, type: 'circle', source: SOURCE, paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 9, 15, 15], 'circle-color': '#10231c', 'circle-opacity': ['*', ['get', 'opacity'], 0.96], 'circle-stroke-color': '#F7F2E8', 'circle-stroke-width': 1.5, 'circle-pitch-alignment': 'viewport',
    } });
    if (!map.getLayer(ICON)) map.addLayer({ id: ICON, type: 'symbol', source: SOURCE, layout: {
      'icon-image': ['concat', IMAGE_PREFIX, ['get', 'icon']], 'icon-size': ['interpolate', ['linear'], ['zoom'], 9, 0.62, 15, 0.92], 'icon-pitch-alignment': 'viewport', 'icon-rotation-alignment': 'viewport', 'icon-allow-overlap': false, 'symbol-sort-key': ['get', 'importance'],
    }, paint: { 'icon-color': ['get', 'color'], 'icon-opacity': ['get', 'opacity'] } });
    if (!map.getLayer(LABEL)) map.addLayer({ id: LABEL, type: 'symbol', source: SOURCE, layout: {
      'text-field': ['get', 'title'], 'text-font': ['Open Sans Bold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 10, 0, 11, 12, 15, 13], 'text-max-width': 11, 'text-offset': [0, 1.7], 'text-anchor': 'top', 'text-optional': true, 'text-pitch-alignment': 'viewport', 'symbol-sort-key': ['get', 'importance'],
    }, paint: { 'text-color': '#ffffff', 'text-halo-color': '#030506', 'text-halo-width': 3.5, 'text-halo-blur': 0.6, 'text-opacity': ['get', 'opacity'] } });
    (map.getSource(SOURCE) as maplibregl.GeoJSONSource | undefined)?.setData(data(landmarks));
  }, [isMapLoaded, landmarks, mapRef]);
}
