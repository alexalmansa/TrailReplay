# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All root scripts delegate to `app/`:

```bash
npm run dev          # start dev server (Vite)
npm run build        # typecheck + build + asset size check
npm run lint         # ESLint
npm run test         # vitest watch mode
npm --prefix app run test:run   # run tests once (CI mode)
```

To run a single test file:
```bash
cd app && npx vitest run src/utils/units.test.ts
```

The build also runs `scripts/check-pages-asset-sizes.mjs` against `app/dist/` to enforce Cloudflare Pages asset size limits.

## Architecture

### Project layout

- `app/` — the entire frontend (React 19 + TypeScript + Vite). All active development happens here.
- `functions/api/contact.js` — single Cloudflare Pages Function for feedback submissions.
- `wrangler.toml` — Cloudflare Pages config.

### State management (`app/src/store/`)

Global state is a single Zustand store with Immer middleware, composed from slice creators in `store/slices/`:

| Slice | Responsibility |
|---|---|
| `tracksSlice` | `GPXTrack[]`, active track, comparison tracks |
| `playbackSlice` | playback state (`isPlaying`, `progress`, `currentTime`, `speed`, timing mode) |
| `journeySlice` | `Journey` with ordered `JourneySegment[]` (track or transport segments) |
| `mediaSlice` | `PictureAnnotation[]`, pending placements, text annotations, icon changes |
| `settingsSlice` | `AppSettings` (map style, units, camera, trail style, video export, social share) |
| `uiSlice` | sidebar open, active panel, loading/error state, explore mode |

All slices share a single `AppState` type from `store/storeTypes.ts`. Each slice creator is typed as `AppSliceCreator<T>` (defined in `store/slices/types.ts`).

### Data model

The core data flow: GPX/KML files → `GPXTrack[]` → `Journey` (ordered segments) → `ComputedJourney` (flattened coordinates with timing).

Key types in `app/src/types/index.ts`:
- `GPXPoint` — lat/lon/elevation/time/HR/cadence/power/speed/distance
- `GPXTrack` — parsed track with aggregate stats and bounds
- `JourneySegment` — either a `TrackSegment` (references a `GPXTrack` by id) or a `TransportSegment` (interpolated connector)
- `ComputedJourney` — flattened `JourneyPoint[]` with segment timings, computed by `useComputedJourney` hook via `journeyUtils.buildComputedJourney()`

### Map rendering (`app/src/components/map/`)

`TrailMap.tsx` is the main map component, built on MapLibre GL. It delegates logic to focused hooks in `map/hooks/`:
- `useMapInitialization` — creates the MapLibre map instance
- `useTrailLayerData` — manages GeoJSON sources and trail/marker layers
- `useTrailPlaybackCamera` — drives camera position during playback (overview / follow / follow-behind modes)
- `usePictureMarkers` — photo pin markers
- `useTextAnnotationsLayer` — text annotation overlays
- `useComparisonTrackLayers` — renders comparison track lines
- `useManualPicturePlacement` — handles click-to-place photo flow
- `useTilePreload` — prefetches map tiles ahead of playback

The map ref is exposed via `app/src/utils/mapRef.ts` for access outside the component tree (used during video export).

**Before changing how the replay camera moves, read `app/src/components/map/CAMERA.md`.** It covers the camera's invariants (the marker must stay framed, live preview and export must stay identical, behaviour must not depend on route length), how to measure the camera per frame instead of eyeballing it, and the traps that make browser measurements silently wrong.

### Playback engine (`app/src/components/playback/`)

`PlaybackProvider` drives the animation loop using `requestAnimationFrame`. It reads the current `playback` state from the store and calls `setPlayback` each frame. The stats overlay (`StatsOverlay`) computes live stats from the `useComputedJourney` hook at the current progress position.

### Video export

