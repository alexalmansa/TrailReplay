/**
 * scripts/replay-metrics.mjs is plain Node — the probe runs outside the app and
 * must not depend on its build. These are its shapes, so the metrics can still
 * be type-checked and tested from here.
 */
declare module '*/scripts/replay-metrics.mjs' {
  export function directionReversals(values: number[], deadband?: number): number;
  export function frozenFrames(
    values: number[],
    deadband?: number,
  ): { percent: number; longestRun: number };
  export function changePercentiles(
    values: number[],
    times?: number[],
  ): { p50: number; p95: number; p99: number; max: number };
  export function jitterRms(values: number[], window?: number): number;
  export function unwrapDegrees(values: number[]): number[];

  export interface ReplaySample {
    t: number;
    progress: number;
    bearing: number;
    pitch: number;
    zoom: number;
    tilesLoaded: boolean;
    marker: { x: number; y: number } | null;
  }

  export function summarize(samples: ReplaySample[]): {
    frames: number;
    fps: number;
    elapsedSeconds: number;
    channelMetricsRepresentative: boolean;
    marker: {
      framesOffCanvas: number;
      framesMissing: number;
      x: { min: number; max: number };
      y: { min: number; max: number };
      jitterRms: { x: number; y: number };
    };
    tilesLoadedPercent: number;
  };
}
