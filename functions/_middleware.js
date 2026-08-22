// Consolidates SEO signal onto a single hostname: www.trailreplay.com and
// trailreplay.com otherwise served identical content, which split search
// impressions/clicks across duplicate URLs for the same pages.
export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.hostname === 'www.trailreplay.com') {
    url.hostname = 'trailreplay.com';
    return Response.redirect(url.toString(), 301);
  }
  return next();
}