Video export is orchestrated from the Export panel in the sidebar (`components/sidebar/ExportPanel.tsx`). It captures the MapLibre canvas frame-by-frame and muxes video using `mp4-muxer` (MP4) or the MediaRecorder API (WebM). Social share image export uses `html2canvas` on a dedicated offscreen poster element in `components/sidebar/export/`.

### GPX/KML parsing (`app/src/utils/gpx/`)

Parsing is split across dedicated modules:
- `parseGpxDocument.ts` — GPX XML → raw points
- `parseKmlDocument.ts` — KML XML → raw points
- `trackStats.ts` — builds a `GPXTrack` with computed stats from raw points
- `interpolateTrackPoint.ts` — interpolates a track point at arbitrary progress

Entry point: `app/src/utils/gpxParser.ts` (`parseGPX`, `parseKML`, `parseGPXFiles`). The `useGPX` hook wraps this for file input handling.

### Recipes (`app/src/utils/recipe/`) — the agent path

A **recipe** is a small JSON file describing a replay in the terms a source
uses ("the aid station at km 6.5", "the places we slept"), dropped on the page
*together with* the GPX files it names. `useGPX.parseFiles` routes any `.json`
in a drop to `resolveRecipe`, which turns intent into positions using
`track.points[].distance` — the distances the GPX parser already accumulated.

Resolution lives here rather than in a build script on purpose: there are two
`calculateDistance` functions in this repo with different units (metres in
`gpx/trackStats.ts`, kilometres in `journeyUtils.ts`), and anything reimplementing
the maths outside the app will eventually disagree with it.

- `resolveRecipe.ts` — recipe + parsed tracks → landmarks, annotations, journey
- `anchorOnRoute.ts` — km / lat-lon / progress → position, and the leg layout
  that shares screen time by distance
- `overnightStops.ts` — derives where consecutive legs meet
- `matchTrackFiles.ts` — pairs specs with dropped files; globs and ordering
- `applyRecipe.ts` — puts the result in the store, replacing what was there

Every resolution is reported back through `state.recipeReport` and rendered by
`RecipeReportCard`, including warnings for what would otherwise only show up in
the finished video (pins inside the map's 80 m collapse radius, cards that
overlap on screen, days that do not join up). **New checks belong there** —
an agent cannot see the render, so the report is its only feedback.

### Project files (`.replay`) and agent authoring

`app/src/utils/projectFile/` reads and writes `.replay` archives (a zip of
`project.json` + `routes/*.gpx`, plus a `manifest.json` the app writes but does
not require). Only `formatVersion` and `tracks` are required to open one —
`hydrateProject` backfills everything else from `store/defaults.ts`, so a
project can be authored by hand or by a script rather than only by the app.

The agent-facing surface all lives in `app/public/`, so it is served from the
site on the same origin rather than only existing in the repo:

- `replay-file.md` — the format spec, at `https://trailreplay.com/replay-file.md`
- `llms.txt` — the agent entry point for the site
- `make-replay.mjs` — builds a `.replay` from a JSON recipe that anchors
  landmarks and annotations by kilometre; Node built-ins only, so an agent can
  `curl` and run it with no install
- `example-recipe.json` — a worked recipe for a real race

`docCoverage.test.ts` fails when a `ReplayProjectFile` field is missing from
`replay-file.md`, so the spec cannot drift from the type.

**Keep new `ReplayProjectFile` fields optional**, and update
`app/public/replay-file.md` when the format gains something an author would set.

### i18n

Translations live in `app/src/i18n/locales/` (en, es, ca, fr). Access via the `useI18n()` hook, which returns a `t()` function. Language is stored in `AppSettings.language`.

### Routing and aliases

There is no client-side router. The app is a single-page app at `/`. Help pages (`tutorial.html`, `gpx-download-guide.html`) are separate Vite entry points. The `@/` alias maps to `app/src/`.

### Testing

Tests use Vitest + jsdom + Testing Library. Test files live alongside the source files they test (e.g., `units.test.ts` next to `units.ts`). Setup is in `app/src/test/setup.ts`. Most tested utilities are pure functions in `app/src/utils/`.
