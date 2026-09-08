// Email bodies for studio export delivery and subscription confirmation.
//
// Deliberately plain HTML with inline styles and a full plain-text alternative:
// mail clients strip <style> blocks, and a text part materially improves
// deliverability for a brand-new sending domain.

const BRAND = '#1d3b32';
const ACCENT = '#e2703a';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function layout(bodyHtml, footerHtml) {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${BRAND}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:12px;padding:32px">
<tr><td>
<div style="font-weight:700;font-size:18px;letter-spacing:.02em;margin-bottom:24px">TrailReplay</div>
${bodyHtml}
</td></tr></table>
<div style="max-width:520px;margin-top:16px;font-size:12px;line-height:1.6;color:#6b7a75">${footerHtml}</div>
</td></tr></table>
</body></html>`;
}

function button(href, label) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px">${escapeHtml(label)}</a>`;
}

/**
 * The delivery email. When the lead has just opted in to marketing, the
 * double opt-in confirmation rides along here rather than as a second message
 * — one email, and the confirmation is attached to something they actually
 * want to open.
 */
export function renderExportReadyEmail({ downloadUrl, expiryDays, confirmUrl, unsubscribeUrl }) {
  const confirmBlockHtml = confirmUrl
    ? `<hr style="border:none;border-top:1px solid #e6e4dd;margin:28px 0">
<p style="margin:0 0 12px;font-size:15px;line-height:1.6"><strong>One more thing.</strong> You asked to hear about the TrailReplay phone app. Confirm your email and we will let you know the moment it is ready.</p>
<p style="margin:0 0 8px">${button(confirmUrl, 'Confirm subscription')}</p>
<p style="margin:0;font-size:13px;color:#6b7a75">If you skip this, you will not hear from us again — your video link above works either way.</p>`
    : '';

  const footerHtml = unsubscribeUrl
    ? `You are receiving this because you exported a video on trailreplay.com. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b7a75">Unsubscribe</a>.`
    : 'You are receiving this because you exported a video on trailreplay.com.';

  const html = layout(`
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">Your video is ready</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6">Your TrailReplay video is ready to download.</p>
<p style="margin:0 0 12px">${button(downloadUrl, 'Download your video')}</p>
<p style="margin:0;font-size:13px;color:#6b7a75">The link works for ${expiryDays} days.</p>
${confirmBlockHtml}`, footerHtml);

  const text = [
    'Your video is ready',
    '',
    'Your TrailReplay video is ready to download.',
    '',
    `Download: ${downloadUrl}`,
    `The link works for ${expiryDays} days.`,
    ...(confirmUrl ? [
      '',
      'You asked to hear about the TrailReplay phone app. Confirm your email',
      'and we will let you know the moment it is ready:',
      confirmUrl,
      '',
      'If you skip this, you will not hear from us again. Your video link works either way.',
    ] : []),
    ...(unsubscribeUrl ? ['', `Unsubscribe: ${unsubscribeUrl}`] : []),
  ].join('\n');

  return { subject: 'Your TrailReplay video is ready', html, text };
}

/** Minimal HTML page returned by the confirm and unsubscribe endpoints. */
export function renderNoticePage({ title, message, status = 200 }) {
  const html = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} · TrailReplay</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${BRAND}">
<div style="max-width:420px;padding:32px;text-align:center">
<div style="font-weight:700;font-size:18px;margin-bottom:20px">TrailReplay</div>
<h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1>
<p style="font-size:15px;line-height:1.6;margin:0 0 24px;color:#4a5c56">${escapeHtml(message)}</p>
<a href="https://trailreplay.com" style="color:${ACCENT};font-weight:600">Back to TrailReplay</a>
</div></body></html>`;

  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
