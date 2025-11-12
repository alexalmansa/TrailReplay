import maplibregl from 'maplibre-gl';

export class MapManager {
    constructor(container, renderer) {
        this.container = container;
        this.renderer = renderer;
        this.map = null;
        this.initializeMap();
    }

    initializeMap() {
        this.map = new maplibregl.Map({
            container: this.container,
            style: {
                version: 8,
                glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
                sources: {
                    'osm': {
                        type: 'raster',
                        tiles: [
                            'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
                        ],
                        tileSize: 256,
                        attribution: '© OpenStreetMap contributors'
                    },
                    'opentopomap': {
                        type: 'raster',
                        tiles: [
                            'https://a.tile.opentopomap.org/{z}/{x}/{y}.png'
                        ],
                        tileSize: 256,
                        attribution: '© OpenTopoMap (CC-BY-SA)'
                    },
                    'satellite': {
                        type: 'raster',
                        tiles: [
                            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                        ],
                        tileSize: 256,
                        attribution: '© Esri'
                    },
                    'carto-labels': {
                        type: 'raster',
                        tiles: [
                            'https://cartodb-basemaps-a.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}.png'
                        ],
                        tileSize: 256,
                        attribution: '© CartoDB'
                    },
                    'enhanced-hillshade': {
                        type: 'raster',
                        tiles: [
                            'https://cloud.sdsc.edu/v1/AUTH_opentopography/Raster/ASTER_GDEM/{z}/{x}/{y}.png'
                        ],
                        tileSize: 256,
                        attribution: '© OpenTopography/ASTER GDEM'
                    }
                },
                layers: [
                    {
                        id: 'background',
                        type: 'raster',
                        source: 'satellite'
                    },
                    {
                        id: 'carto-labels',
                        type: 'raster',
                        source: 'carto-labels',
                        layout: { visibility: 'none' }
                    },
                    {
                        id: 'opentopomap',
                        type: 'raster',
                        source: 'opentopomap',
                        layout: { visibility: 'none' }
                    },
                    {
                        id: 'street',
                        type: 'raster',
                        source: 'osm',
                        layout: { visibility: 'none' }
                    },
                    {
                        id: 'enhanced-hillshade',
                        type: 'raster',
                        source: 'enhanced-hillshade',
                        layout: { visibility: 'none' },
                        paint: { 'raster-opacity': 0.6 }
                    }
                ]
            },
            center: [0, 0],
            zoom: 2,
            pitch: 0,
            bearing: 0,
            maxPitch: 85,
            antialias: true,
            preserveDrawingBuffer: true,
            maxTileCacheZoomLevels: 10,
            fadeDuration: 150
        });

        this.map.on('load', () => {
            this.setupMapLayers();
            try {
                ['background','opentopomap','street','carto-labels'].forEach(layerId => {
                    if (this.map.getLayer(layerId)) {
                        this.map.setPaintProperty(layerId, 'raster-fade-duration', 100);
                    }
                });
            } catch (_) {}
            if (this.renderer.cameraMode === 'followBehind' && !this.renderer.isAnimating) {
                this.renderer.enableZoomOnlyInteractions();
            }
            this.renderer.updateMarkerDependentControls(this.renderer.showMarker);
            
            const progressPath = document.getElementById('progressPath');
            if (progressPath) {
                progressPath.setAttribute('stroke', this.renderer.pathColor);
            }
            
            this.renderer.updateElevationGradient(this.renderer.pathColor);
        });

        this.map.on('click', (e) => {
            if (this.renderer.isAnnotationMode) {
                this.renderer.annotations.handleAnnotationClick(e);
            } else if (this.renderer.isIconChangeMode) {
                e.originalEvent?.stopPropagation();
                this.renderer.iconChanges.handleIconChangeClick(e);
            }
        });

        this.map.on('mouseenter', () => {
            if (this.renderer.isAnnotationMode || this.renderer.isIconChangeMode) {
                this.map.getCanvas().style.cursor = 'crosshair';
            } else {
                this.map.getCanvas().style.cursor = '';
            }
        });

        this.map.on('mousemove', () => {
            if (this.renderer.isAnnotationMode || this.renderer.isIconChangeMode) {
                if (this.map.getCanvas().style.cursor !== 'crosshair') {
                    this.map.getCanvas().style.cursor = 'crosshair';
                }
            } else {
                if (this.map.getCanvas().style.cursor === 'crosshair') {
                    this.map.getCanvas().style.cursor = '';
                }
            }
        });
    }

    setupMapLayers() {
        this.map.addSource('trail-line', {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: []
                }
            }
        });

        this.map.addSource('trail-completed', {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: []
                }
            }
        });

        this.map.addSource('current-position', {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [0, 0]
                }
            }
        });

        this.map.addSource('annotations', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });

        this.map.addLayer({
            id: 'trail-line',
            type: 'line',
            source: 'trail-line',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': [
                    'case',
                    ['==', ['get', 'isTransportation'], true],
                    [
                        'case',
                        ['==', ['get', 'segmentMode'], 'car'], '#ff6b6b',
                        ['==', ['get', 'segmentMode'], 'driving'], '#ff6b6b',
                        ['==', ['get', 'segmentMode'], 'boat'], '#4ecdc4',
                        ['==', ['get', 'segmentMode'], 'plane'], '#ffe66d',
                        ['==', ['get', 'segmentMode'], 'train'], '#a8e6cf',
                        ['==', ['get', 'segmentMode'], 'walk'], '#ff9f43',
                        ['==', ['get', 'segmentMode'], 'cycling'], '#48cae4',
                        '#ff6b6b'
                    ],
                    this.renderer.pathColor
                ],
                'line-width': [
                    'case',
                    ['==', ['get', 'isTransportation'], true], 6,
                    4
                ],
                'line-opacity': [
                    'case',
                    ['==', ['get', 'isTransportation'], true], 0.7,
                    0.4
                ],
                'line-dasharray': [1, 0]
            }
        });

        this.map.addLayer({
            id: 'trail-completed',
            type: 'line',
            source: 'trail-completed',
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': this.renderer.pathColor,
                'line-width': 6,
                'line-opacity': 1.0
            }
        });

        this.map.addLayer({
            id: 'current-position-glow',
            type: 'circle',
            source: 'current-position',
            paint: {
                'circle-radius': 15 * this.renderer.markerSize,
                'circle-color': this.renderer.pathColor,
                'circle-opacity': 0.3
            }
        });

        this.renderer.createAndAddActivityIcon();

        this.map.addSource('main-track-label', {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {
                    label: 'Track 1'
                },
                geometry: {
                    type: 'Point',
                    coordinates: [0, 0]
                }
            }
        });

        this.map.addLayer({
            id: 'main-track-label',
            type: 'symbol',
            source: 'main-track-label',
            layout: {
                'text-field': 'Track 1',
                'text-size': 10,
                'text-offset': [0, 2.5],
                'text-allow-overlap': true,
                'text-ignore-placement': true,
                'text-anchor': 'center',
                'visibility': this.renderer.showTrackLabel ? 'visible' : 'none'
            },
            paint: {
                'text-color': this.renderer.pathColor,
                'text-halo-color': '#FFFFFF',
                'text-halo-width': 2
            }
        });

        this.map.addLayer({
            id: 'annotations',
            type: 'circle',
            source: 'annotations',
            paint: {
                'circle-radius': 8,
                'circle-color': '#4ecdc4',
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2,
                'circle-opacity': 0
            }
        });
    }
}
