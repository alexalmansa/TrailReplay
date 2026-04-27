const TO_EMAIL = 'alexalmansa5@gmail.com';
const FROM_EMAIL = 'TrailReplay Feedback <onboarding@resend.dev>';
const RESEND_API_URL = 'https://api.resend.com/emails';

const rateLimitMap = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQ_PER_WINDOW = 5;

function isRateLimited(ip) {
  const now = Date.now();
  const data = rateLimitMap.get(ip) || { count: 0, resetAt: now + WINDOW_MS };

  if (now > data.resetAt) {
    data.count = 0;
    data.resetAt = now + WINDOW_MS;
  }

  data.count += 1;
  rateLimitMap.set(ip, data);
  return data.count > MAX_REQ_PER_WINDOW;
}

function json(body, status = 200) {
  return Response.json(body, { status });
}

function buildErrorMessage(data, status) {
  if (!data || typeof data !== 'object') {
    return `Resend request failed (${status})`;
  }

  return (
    data.message ||
    data.error?.message ||
    data.error ||
    data.name ||
    `Resend request failed (${status})`
  );
}

export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const ip = (
    context.request.headers.get('cf-connecting-ip') ||
    context.request.headers.get('x-forwarded-for') ||
    ''
  )
    .split(',')[0]
    .trim();

  if (isRateLimited(ip || 'unknown')) {
    return json({ error: 'Too many requests. Please try again later.' }, 429);
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const {
    name = '',
    email = '',
    message = '',
    website = '',
    meta = {},
  } = body || {};

  if (website) {
    return json({ ok: true });
  }

  const trimmedMessage = (message || '').trim();
  if (!trimmedMessage || trimmedMessage.length < 5 || trimmedMessage.length > 5000) {
    return json({ error: 'Invalid message' }, 400);
  }

  const resendApiKey = context.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error('Feedback send error: missing RESEND_API_KEY');
    return json({ error: 'Failed to send' }, 500);
  }

  const safeName = (name || '').toString().slice(0, 200);
  const safeEmail = (email || '').toString().slice(0, 200);
  const subject = `New TrailReplay feedback from ${safeName || 'Anonymous'}`;
  const text = [
    `Name: ${safeName || 'Anonymous'}`,
    `Email: ${safeEmail || 'N/A'}`,
    `Path: ${meta?.path || '/'}; UA: ${(meta?.ua || '').slice(0, 300)}`,
    '',
    trimmedMessage,
  ].join('\n');

  try {
    const resendResponse = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: TO_EMAIL,
        reply_to: safeEmail || undefined,
        subject,
        text,
      }),
    });

    const resendData = await resendResponse.json().catch(() => null);

    if (!resendResponse.ok) {
      const errorMessage = buildErrorMessage(resendData, resendResponse.status);
      console.error('Resend send error:', resendData || resendResponse.statusText);
      return json({ error: errorMessage }, 502);
    }

    return json({ ok: true, id: resendData?.id });
  } catch (error) {
    console.error('Feedback send error:', error);
    return json({ error: 'Failed to send' }, 500);
  }
}
