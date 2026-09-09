#!/usr/bin/env node
/**
 * Play a replay in a headless browser and measure it.
 *
 * An agent that authors a replay cannot watch it, so it has no way of knowing
 * whether the camera lurched, the marker left the frame, or the map sat on a
 * grey tile for half the video. None of that is visible to a unit test either:
 * it lives in the rendered map, between the smoothing chain, MapLibre and the
 * terrain queries.
 *
 * This drives a real replay and samples it per animation frame, reporting the
 * metrics in app/src/components/map/CAMERA.md — the ones that were found to
 * correlate with "feels bad", rather than averages, which hide everything.
 *
 * Usage:
 *   node scripts/probe-replay.mjs <dir-with-recipe-and-gpx> [options]
 *
 *   --url <url>        page to drive        (default http://localhost:5173)
 *   --seconds <n>      how long to sample   (default: the replay's own length)
 *   --json <path>      write the full sample set and metrics
 *   --headed           watch it run
 *
 * Needs Playwright: `npm i -D playwright && npx playwright install chromium`.
 */

import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { summarize } from './replay-metrics.mjs';

// ---------------------------------------------------------------------------
// Driving the page
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { url: 'http://localhost:5173', headed: false };
  const rest = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--headed') args.headed = true;
    else if (arg === '--url') args.url = argv[++index];
    else if (arg === '--seconds') args.seconds = Number(argv[++index]);
    else if (arg === '--json') args.json = argv[++index];
    else rest.push(arg);
  }
  args.dir = rest[0];
  return args;
}

/** A recipe and the routes it names, from a directory. */
function collectFiles(dir) {
  const entries = readdirSync(dir).filter((name) => statSync(join(dir, name)).isFile());
  const recipes = entries.filter((name) => name.toLowerCase().endsWith('.json'));
  const routes = entries.filter((name) => /\.(gpx|kml)$/i.test(name));

  if (recipes.length !== 1) {
    throw new Error(`${dir}: expected exactly one .json recipe, found ${recipes.length}`);
  }
  if (routes.length === 0) throw new Error(`${dir}: no .gpx or .kml files`);

  return [...recipes, ...routes].map((name) => join(dir, name));
}

async function launch(headed) {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error(
      'Playwright is not installed. Run:\n'
      + '  npm i -D playwright && npx playwright install chromium',
    );
  }

  return chromium.launch({
    headless: !headed,
    args: [
      // MapLibre needs WebGL, and a headless machine has no GPU. SwiftShader
      // renders it in software: slower, but it is the same pixels.
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--disable-dev-shm-usage',
    ],
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.dir) {
    console.error('Usage: node scripts/probe-replay.mjs <dir-with-recipe-and-gpx> [--url ...]');
    process.exit(1);
  }

  const files = collectFiles(resolve(args.dir));
  const browser = await launch(args.headed);
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  // An uncaught exception is a defect. A failed tile is the network, and on a
  // map that fetches hundreds of them it would drown everything else.
  const exceptions = [];
  const resourceErrors = new Map();
  page.on('pageerror', (error) => exceptions.push(String(error)));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    const host = /https?:\/\/([^/]+)/.exec(text)?.[1];
    const key = host ? `${host} — ${text.slice(0, 60)}` : text.slice(0, 120);
    resourceErrors.set(key, (resourceErrors.get(key) ?? 0) + 1);
  });

  try {
    const url = new URL(args.url);
    url.searchParams.set('probe', '1');
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });

    await page.waitForFunction(() => window.__trailreplay !== undefined, null, { timeout: 30_000 });

    console.log(`dropping ${files.length} files: ${files.map((f) => f.split('/').pop()).join(', ')}`);
    await page.locator('input[type="file"]').first().setInputFiles(files);

    await page.waitForFunction(
      () => window.__trailreplay.getReport() !== null,
      null,
      { timeout: 60_000 },
    );

    const report = await page.evaluate(() => window.__trailreplay.getReport());
    console.log(
      `recipe: ${report.trackCount} route(s), ${(report.totalDistanceMeters / 1000).toFixed(1)} km,`
      + ` ${report.landmarks.length} pins, ${report.annotations.length} cards,`
      + ` ${report.warnings.length} warning(s)`,
    );

    // Capturing before the basemap settles produces a "defect" that is really a
    // grey tile, and an agent will chase it. Wait for the map to go quiet.
    await page.waitForFunction(() => {
      const map = window.__trailreplay.getMap();
      return map !== null && map.loaded() && map.areTilesLoaded();
    }, null, { timeout: 120_000 }).catch(() => {
      console.warn('warning: tiles never fully settled; metrics may include unloaded map');
    });

    const totalMs = await page.evaluate(() => {
      const state = window.__trailreplay.getState();
      return state.journeySegments.reduce((sum, segment) => sum + (segment.duration || 0), 0) || 60_000;
    });
    const sampleMs = args.seconds ? args.seconds * 1000 : totalMs;

    console.log(`sampling ${(sampleMs / 1000).toFixed(1)}s of replay...`);

    const samples = await page.evaluate(async (durationMs) => {
      const bridge = window.__trailreplay;
      const collected = [];
      bridge.seekToProgress(0);
      bridge.play();

      await new Promise((done) => {
        const startedAt = performance.now();
        const tick = () => {
          const map = bridge.getMap();
          const state = bridge.getState();
          if (map) {
            collected.push({
              t: performance.now() - startedAt,
              progress: state.playback.progress,
              bearing: map.getBearing(),
              pitch: map.getPitch(),
              zoom: map.getZoom(),
              tilesLoaded: map.areTilesLoaded(),
              marker: bridge.getMarkerScreenPosition(),
            });
          }
          if (performance.now() - startedAt >= durationMs) {
            bridge.pause();
            done();
            return;
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });

      return collected;
    }, sampleMs);

    const metrics = summarize(samples);
    printReport(metrics, report, exceptions, resourceErrors);

    if (args.json) {
      writeFileSync(args.json, JSON.stringify({
        metrics, report, samples, exceptions, resourceErrors: [...resourceErrors],
      }, null, 2));
      console.log(`\nfull samples written to ${args.json}`);
    }

    process.exitCode = metrics.marker.framesOffCanvas > 0 || exceptions.length > 0 ? 1 : 0;
  } finally {
    await browser.close();
  }
}

