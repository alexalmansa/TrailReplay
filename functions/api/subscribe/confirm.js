// GET /api/subscribe/confirm?t=<token> — completes double opt-in.
//
// Until this runs, a lead has only *asked* to be subscribed. Nothing may be
// mailed to them: the marketable list is defined as rows with
// marketing_confirmed_at set and marketing_unsubscribed_at null.

import { methodNotAllowed, requireLeadsDb } from '../../../functions-lib/http.js';
import { hashToken } from '../../../functions-lib/tokens.js';
import { renderNoticePage } from '../../../functions-lib/emailTemplates.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'GET') return methodNotAllowed('GET');
  const notConfigured = requireLeadsDb(env);
  if (notConfigured) return notConfigured;

  const token = new URL(request.url).searchParams.get('t');
  if (!token) {
    return renderNoticePage({
      title: 'Link not valid',
      message: 'This confirmation link is incomplete. Try the link in your email again.',
      status: 400,
    });
  }

  // Looked up by hash rather than compared row by row: the token carries 256
  // bits of entropy, so an indexed exact match is both safe and O(1).
  const lead = await env.LEADS_DB
    .prepare('SELECT email, marketing_confirmed_at FROM leads WHERE confirm_token_hash = ?')
    .bind(await hashToken(token))
    .first();

  if (!lead) {
    return renderNoticePage({
      title: 'Link not valid',
      message: 'This confirmation link has already been used or is no longer valid.',
      status: 404,
    });
  }

  if (lead.marketing_confirmed_at) {
    return renderNoticePage({
      title: 'Already confirmed',
      message: 'You are on the list. We will email you when the phone app is ready.',
    });
  }

  // The token is cleared on use so the link is single-use, and confirming
  // reverses any earlier unsubscribe — this is a deliberate act by the owner
  // of the address.
  await env.LEADS_DB
    .prepare(`
      UPDATE leads
      SET marketing_confirmed_at = ?,
          marketing_unsubscribed_at = NULL,
          confirm_token_hash = NULL
      WHERE email = ?
    `)
    .bind(new Date().toISOString(), lead.email)
    .run();

  return renderNoticePage({
    title: 'You are on the list',
    message: 'Thanks — we will let you know the moment the TrailReplay phone app is ready.',
  });
}
