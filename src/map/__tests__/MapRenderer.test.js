
import { MapRenderer } from '../MapRenderer.js';

document.body.innerHTML = '<div id="map"></div>';

describe('MapRenderer', () => {
    it('should be instantiable', () => {
        const container = document.getElementById('map');
        const mapRenderer = new MapRenderer(container);
        expect(mapRenderer).toBeInstanceOf(MapRenderer);
    });
});
