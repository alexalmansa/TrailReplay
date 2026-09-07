import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  boundAnchorToMarker,
  getSmoothedCameraAnchor,
  getSmoothedRouteHeadingDeg,
  smoothRoutePosition,
  visibleWidthMetersAtZoom,
} from './cinematicCameraAnchor';
import { getRouteBearingAtProgress, getInterpolatedRouteCoordinate } from './replayCameraPlan';
import {
  cinematicAnchorSmoothingHalfWindow,
  cinematicHeadingBaselineHalfWidth,
} from '@/components/map/cameraUtils';

const SAMPLE_COUNT = 601;

/**
 * The windows the product actually ships, rather than magic numbers: a 60 s
 * clip at the slider's default and at its stable end. Tying the measurements
 * to the real mapping means retuning the dial has to be justified against
 * these numbers.
 */
const CLIP_SECONDS = 60;
const DEFAULT_HALF_WINDOW = cinematicAnchorSmoothingHalfWindow(0.5, CLIP_SECONDS);
const STABLE_HALF_WINDOW = cinematicAnchorSmoothingHalfWindow(0, CLIP_SECONDS);

/** Due east at a constant rate — the case that must survive smoothing untouched. */
const straightRoute = Array.from({ length: SAMPLE_COUNT }, (_, index) => [index * 0.0002, 45]);

/**
 * A climbing traverse with hairpins: net progress north, with a lateral
 * zig-zag of about ±55 m repeating every 24 samples. On a 60 s clip those 601
 * samples are 100 ms apart, so one full switchback cycle is 2.4 s of video —
 * faster than the camera should be asked to follow.
 */
const switchbackRoute = Array.from({ length: SAMPLE_COUNT }, (_, index) => {
  const phase = (index % 24) / 24;
  const triangle = phase < 0.5 ? phase * 4 - 1 : 3 - phase * 4;
  return [triangle * 0.0007, 45 + index * 0.00002];
});

function metersBetween(a: number[], b: number[]): number {
  const latScale = 111_320;
  const lonScale = latScale * Math.cos((a[1] * Math.PI) / 180);
  return Math.hypot((b[0] - a[0]) * lonScale, (b[1] - a[1]) * latScale);
}

function shortestAngleDelta(fromDeg: number, toDeg: number): number {
  return (((toDeg - fromDeg) % 360) + 540) % 360 - 180;
}

/**
 * The sharpest change in the anchor's motion over the clip, as the second
 * difference of its position in metres.
 *
 * Counting how often the path reverses direction was the obvious measure and
 * the wrong one: it is scale-blind, so a half-degree wobble scores the same as
 * a hairpin, and a smoothed path that is small but never perfectly straight
 * scores *worse* than a raw one made of long straight legs. Acceleration is
 * what actually reads as shake — it is how hard the picture is thrown — and it
 * counts a small movement as small.
 */
function peakLateralAccelerationMeters(path: Array<[number, number]>): number {
  const latScale = 111_320;
  const stepMeters = (from: number[], to: number[]) => {
    const lonScale = latScale * Math.cos((from[1] * Math.PI) / 180);
    return [(to[0] - from[0]) * lonScale, (to[1] - from[1]) * latScale];
  };

  let peak = 0;
  for (let index = 2; index < path.length; index++) {
    const [previousEast, previousNorth] = stepMeters(path[index - 2], path[index - 1]);
    const [east, north] = stepMeters(path[index - 1], path[index]);
    peak = Math.max(peak, Math.hypot(east - previousEast, north - previousNorth));
  }

  return peak;
}

/**
 * The anchor evaluated across the middle of a clip, at 60 fps.
 *
 * Deliberately not the whole clip: the window shrinks to nothing at both ends
 * (there is no route beyond them to average against), so including them would
 * measure the taper rather than the smoothing. The taper is asserted
 * separately, as its own property.
 */
function anchorPath(
  coordinates: number[][],
  smoothingHalfWindow: number,
  frames = 400,
): Array<[number, number]> {
  return Array.from({ length: frames }, (_, frame) => {
    const progress = 0.1 + (frame / (frames - 1)) * 0.8;
    const marker = getInterpolatedRouteCoordinate(coordinates, progress * (coordinates.length - 1));
    return getSmoothedCameraAnchor({
      coordinates,
      progress,
      smoothingHalfWindow,
      markerPosition: marker ?? [0, 0],
      // Far enough back that the framing bound never binds, so this measures
      // the smoothing on its own.
      zoom: 11,
    });
  });
}

