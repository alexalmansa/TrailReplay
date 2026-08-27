// Consolidates SEO signal onto a single hostname: www.trailreplay.com and
// trailreplay.com otherwise served identical content, which split search
// impressions/clicks across duplicate URLs for the same pages.
export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  // Keep API calls on the hostname that served the app. Redirecting a POST
  // from www to the apex turns a same-origin request into a cross-origin one
  // (and a 301 may also rewrite it to GET) before the Pages Function can add
  // its response headers.
  if (url.hostname === 'www.trailreplay.com' && !url.pathname.startsWith('/api/')) {
    url.hostname = 'trailreplay.com';
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
