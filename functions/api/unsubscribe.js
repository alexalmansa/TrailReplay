// GET /api/unsubscribe?t=<token> — removes a lead from the marketing list.
//
// Kept deliberately frictionless: one click, no login, no confirmation step.
// The unsubscribe token is not cleared on use, so a second click on an old
// email still lands on a sensible page instead of "link not valid".

import { methodNotAllowed, requireLeadsDb } from '../../functions-lib/http.js';
import { hashToken } from '../../functions-lib/tokens.js';
import { renderNoticePage } from '../../functions-lib/emailTemplates.js';

export async function onRequest({ request, env }) {
  if (request.method !== 'GET') return methodNotAllowed('GET');
  const notConfigured = requireLeadsDb(env);
  if (notConfigured) return notConfigured;

  const token = new URL(request.url).searchParams.get('t');
  if (!token) {
    return renderNoticePage({
      title: 'Link not valid',
      message: 'This unsubscribe link is incomplete. Try the link in your email again.',
      status: 400,
    });
  }

  const lead = await env.LEADS_DB
    .prepare('SELECT email, marketing_unsubscribed_at FROM leads WHERE unsubscribe_token_hash = ?')
    .bind(await hashToken(token))
    .first();

  if (!lead) {
    return renderNoticePage({
      title: 'Link not valid',
      message: 'This unsubscribe link is no longer valid. Reply to any of our emails and we will remove you.',
      status: 404,
    });
  }

  if (!lead.marketing_unsubscribed_at) {
    // The confirm token is cleared too, so a still-unclicked confirmation link
    // in an older email cannot quietly resubscribe them afterwards.
    await env.LEADS_DB
      .prepare('UPDATE leads SET marketing_unsubscribed_at = ?, confirm_token_hash = NULL WHERE email = ?')
      .bind(new Date().toISOString(), lead.email)
      .run();
  }

  return renderNoticePage({
    title: 'Unsubscribed',
    message: 'You will not receive any more marketing email from TrailReplay. Videos you export will still be delivered.',
  });
}