/** Peak-to-peak longitude excursion — how far the camera swings side to side. */
function lateralSwing(path: Array<[number, number]>): number {
  const longitudes = path.map(([lon]) => lon);
  return Math.max(...longitudes) - Math.min(...longitudes);
}

describe('smoothRoutePosition', () => {
  it('returns a straight constant-speed run untouched — the smoothing costs no lag', () => {
    // The whole design rests on this: a symmetric kernel over a linear ramp
    // returns the ramp's midpoint, so there is nothing to fall behind on.
    for (let frame = 0; frame <= 20; frame++) {
      const progress = frame / 20;
      const smoothed = smoothRoutePosition(straightRoute, progress, 0.05);
      const marker = getInterpolatedRouteCoordinate(
        straightRoute,
        progress * (straightRoute.length - 1),
      );
      expect(smoothed).not.toBeNull();
      expect(metersBetween(marker!, smoothed!)).toBeLessThan(0.01);
    }
  });

  it('stays symmetric at the ends instead of biasing toward the side that still has route', () => {
    // A window truncated against the start of the array would average only
    // route that is still ahead, putting the camera in front of a marker that
    // has not moved yet.
    const atStart = smoothRoutePosition(straightRoute, 0, 0.05);
    const atEnd = smoothRoutePosition(straightRoute, 1, 0.05);

    expect(metersBetween(straightRoute[0], atStart!)).toBeLessThan(0.01);
    expect(metersBetween(straightRoute[straightRoute.length - 1], atEnd!)).toBeLessThan(0.01);
  });

  it('tapers to the marker at the very start and end, where there is nothing to average against', () => {
    // A consequence of staying symmetric, not a defect: at progress 0 there is
    // no route behind to balance the route ahead, so the only unbiased window
    // is an empty one. Worth pinning, because the alternative — letting the
    // window run one-sided — would start the camera ahead of a marker that
    // has not moved.
    for (const progress of [0, 1]) {
      const anchor = smoothRoutePosition(switchbackRoute, progress, 0.05);
      const marker = getInterpolatedRouteCoordinate(
        switchbackRoute,
        progress * (switchbackRoute.length - 1),
      );
      expect(metersBetween(marker!, anchor!)).toBeLessThan(0.01);
    }
  });

  it('moves continuously — no staircase as the window slides', () => {
    let maxStepMeters = 0;
    let unchangedFrames = 0;
    const path = anchorPath(switchbackRoute, 0.025);

    for (let index = 1; index < path.length; index++) {
      const step = metersBetween(path[index - 1], path[index]);
      maxStepMeters = Math.max(maxStepMeters, step);
      if (step === 0) unchangedFrames++;
    }

    expect(unchangedFrames).toBe(0);
    // Frame-to-frame motion stays in the same order of magnitude as the
    // route's own advance; a window snapping a whole sample at a time would
    // show up here as an outlier step.
    expect(maxStepMeters).toBeLessThan(30);
  });
});

describe('anchor smoothing across switchbacks', () => {
  it('collapses the lateral swing the hairpins put into the camera', () => {
    // This is the measurement the whole change exists for: how far the camera
    // is thrown side to side by a route that keeps doubling back. The marker
    // still travels the full zig-zag; the camera should not.
    const rawSwing = lateralSwing(anchorPath(switchbackRoute, 0));
    const defaultSwing = lateralSwing(anchorPath(switchbackRoute, DEFAULT_HALF_WINDOW));
    const stableSwing = lateralSwing(anchorPath(switchbackRoute, STABLE_HALF_WINDOW));

    expect(rawSwing).toBeGreaterThan(0.0012);
    expect(defaultSwing).toBeLessThan(rawSwing * 0.35);
    expect(stableSwing).toBeLessThan(rawSwing * 0.05);
  });

  it('keeps suppressing further as the window widens', () => {
    const narrow = lateralSwing(anchorPath(switchbackRoute, 0.01));
    const wide = lateralSwing(anchorPath(switchbackRoute, STABLE_HALF_WINDOW));

    // Not asserted step by step: a symmetric window spanning a whole number
    // of hairpin cycles nulls them exactly, so the curve has dips in it
    // rather than descending evenly. Comparing well-separated widths is the
    // claim that actually holds.
    expect(wide).toBeLessThan(narrow * 0.2);
  });

  it('stops the camera being thrown around at each hairpin', () => {
    // Measured on this fixture: the raw anchor peaks at about 21 m of
    // frame-to-frame acceleration as it snaps through a hairpin. Smoothed,
    // that falls to under a metre — the camera crosses the same ground
    // without ever being jerked.
    const rawPeak = peakLateralAccelerationMeters(anchorPath(switchbackRoute, 0));
    const smoothedPeak = peakLateralAccelerationMeters(
      anchorPath(switchbackRoute, STABLE_HALF_WINDOW),
    );

    expect(rawPeak).toBeGreaterThan(15);
    expect(smoothedPeak).toBeLessThan(rawPeak * 0.1);
  });
});

