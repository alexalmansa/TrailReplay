/**
 * Metrics for a replay sampled frame by frame.
 *
 * These are the ones app/src/components/map/CAMERA.md found to correlate with
 * "feels bad" — reversals, freezes and percentiles rather than averages, which
 * hide everything. Kept pure and separate from the browser driving so they can
 * be tested offline.
 */

/**
 * Direction reversals in a channel: the single best proxy for "bumpy". A
 * cinematic channel reverses a handful of times per minute; a defective one
 * reversed over a thousand.
 *
 * Deltas below `deadband` count as no movement rather than as a direction, so
 * float noise around a stationary value is not read as a reversal.
 */
export function directionReversals(values, deadband = 0) {
  let reversals = 0;
  let previousSign = 0;
  for (let index = 1; index < values.length; index += 1) {
    const delta = values[index] - values[index - 1];
    if (Math.abs(delta) <= deadband) continue;
    const sign = Math.sign(delta);
    if (previousSign !== 0 && sign !== previousSign) reversals += 1;
    previousSign = sign;
  }
  return reversals;
}

/** Share of frames where the channel did not move, and the longest such run. */
export function frozenFrames(values, deadband = 0) {
  let frozen = 0;
  let run = 0;
  let longestRun = 0;
  for (let index = 1; index < values.length; index += 1) {
    if (Math.abs(values[index] - values[index - 1]) <= deadband) {
      frozen += 1;
      run += 1;
      longestRun = Math.max(longestRun, run);
    } else {
      run = 0;
    }
  }
  const comparisons = Math.max(values.length - 1, 1);
  return { percent: (frozen / comparisons) * 100, longestRun };
}

/**
 * Percentiles of change, not the mean. Fixing stick-slip *raises* the median
 * while lowering the 99th — motion redistributed from lurches into glide — and
 * a mean shows almost nothing.
 *
 * Reported per second rather than per frame. Software WebGL renders at a
 * fraction of real frame rate, and a per-frame figure would say "the camera
 * lurched 40 degrees" when it only means each frame covered a third of a
 * second.
 */
export function changePercentiles(values, times) {
  const deltas = [];
  for (let index = 1; index < values.length; index += 1) {
    const dt = times ? (times[index] - times[index - 1]) / 1000 : 1;
    if (dt <= 0) continue;
    deltas.push(Math.abs(values[index] - values[index - 1]) / dt);
  }
  if (deltas.length === 0) return { p50: 0, p95: 0, p99: 0, max: 0 };
  deltas.sort((left, right) => left - right);
  const at = (fraction) => deltas[Math.min(deltas.length - 1, Math.floor(deltas.length * fraction))];
  return { p50: at(0.5), p95: at(0.95), p99: at(0.99), max: deltas[deltas.length - 1] };
}

/**
 * Fast shake separated from slow drift: RMS deviation of the marker from its
 * own moving average. A pan reads as zero here; a tremor does not.
 *
 * The window is centred on the sample, not trailing it. A trailing average lags
 * a ramp by half its width, so a perfectly smooth pan would report a constant
 * deviation and be indistinguishable from shake — the same time-lag bias
 * CAMERA.md warns about in the camera itself.
 */
export function jitterRms(values, window = 15) {
  const half = Math.floor(window / 2);
  if (values.length < window) return 0;

  let sumOfSquares = 0;
  let counted = 0;
  for (let index = half; index < values.length - half; index += 1) {
    const slice = values.slice(index - half, index + half + 1);
    const mean = slice.reduce((sum, value) => sum + value, 0) / slice.length;
    sumOfSquares += (values[index] - mean) ** 2;
    counted += 1;
  }
  return counted > 0 ? Math.sqrt(sumOfSquares / counted) : 0;
}

/** Bearing is circular: 359 -> 1 is two degrees, not minus 358. */
export function unwrapDegrees(values) {
  const unwrapped = [];
  let offset = 0;
  for (let index = 0; index < values.length; index += 1) {
    if (index > 0) {
      const delta = values[index] - values[index - 1];
      if (delta > 180) offset -= 360;
      else if (delta < -180) offset += 360;
    }
    unwrapped.push(values[index] + offset);
  }
  return unwrapped;
}

export function summarize(samples) {
  const times = samples.map((sample) => sample.t);
  const elapsedSeconds = (times[times.length - 1] - times[0]) / 1000 || 1;
  const fps = samples.length / elapsedSeconds;

  const channel = (values, deadband) => ({
    reversals: directionReversals(values, deadband),
    reversalsPerMinute: (directionReversals(values, deadband) / elapsedSeconds) * 60,
    frozen: frozenFrames(values, deadband),
    changePerSecond: changePercentiles(values, times),
  });

  const markerX = samples.map((sample) => sample.marker?.x).filter((value) => value !== undefined);
  const markerY = samples.map((sample) => sample.marker?.y).filter((value) => value !== undefined);

  const offCanvas = samples.filter((sample) => sample.marker
    && (sample.marker.x < 0 || sample.marker.x > 1 || sample.marker.y < 0 || sample.marker.y > 1)).length;

  return {
    frames: samples.length,
    fps,
    elapsedSeconds,
    /**
     * The smoothing chain integrates per frame, so below roughly this rate the
     * camera being measured is not the camera a viewer gets. Everything else
     * here — marker in frame, tiles, errors — stays valid.
     */
    channelMetricsRepresentative: fps >= 20,
    // The safety check. A marker outside the canvas is a replay of scenery.
    marker: {
      framesOffCanvas: offCanvas,
      framesMissing: samples.length - markerX.length,
      x: { min: Math.min(...markerX), max: Math.max(...markerX) },
      y: { min: Math.min(...markerY), max: Math.max(...markerY) },
      jitterRms: { x: jitterRms(markerX), y: jitterRms(markerY) },
    },
    bearing: channel(unwrapDegrees(samples.map((s) => s.bearing)), 0.01),
    pitch: channel(samples.map((s) => s.pitch), 0.01),
    zoom: channel(samples.map((s) => s.zoom), 0.0005),
    tilesLoadedPercent: (samples.filter((s) => s.tilesLoaded).length / Math.max(samples.length, 1)) * 100,
  };
}

