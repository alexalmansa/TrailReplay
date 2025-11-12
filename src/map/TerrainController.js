
export class TerrainController {
    constructor(mapRenderer) {
        this.mapRenderer = mapRenderer;
        this.map = mapRenderer.map;
        this.is3DMode = false;
        this.currentTerrainSource = 'mapzen';
    }

    enable3DTerrain() {
        if (!this.map || this.is3DMode) return;

        const wasAnimating = this.mapRenderer.isAnimating;
        const currentProgress = this.mapRenderer.animationProgress;

        try {
            // 1) Ensure DEM source exists
            if (!this.map.getSource('terrain-dem')) {
                this.addTerrainSource(this.currentTerrainSource);
            }

            // 2) Apply terrain immediately
            try {
                this.map.setTerrain({ source: 'terrain-dem', exaggeration: 0.8 });
            } catch (terrainError) {
                console.warn('Could not apply terrain elevation immediately:', terrainError);
            }

            // 3) Preload DEM around current center at current zoom to reduce flashes
            try {
                const center = this.map.getCenter();
                const z = Math.round(this.map.getZoom());
                this.preloadTerrainTilesAtPosition(center.lat, center.lng, z);
            } catch (_) {}

            // 4) After the map goes idle (or short delay), pitch up
            const pitchUp = () => {
                this.map.easeTo({ pitch: 30, duration: 500 });
            };

            // Prefer idle, but fall back to timeout if it doesn't fire soon
            let pitched = false;
            const onIdle = () => { if (!pitched) { pitched = true; pitchUp(); } };
            try {
                this.map.once('idle', onIdle);
                setTimeout(() => { if (!pitched) { pitched = true; pitchUp(); } }, 400);
            } catch (_) {
                setTimeout(pitchUp, 300);
            }

            this.is3DMode = true;

            // Restore animation state if needed
            if (wasAnimating && currentProgress !== undefined) {
                setTimeout(() => {
                    this.mapRenderer.setAnimationProgress(currentProgress);
                    if (wasAnimating) this.mapRenderer.startAnimation();
                }, 200);
            }
        } catch (error) {
            console.error('Error enabling 3D terrain:', error);
            this.is3DMode = false;
        }
    }

    setupTerrainSourceMinimal() {
        try {
            if (!this.map.getSource('terrain-dem')) {
                this.addTerrainSource(this.currentTerrainSource);
            }
            
            setTimeout(() => {
                try {
                    this.map.setTerrain({
                        source: 'terrain-dem',
                        exaggeration: 0.8
                    });
                } catch (terrainError) {
                    console.warn('Could not apply terrain elevation:', terrainError);
                }
            }, 300);
            
        } catch (error) {
            console.warn('Could not setup terrain source:', error);
        }
    }

    addTerrainSource(provider) {
        const sources = {
            'mapzen': {
                type: 'raster-dem',
                tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
                tileSize: 256,
                encoding: 'terrarium',
                maxzoom: 15
            },
            'opentopo': {
                type: 'raster-dem',
                tiles: ['https://cloud.sdsc.edu/v1/AUTH_opentopography/Raster/SRTM_GL1/{z}/{x}/{y}.png'],
                tileSize: 256,
                encoding: 'mapbox',
                maxzoom: 14
            }
        };

        const sourceConfig = sources[provider] || sources['mapzen'];
        this.map.addSource('terrain-dem', sourceConfig);
    }

    setTerrainSource(provider) {
        if (!this.map || !this.is3DMode) {
            this.currentTerrainSource = provider;
            return;
        }

        try {
            const wasAnimating = this.mapRenderer.isAnimating;
            const currentProgress = this.mapRenderer.animationProgress;
            
            if (this.map.getSource('terrain-dem')) {
                this.map.setTerrain(null);
                this.map.removeSource('terrain-dem');
            }
            
            this.addTerrainSource(provider);
            this.currentTerrainSource = provider;
            
            setTimeout(() => {
                try {
                    this.map.setTerrain({
                        source: 'terrain-dem',
                        exaggeration: 0.8
                    });
                    
                    if (wasAnimating && currentProgress !== undefined) {
                        setTimeout(() => {
                            this.mapRenderer.setAnimationProgress(currentProgress);
                            if (wasAnimating) {
                                this.mapRenderer.startAnimation();
                            }
                        }, 200);
                    }
                } catch (terrainError) {
                    console.warn(`Could not apply ${provider} terrain:`, terrainError);
                }
            }, 300);
            
        } catch (error) {
            console.error(`Error switching terrain source to ${provider}:`, error);
        }
    }

    disable3DTerrain() {
        if (!this.map || !this.is3DMode) return;
        
        this.is3DMode = false;
        
        try {
            const wasAnimating = this.mapRenderer.isAnimating;
            const currentProgress = this.mapRenderer.animationProgress;
            
            this.map.setTerrain(null);
            
            this.map.easeTo({
                pitch: 0,
                duration: 500
            });
            
            if (wasAnimating && currentProgress !== undefined) {
                setTimeout(() => {
                    this.mapRenderer.setAnimationProgress(currentProgress);
                    if (wasAnimating) {
                        this.mapRenderer.startAnimation();
                    }
                }, 600);
            }
        } catch (error) {
            console.error('Error disabling 3D terrain:', error);
        }
    }

    update3DTrailRendering() {
        if (!this.mapRenderer.trackData || !this.map.getLayer('trail-line')) {
            return;
        }
        
        this.map.setPaintProperty('trail-line', 'line-width', [
            'case',
            ['==', ['get', 'isTransportation'], true], 8,
            6
        ]);
        
        if (this.map.getLayer('trail-completed')) {
            this.map.setPaintProperty('trail-completed', 'line-width', 7);
            this.map.setPaintProperty('trail-completed', 'line-opacity', 1.0);
        }
        
        this.map.setPaintProperty('trail-line', 'line-opacity', [
            'case',
            ['==', ['get', 'isTransportation'], true], 0.9,
            0.8
        ]);
        
        if (this.map.getLayer('current-position-glow')) {
            this.map.setPaintProperty('current-position-glow', 'circle-radius', 20 * this.mapRenderer.markerSize);
        }
    }

    setTerrainExaggeration(exaggeration) {
        if (this.is3DMode && this.map.getSource('terrain-dem')) {
            try {
                this.map.setTerrain({
                    source: 'terrain-dem',
                    exaggeration: exaggeration
                });
            } catch (error) {
                console.error('Error setting terrain exaggeration:', error);
            }
        }
    }

    isTerrainSupported() {
        return typeof this.map.setTerrain === 'function' && typeof this.map.addSource === 'function';
    }

    preloadTerrainTilesAtPosition(lat, lng, zoom) {
        // Implement tile preloading logic here if needed
    }
}
