import { describe, expect, it } from 'vitest';
import { renderExportReadyEmail } from './emailTemplates.js';

describe('renderExportReadyEmail', () => {
  it('renders a branded, button-led export email with a text fallback', () => {
    const message = renderExportReadyEmail({
      downloadUrl: 'https://trailreplay.com/api/download/job?t=secret&part=1',
      expiryDays: 7,
      confirmUrl: null,
      unsubscribeUrl: null,
    });

    expect(message.subject).toBe('Your TrailReplay video is ready');
    expect(message.html).toContain('https://trailreplay.com/media/images/simplelogo.png');
    expect(message.html).toContain('alt="TrailReplay logo"');
    expect(message.html).toContain('Download your video');
    expect(message.html).toContain('background:#e2703a');
    expect(message.html).toContain('t=secret&amp;part=1');
    expect(message.text).toContain('Download: https://trailreplay.com/api/download/job?t=secret&part=1');
  });
});
