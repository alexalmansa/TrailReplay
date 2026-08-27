import { describe, expect, it, vi } from 'vitest';
import { onRequest } from '../../../functions/_middleware.js';

describe('Pages hostname middleware', () => {
  it('keeps www API requests on their original same-origin hostname', async () => {
    const downstream = new Response('api response');
    const next = vi.fn().mockResolvedValue(downstream);

    const response = await onRequest({
      request: new Request('https://www.trailreplay.com/api/landmarks', { method: 'POST' }),
      next,
    });

    expect(response).toBe(downstream);
    expect(next).toHaveBeenCalledOnce();
  });

  it('still redirects www page requests to the canonical apex hostname', async () => {
    const next = vi.fn();

    const response = await onRequest({
      request: new Request('https://www.trailreplay.com/tutorial?source=test'),
      next,
    });

    expect(response.status).toBe(301);
    expect(response.headers.get('Location')).toBe('https://trailreplay.com/tutorial?source=test');
    expect(next).not.toHaveBeenCalled();
  });
});