function printReport(metrics, recipeReport, exceptions, resourceErrors) {
  const pct = (value) => `${value.toFixed(1)}%`;

  console.log(
    `\nframes ${metrics.frames} at ${metrics.fps.toFixed(1)} fps`
    + `   tiles loaded ${pct(metrics.tilesLoadedPercent)} of frames`,
  );

  const m = metrics.marker;
  console.log(
    `\nmarker    x ${m.x.min.toFixed(2)}..${m.x.max.toFixed(2)}`
    + `   y ${m.y.min.toFixed(2)}..${m.y.max.toFixed(2)}`
    + `   jitter ${m.jitterRms.x.toFixed(4)}/${m.jitterRms.y.toFixed(4)}`,
  );
  console.log(
    m.framesOffCanvas > 0
      ? `  x marker left the canvas on ${m.framesOffCanvas} frame(s)`
      : '  ok marker stayed in frame',
  );
  if (m.framesMissing > 0) {
    console.log(`  ! no marker on ${m.framesMissing} frame(s) (usually before playback starts)`);
  }

  console.log('');
  for (const name of ['bearing', 'pitch', 'zoom']) {
    const c = metrics[name];
    console.log(
      `${name.padEnd(9)} reversals ${c.reversalsPerMinute.toFixed(0).padStart(4)}/min`
      + `   still ${pct(c.frozen.percent).padStart(6)} (longest run ${c.frozen.longestRun})`
      + `   per second p50 ${c.changePerSecond.p50.toFixed(2)} p99 ${c.changePerSecond.p99.toFixed(2)}`,
    );
  }

  if (!metrics.channelMetricsRepresentative) {
    console.log(
      `\n  ! ${metrics.fps.toFixed(1)} fps is too low for the three lines above to describe`
      + '\n    what a viewer sees: the camera smoothing integrates per frame, so software'
      + '\n    WebGL changes the thing being measured. Marker framing, tile coverage,'
      + '\n    recipe warnings and page errors are unaffected.',
    );
  }

  if (recipeReport.warnings.length > 0) {
    console.log('\nrecipe warnings:');
    recipeReport.warnings.forEach((warning) => console.log(`  ! ${warning}`));
  }

  if (exceptions.length > 0) {
    console.log('\nuncaught page exceptions:');
    [...new Set(exceptions)].slice(0, 5).forEach((error) => console.log(`  x ${error}`));
  }

  if (resourceErrors.size > 0) {
    console.log('\nfailed requests (grouped):');
    [...resourceErrors.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .forEach(([key, count]) => console.log(`  ! ${String(count).padStart(4)}x ${key}`));
  }
}

// Importable for tests; only runs the browser when invoked directly.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
