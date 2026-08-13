import type { TilePreloadSummary, TileDiagnosticRecord } from '@/utils/tilePreloadDiagnostics';

declare global {
  interface Window {
    __trailReplayTileDiagnostics?: () => {
      records: TileDiagnosticRecord[];
      summary: TilePreloadSummary;
    };
  }
}

export {};
