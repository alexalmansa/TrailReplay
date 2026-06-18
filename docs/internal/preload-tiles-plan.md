# Plan: Fix white or missing map tiles at replay start (Issue #63)

> **Scope of this document: Option A only** — gate the cinematic intro on map tile
> readiness using MapLibre's `idle` event, via a new `preloading` animation phase.
> Corridor prefetch (Option B) is intentionally out of scope here and can be layered
> on later inside the same phase.

## 1. Problem

GitHub issue #63 ("3D missing map tiles, pre-load"): after a GPX is uploaded, the
satellite/terrain tiles for the playback viewport are not loaded yet. When the user
presses play, the camera immediately flies from the flat overview (zoom ≤ 12,
pitch 0) to the follow-behind start position (zoom ~14–15, pitch ~60°). Tiles at
those zoom levels — both ESRI satellite and the AWS `terrain-dem` (terrarium)
raster-DEM — have not been fetched, so they render as **white squares** during the
2 s intro and the first moments of playback. Reference apps (Relive,
pelmers.com/gpx-replay) avoid this by **loading the scene before animating**.

The web app (`trailreplay/app`, MapLibre GL) is the surface to fix. The iOS app
embeds this same web bundle via `WebMapRuntime`, so a web fix covers both.

## 2. Root cause (code references)

- `app/src/components/playback/PlaybackProvider.tsx:73-86` — on play, immediately
  sets `animationPhase = 'intro'` and starts a 2 s timer to `'playing'`. No wait for
  tiles.
- `app/src/components/map/hooks/useTrailPlaybackCamera.ts:209-221` — the `intro`
  branch runs `easeTo`/`flyTo` to the high-zoom, high-pitch start as soon as the
  phase is `intro`.
- `app/src/components/map/mapStyle.ts:17-67` — satellite (`background`) and
  `terrain-dem` are network raster sources with no local cache priming.
- The overview fit (`useTrailLayerData.ts:163-188`) only loads tiles at `maxZoom:
  12`, flat — a different tile set than playback needs.

## 3. Approach (Option A)

Insert a **`preloading`** phase between the play press and the intro:

1. User presses play (or export calls `play()`).
2. `PlaybackProvider` sees this is a fresh cinematic start
   (`!cinematicPlayed && progress < 0.01`) and sets `animationPhase = 'preloading'`
   instead of `'intro'`.
3. A new hook (`useTilePreload`) reacts to the `preloading` phase:
   - `jumpTo` (instant, no easing) the **intro's final camera target** — the same
     center/zoom/pitch/bearing the intro `flyTo` would end at. This forces MapLibre
     to request exactly the tiles playback will start with.
   - Listen with `map.once('idle', …)`. MapLibre fires `idle` when all tiles for the
     current view are loaded and the map is fully rendered.
   - When `idle` fires (or a safety timeout elapses), `jumpTo` **back** to the
     overview position the intro starts from, then advance
     `animationPhase = 'intro'`.
4. The existing intro logic in `useTrailPlaybackCamera.ts` runs unchanged — it just
   fires a beat later, now against a warm tile cache. No white tiles.

A lightweight "Preparing replay…" overlay is shown while in `preloading`.

### Why `jumpTo` to the target, then back

`idle` only guarantees tiles for the *current* viewport. The viewport that matters
is where playback **starts** (high zoom + pitch), not the overview. So we briefly
jump the (invisible-to-user, covered by overlay) camera to the start target to prime
those exact tiles, then snap back so the intro `flyTo` animation still plays from the
overview for the cinematic effect.

> Alternative considered: skip the round-trip and just start the intro from the
> target. Rejected — it removes the cinematic zoom-in that the intro is designed to
> provide.

## 4. Changes (file by file)

### 4.1 Store: add the phase to the type union

The phase union appears in **three** places — all must be updated together:

- `app/src/store/storeTypes.ts:35` — `animationPhase` field type.
- `app/src/store/storeTypes.ts:95` — `setAnimationPhase` parameter type.
- `app/src/store/slices/playbackSlice.ts` — the slice `Pick` carries the type from
  `AppState`, so no literal there, but verify `resetPlayback` still resets to
  `'idle'` (it does, line 91).

Change each union from:
```ts
'idle' | 'intro' | 'playing' | 'outro' | 'ended'
```
to:
```ts
'idle' | 'preloading' | 'intro' | 'playing' | 'outro' | 'ended'
```

> Grep `'idle' | 'intro'` and `animationPhase ===` across `app/src` to confirm no
> other exhaustive switch needs a new case. Known consumers:
> `useVideoExportRecorder.ts:581-594` (only checks playing/intro/outro/ended — safe,
> `preloading` is a no-op there), `PlaybackControls.tsx:581-595`,
> `MapElevationProfile.tsx`. None break on an unhandled extra value; they all use
> `if`-chains, not exhaustive switches.

### 4.2 `PlaybackProvider.tsx` — route play through `preloading`

In the "handle play start" effect (lines 73-86):

- When `playback.isPlaying && !cinematicPlayed && playback.progress < 0.01`:
  set `animationPhase = 'preloading'` (was `'intro'`). **Do not** start the
  `INTRO_DURATION` timer here anymore — the transition to `'intro'` now comes from
  the preload hook.
- Keep the `else if (cinematicPlayed && animationPhase === 'idle')` branch
  (resume → straight to `'playing'`). A resume mid-track should not re-preload.
