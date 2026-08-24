import { describe, expect, it } from 'vitest';
import type { GPXPoint, GPXTrack } from '@/types';
import { buildComputedJourney, getJourneyElevationData } from '@/utils/journeyUtils';
import { projectCoordinateToJourney } from '@/utils/routeProjection';

/**
 * Eine Bergfahrt mit ungleichmaessiger Aufzeichnungsdichte.
 *
 * Bergauf wird langsam gefahren, das Geraet zeichnet dort viele Punkte je
 * Kilometer auf; bergab wenige. Genau diese Ungleichverteilung liess Marker,
 * Hoehenprofil und Fotos im Video auseinanderlaufen: Der Marker zaehlte nach
 * Kilometern, die beiden anderen nach Messpunkt-Nummer.
 */
function makeBergTrack(): GPXTrack {
  const points: GPXPoint[] = [];
  const push = (lat: number, elevation: number, distance: number) => {
    points.push({
      lat,
      lon: 10.0,
      elevation,
      time: null,
      heartRate: null,
      cadence: null,
      power: null,
      temperature: null,
      distance,
      speed: 0,
    });
  };

  // Anstieg: 40 Punkte auf 4000 m (alle 100 m ein Punkt)
  for (let i = 0; i < 40; i += 1) {
    push(51.0 + i * 0.001, 500 + i * 16, i * 100);
  }
  // Gipfel bei 4000 m Streckenlaenge
  push(51.04, 1140, 4000);
  // Abfahrt: nur 10 Punkte auf ebenfalls 4000 m (alle 400 m ein Punkt)
  for (let i = 1; i <= 10; i += 1) {
    push(51.04 - i * 0.004, 1140 - i * 64, 4000 + i * 400);
  }

  return {
    id: 'berg', name: 'Bergfahrt', activityIcon: '🚴', points,
    totalDistance: 8000, totalTime: 3600, movingTime: 3600,
    elevationGain: 640, elevationLoss: 640, maxElevation: 1140, minElevation: 500,
    maxSpeed: 10, avgSpeed: 5, avgMovingSpeed: 5,
    bounds: { minLat: 51.0, maxLat: 51.04, minLon: 10.0, maxLon: 10.0 },
    color: '#000', visible: true,
  };
}

const track = makeBergTrack();
const segments = [{ id: 'seg', type: 'track' as const, trackId: 'berg', duration: 60_000 }];
const journey = buildComputedJourney(segments, [track]);

/** Der Gipfel liegt bei genau der Haelfte der Strecke. */
const GIPFEL_NACH_STRECKE = 0.5;
/** Nach Punktnummer liegt er dagegen bei 40 von 50 Punkten - also viel zu spaet. */
const GIPFEL_NACH_PUNKTNUMMER = 40 / 50;

describe('Einordnung bei Constant Pace', () => {
  it('ordnet ein Gipfelfoto nach Entfernung ein, nicht nach Punktnummer', () => {
    expect(journey).not.toBeNull();

    const match = projectCoordinateToJourney(journey!, 51.04, 10.0, 0, 'uniform');

    expect(match).not.toBeNull();
    expect(match!.progress).toBeCloseTo(GIPFEL_NACH_STRECKE, 2);
    // Der alte Wert lag rund 30 Prozentpunkte daneben - das war der Versatz.
    expect(Math.abs(match!.progress - GIPFEL_NACH_PUNKTNUMMER)).toBeGreaterThan(0.2);
  });

  it('setzt den Gipfel im Hoehenprofil an dieselbe Stelle', () => {
    const daten = getJourneyElevationData(journey!.coordinates, journey!.segmentTimings, 'uniform');
    const gipfel = daten.reduce((hoechster, punkt) => punkt.elevation > hoechster.elevation ? punkt : hoechster);

    expect(gipfel.elevation).toBe(1140);
    expect(gipfel.progress).toBeCloseTo(GIPFEL_NACH_STRECKE, 2);
  });

  it('bringt Foto und Hoehenprofil auf denselben Wert', () => {
    const match = projectCoordinateToJourney(journey!, 51.04, 10.0, 0, 'uniform');
    const daten = getJourneyElevationData(journey!.coordinates, journey!.segmentTimings, 'uniform');
    const gipfel = daten.reduce((hoechster, punkt) => punkt.elevation > hoechster.elevation ? punkt : hoechster);

    expect(Math.abs(match!.progress - gipfel.progress)).toBeLessThan(0.02);
  });
});

describe('Real Pace bleibt unveraendert', () => {
  it('ordnet weiterhin nach Messpunkten ein', () => {
    const match = projectCoordinateToJourney(journey!, 51.04, 10.0, 0, 'recorded');

    expect(match).not.toBeNull();
    expect(match!.progress).toBeCloseTo(GIPFEL_NACH_PUNKTNUMMER, 1);
  });
});

/**
 * Die Stelle eines Fotos wurde bisher nur beim Einfuegen berechnet. Wer die
 * Fotos zuerst einfuegt und danach auf Constant Pace umschaltet, behielt den
 * alten Wert. usePictureRouteSync rechnet deshalb aus den gespeicherten
 * Koordinaten neu - diese Tests sichern, dass das zuverlaessig geht.
 */
describe('Nachtraegliches Umschalten des Massstabs', () => {
  it('korrigiert ein zuvor nach Messpunkten eingeordnetes Foto', () => {
    // Einfuegen bei Real Pace: Das Foto merkt sich den Punkt auf der Strecke.
    const beimEinfuegen = projectCoordinateToJourney(journey!, 51.04, 10.0, 0, 'recorded');
    expect(beimEinfuegen!.progress).toBeCloseTo(GIPFEL_NACH_PUNKTNUMMER, 1);

    // Spaeter auf Constant Pace umgeschaltet: Neuberechnung aus denselben
    // gespeicherten Koordinaten.
    const nachUmschalten = projectCoordinateToJourney(
      journey!,
      beimEinfuegen!.lat,
      beimEinfuegen!.lon,
      beimEinfuegen!.progress,
      'uniform',
    );

    expect(nachUmschalten!.progress).toBeCloseTo(GIPFEL_NACH_STRECKE, 2);
  });

  it('bleibt bei wiederholter Neuberechnung stabil', () => {
    const ersteRechnung = projectCoordinateToJourney(journey!, 51.04, 10.0, 0, 'uniform');
    const zweiteRechnung = projectCoordinateToJourney(
      journey!,
      ersteRechnung!.lat,
      ersteRechnung!.lon,
      ersteRechnung!.progress,
      'uniform',
    );

    expect(zweiteRechnung!.progress).toBeCloseTo(ersteRechnung!.progress, 6);
  });
});
