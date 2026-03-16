export const MAP_STYLE = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
    opentopomap: {
      type: 'raster',
      tiles: ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenTopoMap (CC-BY-SA)',
    },
    satellite: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: '© Esri',
    },
    'carto-labels': {
      type: 'raster',
      tiles: ['https://cartodb-basemaps-a.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© CartoDB',
    },
    'enhanced-hillshade': {
      type: 'raster',
      tiles: ['https://cloud.sdsc.edu/v1/AUTH_opentopography/Raster/ASTER_GDEM/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenTopography/ASTER GDEM',
    },
    opensnowmap: {
      type: 'raster',
      tiles: ['https://tiles.opensnowmap.org/pistes/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: 'Data © OpenStreetMap contributors ODbL, OpenSnowMap.org CC-BY-SA',
    },
    'esri-clarity': {
      type: 'raster',
      tiles: ['https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Tiles © Esri — Source: Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
    },
    slope: {
      type: 'raster',
      tiles: ['slope://{z}/{x}/{y}'],
      tileSize: 256,
      maxzoom: 15,
      attribution: 'Slope derived from AWS Terrain Tiles',
    },
    aspect: {
      type: 'raster',
      tiles: ['aspect://{z}/{x}/{y}'],
      tileSize: 256,
      maxzoom: 15,
      attribution: 'Aspect derived from AWS Terrain Tiles',
    },
    'terrain-dem': {
      type: 'raster-dem',
      tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      tileSize: 256,
      encoding: 'terrarium',
      maxzoom: 15,
    },
  },
  layers: [
    { id: 'background', type: 'raster', source: 'satellite' },
    { id: 'esri-clarity', type: 'raster', source: 'esri-clarity', layout: { visibility: 'none' } },
    { id: 'carto-labels', type: 'raster', source: 'carto-labels', layout: { visibility: 'none' } },
    { id: 'opentopomap', type: 'raster', source: 'opentopomap', layout: { visibility: 'none' } },
    { id: 'street', type: 'raster', source: 'osm', layout: { visibility: 'none' } },
    { id: 'enhanced-hillshade', type: 'raster', source: 'enhanced-hillshade', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.6 } },
    { id: 'ski-pistes', type: 'raster', source: 'opensnowmap', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.9 } },
    { id: 'slope-overlay', type: 'raster', source: 'slope', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.7 } },
    { id: 'aspect-overlay', type: 'raster', source: 'aspect', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.7 } },
  ],
  terrain: {
    source: 'terrain-dem',
    exaggeration: 1.2,
  },
} as const;

export const MAP_LAYERS: Record<string, { name: string; icon: string }> = {
  satellite: { name: 'Satellite', icon: '🛰️' },
  street: { name: 'Street', icon: '🛣️' },
  opentopomap: { name: 'Topo', icon: '⛰️' },
  'enhanced-hillshade': { name: 'Terrain', icon: '🏔️' },
  'esri-clarity': { name: 'Esri Clarity', icon: '📡' },
  wayback: { name: 'Wayback', icon: '🕰️' },
};
