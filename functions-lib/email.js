// Outbound email, behind one function so the provider is a single-file swap.
//
// Deliberately NOT the `send_email` Worker binding. That binding belongs to
// Cloudflare Email *Routing*, takes a raw RFC 822 MIME message, and can only
// deliver to addresses already verified inside your own account — so it cannot
// mail a customer. (Confirmed empirically: passing the documented Email Service
// object shape to it fails with "could not parse email".)
//
// Primary here is Cloudflare Email *Sending* over its REST API, which does
// deliver to arbitrary recipients. It is in beta and needs a Workers Paid plan
// plus a verified sending domain, so Resend stays wired up as a fallback.

const DEFAULT_FROM = 'TrailReplay <videos@mail.trailreplay.com>';

const CLOUDFLARE_SEND_ENDPOINT = (accountId) =>
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/send`;

export class EmailNotConfiguredError extends Error {
  constructor() {
    super(
      'No email provider configured: set CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_EMAIL_API_TOKEN, or RESEND_API_KEY',
    );
    this.name = 'EmailNotConfiguredError';
  }
}

/**
 * Sends one transactional email. Returns `{ provider, messageId }`.
 *
 * Throws on failure rather than swallowing it, so the caller can record the
 * job as undelivered — a lost video must be visible in the data instead of
 * looking successful.
 */
export async function sendEmail(env, message) {
  const payload = {
    from: env.EMAIL_FROM || DEFAULT_FROM,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  };

  if (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_EMAIL_API_TOKEN) {
    try {
      return await sendViaCloudflare(env, payload);
    } catch (error) {
      // Authentication failures happen before Cloudflare accepts a message,
      // so retrying through the configured fallback cannot double-deliver it.
      // Do not fall back for ambiguous provider/network failures.
      if (env.RESEND_API_KEY && error instanceof CloudflareEmailError && error.authenticationFailure) {
        return sendViaResend(env, payload);
      }
      throw error;
    }
  }

  if (env.RESEND_API_KEY) {
    return sendViaResend(env, payload);
  }

  throw new EmailNotConfiguredError();
}

class CloudflareEmailError extends Error {
  constructor(detail, authenticationFailure) {
    super(`Cloudflare Email Sending rejected the message: ${detail}`.slice(0, 400));
    this.name = 'CloudflareEmailError';
    this.authenticationFailure = authenticationFailure;
  }
}

async function sendViaCloudflare(env, payload) {
  const response = await fetch(CLOUDFLARE_SEND_ENDPOINT(env.CLOUDFLARE_ACCOUNT_ID), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.CLOUDFLARE_EMAIL_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => null);

  // Cloudflare answers 200 with `success: false` for some rejections, so the
  // status alone is not enough to call this delivered.
  if (!response.ok || result?.success === false) {
    const detail = result?.errors?.map((error) => error.message).join('; ')
      || `HTTP ${response.status}`;
    const authenticationFailure = response.status === 401
      || response.status === 403
      || /authenticat|invalid.*token|token.*invalid/i.test(detail);
    throw new CloudflareEmailError(detail, authenticationFailure);
  }

  return { provider: 'cloudflare', messageId: result?.result?.message_id ?? null };
}

async function sendViaResend(env, payload) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Resend rejected the message (${response.status}): ${detail}`.slice(0, 400));
  }

  const result = await response.json().catch(() => ({}));
  return { provider: 'resend', messageId: result?.id ?? null };
}
