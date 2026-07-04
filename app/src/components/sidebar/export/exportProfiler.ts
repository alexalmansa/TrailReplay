export type StageName = 'render' | 'renderInterval' | 'capture' | 'encodeEnqueue';

export interface StageStats {
  count: number;
  meanMs: number;
  p95Ms: number;
  totalMs: number;
}

export interface StageProfiler {
  mark(stage: StageName, ms: number): void;
  tick(stage: StageName): void;
  snapshot(): Record<StageName, StageStats>;
  reset(): void;
}

const STAGES: StageName[] = ['render', 'renderInterval', 'capture', 'encodeEnqueue'];

export function percentile(sortedAscending: number[], p: number): number {
  if (sortedAscending.length === 0) return 0;
  const rank = Math.ceil(p * sortedAscending.length);
  const index = Math.min(sortedAscending.length - 1, Math.max(0, rank - 1));
  return sortedAscending[index];
}

function statsFor(samples: number[], count: number): StageStats {
  if (count === 0) return { count: 0, meanMs: 0, p95Ms: 0, totalMs: 0 };

  const totalMs = samples.reduce((sum, value) => sum + value, 0);
  const sorted = [...samples].sort((a, b) => a - b);

  return {
    count,
    meanMs: totalMs / count,
    p95Ms: percentile(sorted, 0.95),
    totalMs,
  };
}

export function createStageProfiler(): StageProfiler {
  const durations: Record<StageName, number[]> = {
    render: [],
    renderInterval: [],
    capture: [],
    encodeEnqueue: [],
  };
  const counts: Record<StageName, number> = {
    render: 0,
    renderInterval: 0,
    capture: 0,
    encodeEnqueue: 0,
  };

  return {
    mark(stage, ms) {
      durations[stage].push(ms);
      counts[stage] += 1;
    },
    tick(stage) {
      counts[stage] += 1;
    },
    snapshot() {
      const result = {} as Record<StageName, StageStats>;
      for (const stage of STAGES) {
        result[stage] = statsFor(durations[stage], counts[stage]);
      }
      return result;
    },
    reset() {
      for (const stage of STAGES) {
        durations[stage] = [];
        counts[stage] = 0;
      }
    },
  };
}
