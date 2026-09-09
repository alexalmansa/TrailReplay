// GET /api/consent-defaults — tells the client how to render the consent box.
//
// The decision lives on the server because only the server sees the visitor's
// country, and because keeping it here means the pre-tick policy can be changed
// without shipping a new frontend build.

import { getCountry, json, methodNotAllowed } from '../../functions-lib/http.js';
import { CONSENT_TEXT_VERSION, allowsPreTickedMarketing } from '../../functions-lib/consent.js';

export async function onRequest({ request }) {
  if (request.method !== 'GET') return methodNotAllowed('GET');

  const country = getCountry(request);

  return json(
    {
      marketingPreTicked: allowsPreTickedMarketing(country),
      consentTextVersion: CONSENT_TEXT_VERSION,
      country,
    },
    200,
    // Varies per visitor country, and Cloudflare's cache does not key on that
    // by default — a shared cache entry would hand an EU visitor a pre-ticked
    // box, which is the exact thing this endpoint exists to prevent.
    { 'Cache-Control': 'private, no-store' },
  );
}