- Add a new effect: when `animationPhase === 'intro'` begins, start the existing
  `INTRO_DURATION` timer that flips to `'playing'` + `setCinematicPlayed(true)`.
  (Move the timer out of the play-start effect so it fires after preloading, not
  before.)

Net: `idle → preloading → intro → playing` for a cold start;
`idle → playing` for a warm resume.

### 4.3 New hook `app/src/components/map/hooks/useTilePreload.ts`

Responsibilities:
- Inputs: `mapRef`, `isMapLoaded`, `animationPhase`, `allCoordinates`,
  `cameraMode`, `followBehindZoomLevel`, `elevationData`, `setAnimationPhase`,
  and the bearing refs (`smoothBearingRef`, `targetBearingRef`).
- Runs only when `animationPhase === 'preloading'`.
- Computes the intro **target** camera the same way
  `useTrailPlaybackCamera.ts:292-330` computes the intro start (start point,
  look-ahead bearing, terrain-aware zoom/pitch via
  `getFollowBehindCameraTarget` + `calculateTerrainAwareAdjustments`). Reuse those
  helpers to stay consistent.
- Sequence:
  1. Capture the current overview camera (`map.getCenter/Zoom/Pitch/Bearing`) so we
     can restore it.
  2. `map.jumpTo(target)` — primes start tiles.
  3. `const done = () => { map.jumpTo(overview); setAnimationPhase('intro'); }`
  4. `map.once('idle', done)` **and** a safety
     `setTimeout(done, PRELOAD_TIMEOUT_MS)` (e.g. 6000 ms) so a slow/offline tile
     server can never wedge the UI. Guard with a `hasAdvancedRef` so whichever
     fires first wins and the other is a no-op; clear the timeout / `map.off` in
     cleanup.
- For `cameraMode === 'overview'`: there is no high-zoom flythrough, so preloading
  the start target is unnecessary. Short-circuit: advance straight to `'intro'`
  (which for overview is already handled benignly), or skip the jump round-trip.
  Keep the overlay flash minimal here.

Wire the hook into `TrailMap.tsx` alongside the other hooks (after
`useTrailPlaybackCamera`, sharing the same refs).

### 4.4 Loading overlay during `preloading`

Add a small centered overlay in `TrailMap.tsx` (mirror the existing
`!isMapLoaded` spinner block at lines 294-301), shown when
`animationPhase === 'preloading'`:
- Spinner + `t('map.preparingReplay')` (new i18n key).
- Non-blocking visually; sits above the canvas so the brief `jumpTo` round-trip
  isn't visible to the user.

Add the `map.preparingReplay` string to every locale file under
`app/src/i18n/locales/` (en, es, ca — and any others present).

## 5. Export path consideration

`useVideoExportRecorder.ts` calls `play()` at line 786 after `startFrameCapture()`.
With preloading in place, the recorder would capture the `preloading` frames (a
static start frame under the overlay) before the intro. Two options — pick one in
implementation:

- **(Preferred) Let it preload too.** Benefit: exported video also has no white
  tiles. Cost: a few static frames at the very start. Mitigate by **not rendering
  the overlay during export** (check `isExporting`) and keeping the preload jump
  round-trip — the recorded frames will just show the warm start position briefly.
- **Skip preloading during export.** If export already does its own warmup, gate the
  `preloading` branch in `PlaybackProvider` on `!isExporting`. Simpler but leaves
  exports potentially showing white tiles.

Recommend the first; verify recorded output starts clean.

## 6. Edge cases

- **Pause during preloading**: if `isPlaying` flips to false while `preloading`,
  cancel: `map.off('idle')`, clear timeout, restore overview camera, set phase back
  to `'idle'`. Handle in the hook's effect cleanup keyed on `isPlaying`.
- **GPX changed / unmount mid-preload**: hook cleanup must `off` the listener and
  clear the timeout (already covered by effect cleanup).
- **`idle` never fires** (tiles error / offline): safety timeout guarantees
  progress. Acceptable to show some white tiles in the truly-offline case — no worse
  than today.
- **Resume after first play**: `cinematicPlayed` is true → bypass preloading
  entirely (matches current resume behavior).
- **Map not loaded yet**: hook is gated on `isMapLoaded`; if play is pressed before
  load (shouldn't happen — controls appear after load), the effect waits.

## 7. Test / verification

- Manual: load a GPX in a region with high-zoom imagery, hard-refresh to clear
  cache, press play. Expect a brief "Preparing replay…" then a clean intro with no
  white tiles. Repeat with throttled network (DevTools "Slow 3G") to confirm the
  overlay holds until tiles arrive and the safety timeout still releases.
- Regression: overview camera mode still works; pause/resume still skips preload;
  outro/reset unaffected; export produces a clean opening.
- Type-check: `npm run build` / `tsc` passes with the widened union (no missing
  switch cases).
- Existing unit tests under `app/src/**/*.test.ts` unaffected (none assert on the
  phase union literally — verify with a grep before finishing).

## 8. Out of scope (future, Option B)

Inside the `preloading` phase, additionally `fetch()` the satellite + `terrain-dem`
tiles for ~15–20 sampled points along the whole route (z14/z15 + neighbors) to warm
the browser HTTP cache for the **rest** of the flythrough, not just the start. Not
included in this plan.