describe('boundAnchorToMarker', () => {
  const marker: [number, number] = [0, 45];

  /** Offsets the anchor due east of the marker by a given number of metres. */
  function anchorEastOf(meters: number): [number, number] {
    const lonScale = 111_320 * Math.cos((marker[1] * Math.PI) / 180);
    return [marker[0] + meters / lonScale, marker[1]];
  }

  it('leaves a small offset completely alone', () => {
    const bounded = boundAnchorToMarker(anchorEastOf(20), marker, 15);
    expect(metersBetween(marker, bounded)).toBeCloseTo(20, 1);
  });

  it('never lets the marker leave the framed region, however far the smoothed line strays', () => {
    // At this zoom the allowance is a fixed fraction of the visible width.
    const maxOffset = visibleWidthMetersAtZoom(15, marker[1]) * 0.22;

    for (const requested of [maxOffset, maxOffset * 4, maxOffset * 50]) {
      const bounded = boundAnchorToMarker(anchorEastOf(requested), marker, 15);
      expect(metersBetween(marker, bounded)).toBeLessThanOrEqual(maxOffset + 1e-6);
    }
  });

  it('compresses continuously rather than clamping — the shape that avoids stick-slip', () => {
    // A hard clamp is flat once it binds: the anchor would stop responding to
    // the smoothed line entirely, then lurch when it came back under the
    // limit. Sampling right across the transition, the response has to stay
    // continuous and never move backwards.
    const maxOffset = visibleWidthMetersAtZoom(15, marker[1]) * 0.22;
    const samples = Array.from({ length: 200 }, (_, index) => {
      const requested = (index / 199) * maxOffset * 1.5;
      return metersBetween(marker, boundAnchorToMarker(anchorEastOf(requested), marker, 15));
    });

    for (let index = 1; index < samples.length; index++) {
      expect(samples[index]).toBeGreaterThanOrEqual(samples[index - 1] - 1e-9);
      expect(samples[index] - samples[index - 1]).toBeLessThan(maxOffset * 0.05);
    }
  });

  it('scales the allowance with zoom, so the bound means the same thing at any framing', () => {
    const closeOffset = metersBetween(marker, boundAnchorToMarker(anchorEastOf(5000), marker, 16));
    const wideOffset = metersBetween(marker, boundAnchorToMarker(anchorEastOf(5000), marker, 12));
    expect(wideOffset).toBeGreaterThan(closeOffset * 4);
  });
});

describe('getSmoothedRouteHeadingDeg', () => {
  it('holds a steady heading through hairpins that swing the local one wildly', () => {
    const frames = 300;
    // The interior, for the same reason the anchor is measured there: both the
    // smoothing window and the heading baseline necessarily narrow at the ends
    // of the route, so including them would measure the taper.
    const readings = Array.from({ length: frames }, (_, frame) => {
      const progress = 0.1 + (frame / (frames - 1)) * 0.8;
      return {
        local: getRouteBearingAtProgress(switchbackRoute, progress),
        smoothed: getSmoothedRouteHeadingDeg({
          coordinates: switchbackRoute,
          progress,
          smoothingHalfWindow: DEFAULT_HALF_WINDOW,
          baselineHalfWidth: cinematicHeadingBaselineHalfWidth(DEFAULT_HALF_WINDOW),
        }),
      };
    });

    const swingOf = (values: number[]) => {
      let total = 0;
      for (let index = 1; index < values.length; index++) {
        total += Math.abs(shortestAngleDelta(values[index - 1], values[index]));
      }
      return total;
    };

    const localSwing = swingOf(readings.map((reading) => reading.local));
    const smoothedSwing = swingOf(readings.map((reading) => reading.smoothed ?? 0));

    // The route genuinely points north overall; the hairpins make the local
    // reading sweep back and forth across that. Measured on this fixture the
    // local reading accumulates about 4800 degrees of heading change over the
    // clip — that is the camera being told to turn, over and over.
    expect(localSwing).toBeGreaterThan(3000);
    expect(smoothedSwing).toBeLessThan(localSwing * 0.25);

    // And it points where the route actually goes, rather than wherever the
    // current hairpin happens to face.
    for (const reading of readings) {
      expect(Math.abs(shortestAngleDelta(reading.smoothed ?? 0, 0))).toBeLessThan(20);
    }
  });

  it('reports a straight route’s true heading', () => {
    const heading = getSmoothedRouteHeadingDeg({
      coordinates: straightRoute,
      progress: 0.5,
      smoothingHalfWindow: 0.02,
      baselineHalfWidth: 0.05,
    });
    expect(heading).toBeCloseTo(90, 1);
  });

  it('returns null when there is no route to read', () => {
    expect(getSmoothedRouteHeadingDeg({
      coordinates: [],
      progress: 0.5,
      smoothingHalfWindow: 0.02,
      baselineHalfWidth: 0.05,
    })).toBeNull();
  });
});

