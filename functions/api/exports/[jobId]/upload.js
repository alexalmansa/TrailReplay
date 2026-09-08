// PUT /api/exports/:jobId/upload — store the rendered video.
//
// The body streams straight into R2 rather than being buffered, so a 60-80 MB
// studio export does not have to fit in the Function's memory. It still passes
// through the Function (instead of a presigned URL) so the job token can
// authorise it; that caps the file at Cloudflare's request body limit. See
// MAX_UPLOAD_BYTES.

import {
  MAX_UPLOAD_BYTES,
  errorResponse,
  json,
  methodNotAllowed,
  requireLeadsDb,
} from '../../../../functions-lib/http.js';
import { verifyToken } from '../../../../functions-lib/tokens.js';

export async function onRequest({ request, env, params }) {
  if (request.method !== 'PUT') return methodNotAllowed('PUT');

  const notConfigured = requireLeadsDb(env);
  if (notConfigured) return notConfigured;
  if (!env.EXPORTS_BUCKET) {
    return errorResponse('not_configured', 'Video storage is not configured', 503);
  }

  const job = await env.LEADS_DB
    .prepare('SELECT id, status, job_token_hash, expires_at FROM export_jobs WHERE id = ?')
    .bind(params.jobId)
    .first();

  // Same response for "no such job" and "wrong token" so the endpoint cannot be
  // used to discover which job ids exist.
  const token = bearerToken(request);
  if (!job || !(await verifyToken(token, job.job_token_hash))) {
    return errorResponse('not_found', 'Unknown export job', 404);
  }

  if (Date.parse(job.expires_at) < Date.now()) {
    return errorResponse('expired', 'This export expired before it was uploaded', 410);
  }

  // Uploading twice would orphan the first object and re-trigger delivery.
  if (job.status !== 'pending') {
    return errorResponse('already_uploaded', 'This export was already uploaded', 409);
  }

  const declaredSize = Number(request.headers.get('Content-Length'));
  if (!Number.isFinite(declaredSize) || declaredSize <= 0) {
    return errorResponse('length_required', 'Content-Length is required', 411);
  }
  if (declaredSize > MAX_UPLOAD_BYTES) {
    return errorResponse(
      'too_large',
      `Video is larger than the ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB limit`,
      413,
    );
  }
  if (!request.body) return errorResponse('bad_request', 'Missing request body', 400);
  const contentType = request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'video/mp4') {
    return errorResponse('unsupported_media_type', 'Studio delivery only accepts MP4 video', 415);
  }

  const objectKey = `exports/${job.id}.mp4`;
  await env.EXPORTS_BUCKET.put(objectKey, request.body, {
    httpMetadata: {
      contentType: 'video/mp4',
      contentDisposition: `attachment; filename="trail-replay-${job.id}.mp4"`,
    },
  });

  // Verified from R2 rather than trusting Content-Length, so the recorded size
  // is what actually landed.
  const stored = await env.EXPORTS_BUCKET.head(objectKey);
  if (!stored || stored.size !== declaredSize) {
    await env.EXPORTS_BUCKET.delete(objectKey);
    return errorResponse('upload_incomplete', 'The uploaded video could not be verified', 502);
  }

  await env.LEADS_DB
    .prepare("UPDATE export_jobs SET status = 'uploaded', object_key = ?, size_bytes = ? WHERE id = ? AND status = 'pending'")
    .bind(objectKey, stored.size, job.id)
    .run();

  return json({ jobId: job.id, sizeBytes: stored.size, status: 'uploaded' });
}

function bearerToken(request) {
  const header = request.headers.get('Authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}
