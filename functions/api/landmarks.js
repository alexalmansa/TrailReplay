const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const MAX_POINTS = 180;
const MAX_SPAN_DEGREES = 1.5;
const CACHE_SECONDS = 60 * 60 * 24;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 12;
const requestCounts = new Map();

function json(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': `public, max-age=${CACHE_SECONDS}`, ...headers } });
}

function normalizeElement(element) {
  const tags = element.tags || {};
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !tags.name) return null;
  const type = tags.natural === 'peak' ? 'summit'
    : tags.natural === 'saddle' || tags.mountain_pass ? 'pass'
      : tags.tourism === 'viewpoint' ? 'viewpoint'
        : tags.tourism === 'alpine_hut' ? 'hut'
          : tags.amenity === 'shelter' ? 'shelter'
            : tags.natural === 'waterfall' ? 'waterfall'
              : tags.natural === 'water' || tags.water === 'lake' ? 'lake'
                : tags.place ? 'town' : null;
  if (!type) return null;
  const importance = type === 'summit' || type === 'pass' || type === 'town' ? 4 : 3;
  return { id: `osm-${element.type}-${element.id}`, type, source: 'enriched', display: 'subtle', lat, lon, title: tags.name, subtitle: tags.ele ? `${tags.ele} m` : undefined, importance, metadata: { osmId: `${element.type}/${element.id}`, tags } };
}

function queryFor(bounds) {
  const [south, west, north, east] = bounds;
  const filters = [
    'nwr["natural"="peak"]["name"]', 'nwr["natural"="saddle"]["name"]',
    'nwr["tourism"="viewpoint"]["name"]', 'nwr["tourism"="alpine_hut"]["name"]',
    'nwr["natural"="waterfall"]["name"]', 'nwr["water"="lake"]["name"]',
    'nwr["place"~"^(city|town|village|hamlet)$"]["name"]',
  ].map((filter) => `${filter}(${south},${west},${north},${east});`).join('');
  return `[out:json][timeout:8];(${filters});out center tags;`;
}

function isRateLimited(request) {
  const ip = (request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const entry = requestCounts.get(ip);
  if (!entry || now >= entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_REQUESTS_PER_WINDOW;
}

export async function onRequestPost(context) {
  if (isRateLimited(context.request)) return json({ error: 'Nearby-place lookup limit reached. Please try again later.' }, 429);
  let body;
  try { body = await context.request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  const points = body?.points;
  if (!Array.isArray(points) || points.length < 2 || points.length > MAX_POINTS || !points.every((point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite))) return json({ error: 'Expected 2–180 valid [longitude, latitude] points' }, 400);
  const lons = points.map((point) => point[0]); const lats = points.map((point) => point[1]);
  const bounds = [Math.min(...lats) - 0.015, Math.min(...lons) - 0.02, Math.max(...lats) + 0.015, Math.max(...lons) + 0.02];
  if (bounds[2] - bounds[0] > MAX_SPAN_DEGREES || bounds[3] - bounds[1] > MAX_SPAN_DEGREES) return json({ error: 'Route corridor is too large for nearby-place lookup' }, 400);
  const key = new Request(`${new URL(context.request.url).origin}/api/landmarks-cache/${points.map((point) => point.join(',')).join(';')}`);
  const cached = await caches.default.match(key);
  if (cached) return cached;
  try {
    const response = await fetch(OVERPASS_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'User-Agent': 'TrailReplay/1.0 (+https://trailreplay.app)' }, body: new URLSearchParams({ data: queryFor(bounds) }) });
    if (!response.ok) return json({ error: 'Nearby-place service is temporarily unavailable' }, 502);
    const payload = await response.json();
    const landmarks = (payload.elements || []).map(normalizeElement).filter(Boolean).slice(0, 100);
    const result = json({ landmarks, attribution: '© OpenStreetMap contributors' });
    context.waitUntil(caches.default.put(key, result.clone()));
    return result;
  } catch (error) {
    console.error('Landmark enrichment error', error);
    return json({ error: 'Nearby-place service is temporarily unavailable' }, 502);
  }
}
