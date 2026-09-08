// GET /api/download/:jobId?t=<jobToken> — serve the finished video.
//
// The object is streamed back through the Function rather than handed out as a
// presigned R2 URL, so the job token stays the single authorisation mechanism
// and the link can be revoked by expiring the row. Response bodies are not
// subject to the request body limit that caps uploads.

import { errorResponse, requireLeadsDb } from '../../../functions-lib/http.js';
import { verifyToken } from '../../../functions-lib/tokens.js';

export async function onRequest({ request, env, params }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return errorResponse('method_not_allowed', 'Use GET', 405);
  }

  const notConfigured = requireLeadsDb(env);
  if (notConfigured) return notConfigured;
  if (!env.EXPORTS_BUCKET) {
    return errorResponse('not_configured', 'Video storage is not configured', 503);
  }

  const job = await env.LEADS_DB
    .prepare('SELECT id, status, job_token_hash, object_key, expires_at FROM export_jobs WHERE id = ?')
    .bind(params.jobId)
    .first();

  const token = new URL(request.url).searchParams.get('t');
  if (!job || !(await verifyToken(token, job.job_token_hash))) {
    return errorResponse('not_found', 'This download link is not valid', 404);
  }

  if (Date.parse(job.expires_at) < Date.now()) {
    return errorResponse('expired', 'This download link has expired', 410);
  }
  if (!job.object_key) {
    return errorResponse('not_ready', 'This video is not ready yet', 409);
  }

  // Range support matters here: without it, a paused or resumed download of a
  // 60-80 MB file has to start over.
  const object = await env.EXPORTS_BUCKET.get(job.object_key, {
    range: request.headers,
    onlyIf: request.headers,
  });

  if (!object) {
    return errorResponse('gone', 'This video is no longer available', 410);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('Content-Disposition', `attachment; filename="trail-replay-${job.id}.mp4"`);

  // `get` with onlyIf/range returns a body-less result for 304 and 412.
  if (!('body' in object) || object.body === null) {
    return new Response(null, { status: 304, headers });
  }

  const isPartial = Boolean(object.range) && request.headers.has('Range');
  if (isPartial) {
    headers.set(
      'Content-Range',
      `bytes ${object.range.offset}-${object.range.offset + object.range.length - 1}/${object.size}`,
    );
  }

  return new Response(request.method === 'HEAD' ? null : object.body, {
    status: isPartial ? 206 : 200,
    headers,
  });
}
