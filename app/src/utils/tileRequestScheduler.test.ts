import { describe, expect, it, vi } from 'vitest';
import { getTilePriority, getTileRequestUrl, TileRequestScheduler } from './tileRequestScheduler';

describe('TileRequestScheduler', () => {
  it('prioritizes essential tiles and does not duplicate a completed tile', async () => {
    let releaseFirst: (() => void) | undefined;
    const firstRequest = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const load = vi.fn((url: string) => url === 'active' ? firstRequest : Promise.resolve());
    const scheduler = new TileRequestScheduler({ concurrency: 1, load });
    scheduler.enqueue({ key: '16/0/0', priority: 0, sourceId: 'base', url: 'active' });
    scheduler.enqueue({ key: '16/1/1', priority: 3, sourceId: 'labels', url: 'labels' });
    scheduler.enqueue({ key: '16/1/2', priority: 0, sourceId: 'base', url: 'base' });
    releaseFirst?.();
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(3));
    expect(load.mock.calls.map(([url]) => url)).toEqual(['active', 'base', 'labels']);

    scheduler.enqueue({ key: '16/1/2', priority: 0, sourceId: 'base', url: 'base' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('builds provider URLs using their required coordinate ordering', () => {
    expect(getTileRequestUrl('esri-clarity', '16/12/34')).toContain('/16/34/12');
    expect(getTileRequestUrl('terrain-dem', '16/12/34')).toContain('/16/12/34.png');
    expect(getTileRequestUrl('fallback-esri-clarity', '12/12/34')).toContain('/12/34/12');
    expect(getTileRequestUrl('slope', '16/12/34')).toBeNull();
  });

  it('prioritizes fallback imagery before detail and terrain tiles', () => {
    expect(getTilePriority('fallback-esri-clarity')).toBeLessThan(getTilePriority('esri-clarity'));
    expect(getTilePriority('esri-clarity')).toBeLessThan(getTilePriority('terrain-dem'));
  });
});