describe('the heading a cinematic shot follows', () => {
  /**
   * Measured against a real route rather than a synthetic one, because the
   * synthetic version flattered the change: `getRouteBearingAtProgress`
   * already averages over sixteen samples, so a made-up weave at a few
   * samples' period is gone before this ever sees it. Real GPS wander is
   * broadband and does survive it.
   *
   * 206 km ridden, replayed as a 60 s clip — 3.4 km of ground per second of
   * video, which is where a camera that tracks the route's every turn is at
   * its worst.
   */
  const realRoute = (() => {
    const xml = readFileSync('public/media/samples/pedals-de-foc-non-stop-2023.gpx', 'utf8');
    const points = [...xml.matchAll(/lat="([-0-9.]+)"\s+lon="([-0-9.]+)"/g)]
      .map((match) => ({ lat: Number(match[1]), lon: Number(match[2]) }));

    // Resampled evenly, the way `cameraPathCoordinates` is.
    return Array.from({ length: SAMPLE_COUNT }, (_, index) => {
      const exact = (index / (SAMPLE_COUNT - 1)) * (points.length - 1);
      const lower = Math.floor(exact);
      const upper = Math.min(points.length - 1, lower + 1);
      const fraction = exact - lower;
      return [
        points[lower].lon + (points[upper].lon - points[lower].lon) * fraction,
        points[lower].lat + (points[upper].lat - points[lower].lat) * fraction,
      ];
    });
  })();

  function headingSeries(halfWindow: number, frames = 1200): number[] {
    return Array.from({ length: frames }, (_, frame) => {
      const progress = frame / (frames - 1);
      return getSmoothedRouteHeadingDeg({
        coordinates: realRoute,
        progress,
        smoothingHalfWindow: halfWindow,
        baselineHalfWidth: cinematicHeadingBaselineHalfWidth(halfWindow),
      }) ?? getRouteBearingAtProgress(realRoute, progress);
    });
  }

  function totalTurning(readings: number[]): number {
    let total = 0;
    for (let index = 1; index < readings.length; index++) {
      total += Math.abs(shortestAngleDelta(readings[index - 1], readings[index]));
    }
    return total;
  }

  function directionReversals(readings: number[]): number {
    let reversals = 0;
    let previous: number | null = null;
    for (let index = 1; index < readings.length; index++) {
      const turn = shortestAngleDelta(readings[index - 1], readings[index]);
      if (Math.abs(turn) < 0.05) continue;
      if (previous !== null && Math.sign(turn) !== Math.sign(previous)) reversals++;
      previous = turn;
    }
    return reversals;
  }

  it('turns a fraction as much as the raw heading, and stops changing its mind', () => {
    const raw = Array.from({ length: 1200 }, (_, frame) =>
      getRouteBearingAtProgress(realRoute, frame / 1199));
    const smoothed = headingSeries(DEFAULT_HALF_WINDOW);

    // The raw reading is what follow-behind starts from and then spends a
    // whole smoothing chain taming; this one arrives already calm. Measured
    // here: the raw heading reverses 44 times over the clip, the default
    // cinematic heading 17, and the stable end of the slider barely at all.
    expect(totalTurning(smoothed)).toBeLessThan(totalTurning(raw) * 0.35);
    expect(directionReversals(smoothed) * 2).toBeLessThan(directionReversals(raw));

    const stable = headingSeries(STABLE_HALF_WINDOW);
    expect(directionReversals(stable)).toBeLessThan(directionReversals(raw) * 0.15);
  });

  it('still comes round with the route rather than freezing', () => {
    // Smoothing that simply stopped responding would score perfectly on
    // turning and be useless. This route genuinely goes in every direction,
    // and the camera has to follow it round.
    const smoothed = headingSeries(STABLE_HALF_WINDOW);
    const spread = Math.max(...smoothed) - Math.min(...smoothed);
    expect(spread).toBeGreaterThan(90);
  });
});
