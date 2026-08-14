#!/usr/bin/env node
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...values] = arg.replace(/^--/, '').split('=');
  return [key, values.join('=') || true];
}));
const input = args.input && resolve(String(args.input));
const output = resolve(String(args.output || 'tmp/landmark-sql'));
const batchSize = Number(args['batch-size'] || 500);
if (!input || !existsSync(input) || !Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000) {
  console.error('Usage: node scripts/prepare-osm-landmarks.mjs --input=landmarks.geojsonseq [--output=tmp/landmark-sql] [--batch-size=500]');
  process.exit(1);
}

function kindFor(tags) {
  if (tags.natural === 'peak') return 'summit';
  if (tags.natural === 'saddle') return 'pass';
  if (tags.tourism === 'viewpoint') return 'viewpoint';
  if (tags.tourism === 'alpine_hut') return 'hut';
  if (tags.waterway === 'waterfall') return 'waterfall';
  if (tags.water === 'lake') return 'lake';
  if (['city', 'town', 'village', 'hamlet'].includes(tags.place)) return 'town';
  return null;
}

function flattenCoordinates(coordinates, output = []) {
  if (!Array.isArray(coordinates)) return output;
  if (typeof coordinates[0] === 'number') { output.push(coordinates); return output; }
  for (const entry of coordinates) flattenCoordinates(entry, output);
  return output;
}

function centerOf(geometry) {
  const coordinates = flattenCoordinates(geometry?.coordinates).filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat));
  if (!coordinates.length) return null;
  // A mean vertex is intentionally enough here: the client performs the exact
  // route-distance filtering. We need a stable representative coordinate, not
  // a rendered geometry, which keeps the global database small.
  const [lon, lat] = coordinates.reduce(([sumLon, sumLat], [entryLon, entryLat]) => [sumLon + entryLon, sumLat + entryLat], [0, 0]);
  return [lon / coordinates.length, lat / coordinates.length];
}

function osmIdentity(feature, tags) {
  const value = String(feature.id || tags.id || tags['@id'] || '');
  const match = value.match(/^([nwr])\/?(\d+)$/i) || value.match(/^(node|way|relation)\/?(\d+)$/i);
  if (!match) return null;
  const type = { n: 'node', w: 'way', r: 'relation' }[match[1].toLowerCase()] || match[1].toLowerCase();
  return { type, id: Number(match[2]) };
}

function sqlValue(value) {
  if (value === null || value === undefined || value === '') return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  return `'${String(value).replaceAll("'", "''")}'`;
}

await mkdir(output, { recursive: true });
let batch = [];
let fileIndex = 0;
let accepted = 0;
let skipped = 0;
const files = [];
async function flush() {
  if (!batch.length) return;
  const filename = `landmarks-${String(fileIndex++).padStart(5, '0')}.sql`;
  const statements = ['BEGIN TRANSACTION;', ...batch, 'COMMIT;'];
  await writeFile(resolve(output, filename), `${statements.join('\n')}\n`);
  files.push(filename);
  batch = [];
}

const inputLines = createInterface({ input: createReadStream(input), crlfDelay: Infinity });
for await (const rawLine of inputLines) {
  const line = rawLine.replace(/^\u001e/, '').trim();
  if (!line) continue;
  let feature;
  try { feature = JSON.parse(line); } catch { skipped += 1; continue; }
  const tags = feature.properties || {};
  const kind = kindFor(tags);
  const identity = osmIdentity(feature, tags);
  const center = centerOf(feature.geometry);
  const name = typeof tags.name === 'string' ? tags.name.trim() : '';
  if (!kind || !identity || !center || !name) { skipped += 1; continue; }
  const [lon, lat] = center;
  const elevation = Number.parseFloat(tags.ele);
  const tileKey = `${Math.floor(lat / 0.25)}:${Math.floor(lon / 0.25)}`;
  batch.push(`INSERT INTO landmarks (osm_type, osm_id, kind, name, lat, lon, elevation, tile_key, updated_at) VALUES (${[identity.type, identity.id, kind, name, lat, lon, Number.isFinite(elevation) ? elevation : null, tileKey, new Date().toISOString()].map(sqlValue).join(', ')}) ON CONFLICT(osm_type, osm_id) DO UPDATE SET kind=excluded.kind, name=excluded.name, lat=excluded.lat, lon=excluded.lon, elevation=excluded.elevation, tile_key=excluded.tile_key, updated_at=excluded.updated_at;`);
  accepted += 1;
  if (batch.length >= batchSize) await flush();
}
await flush();
await writeFile(resolve(output, 'manifest.json'), JSON.stringify({ source: input, generatedAt: new Date().toISOString(), records: accepted, skipped, files }, null, 2));
await writeFile(resolve(output, 'complete.sql'), [
  'BEGIN TRANSACTION;',
  "INSERT INTO landmark_dataset (dataset_key, value) VALUES ('world-import-complete', 'true') ON CONFLICT(dataset_key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP;",
  "INSERT INTO landmark_dataset (dataset_key, value) VALUES ('world-import-records', '" + accepted + "') ON CONFLICT(dataset_key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP;",
  'COMMIT;',
  '',
].join('\n'));
console.log(`Prepared ${accepted.toLocaleString()} landmarks in ${files.length} D1 SQL files (${skipped.toLocaleString()} skipped).`);
