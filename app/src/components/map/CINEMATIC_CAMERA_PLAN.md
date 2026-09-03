# Plan: a cinematic camera mode

A fourth camera mode alongside `overview`, `follow` and `follow-behind`, where the
shot is **authored** rather than derived: the user marks points on the timeline
and says "at this moment, film from here", and the camera glides between those
poses.

This is a plan, not an implementation. It assumes the reader has read
[CAMERA.md](./CAMERA.md) — every design decision below leans on something that
document records the hard way.

---

## 1. Why this mode can be dramatically smoother than follow-behind

Worth stating plainly, because it shapes the whole design:

**Every camera defect fixed in this codebase came from deriving the pose,
per frame, from a noisy input.** The route heading came from a two-point chord
that inherited the wobble of both endpoints. The zoom and pitch came from a
terrain "risk" that swung with every hill. The look-at height came from a terrain
mesh sampled directly under a marker moving tens of metres per frame. Each was
attacked with filters, and each filter left a residue that took another round to
find — culminating in a 10 Hz staircase that no amount of smoothing could have
removed, because smoothing a staircase only blurs the steps.

A keyframed camera has **none of those inputs**. Its pose comes from a spline
through values a human chose. Between keyframes it is smooth by construction, at
whatever order of continuity the spline provides.

So the headline is: *extreme stabilisation here is achieved mostly by removing
inputs, not by adding filters.* The single most valuable thing this mode can do
is refuse to consult the route heading and the terrain-risk model at all. What
remains to stabilise is only the anchor — where the camera is looking — and that
is a much easier problem than the one follow-behind has.

---

## 2. Verified constraint: what a MapLibre camera actually is

MapLibre GL JS 5 (the version in this project) exposes **no free-camera API** —
`FreeCameraOptions` is a Mapbox GL feature and is absent here. A pose is exactly:

```
center (lng/lat)   zoom   pitch   bearing
```

The camera's position in space is *derived* from those: it sits behind and above
the centre, at a distance implied by zoom and pitch, always looking at the centre.

This is not a limitation for what we want. "Drag a ball to place the camera
around the subject" **is** an orbit, and an orbit maps onto MapLibre's model
exactly:

| Orbit control the user manipulates | MapLibre pose |
|---|---|
| which side of the subject the camera sits on | `bearing` (camera faces the subject) |
| how high above the subject it sits | `pitch` (0 = straight down, 85 = near ground level) |
| how far away it sits | `zoom` |
| what it points at | `center` = the marker |

**Decision: model keyframes as an orbit around the marker.** No new render path,
no divergence from the existing `jumpTo` pipeline, and export parity is
preserved for free.

The one thing this cannot express is a camera looking at something *other* than
the subject — a pullback that drifts to frame a summit, say. If that is ever
wanted it needs a genuinely free camera, which means driving the transform
manually. Out of scope; noted in §11.

---

## 3. Data model

### 3.1 The keyframe

```ts
export interface CinematicCameraKeyframe {
  id: string;

  /** Where on the replay this pose applies. See 3.2 — this is the subtle part. */
  anchor: KeyframeAnchor;

  /**
   * Which way the camera faces, in degrees. Interpretation depends on `frame`:
   *  - 'world': an absolute compass bearing. The shot is locked to the map.
   *  - 'route': an offset from the route's heading. 180 = the classic
   *    over-the-shoulder follow-behind; 90 = a fixed side-on tracking shot.
   */
  bearingDeg: number;

  /** 0 = looking straight down, 85 = almost at ground level. */
  pitchDeg: number;

  /** MapLibre zoom. Stored rather than a distance in metres — see 3.3. */
  zoom: number;

  frame: 'world' | 'route';

  /** How the camera arrives at this keyframe. */
  easing: 'smooth' | 'linear' | 'hold';
}
```

### 3.2 Anchoring: the trap to avoid

The obvious choice — store the keyframe's time in seconds — is wrong here, and
the reason is the compression ratio that CAMERA.md opens with. Clip length is
user-adjustable (15 / 30 / 60 / 90 s). A keyframe at "second 20" means a
completely different place on the route after the clip is shortened.

Storing `progress` (0..1) fixes that, but breaks under a *different* edit: adding,
removing or reordering journey segments changes what any given progress value
points at, and every keyframe silently slides to the wrong part of the route.

**This codebase already solved exactly this problem, for photos.**
`PictureAnnotation` anchors itself with `routeSegmentId` plus
`routeSegmentDistance` (metres from the start of that segment), and derives
progress from those. Its comment explains the reasoning; it applies verbatim
here.

**Decision: reuse that pattern.**

```ts
type KeyframeAnchor = {
  /** Stable journey-segment anchor, so reordering segments moves the keyframe with its segment. */
  routeSegmentId: string;
  /** Metres from the start of that segment. */
  routeSegmentDistance: number;
};
```

Progress is derived at evaluation time, exactly as photo placement does. The UI
displays seconds; nothing stores them.

### 3.3 Why zoom and not a distance in metres

Distance in metres is the more natural thing to show a user, and the wrong thing
to store. Converting metres to a MapLibre zoom depends on viewport height, and
the export renders at a different resolution than the preview — so a stored
distance would frame the exported video differently from what the user approved.
Zoom is viewport-independent.

This is the same reasoning that made the automatic distance picker reason about a
fixed `REFERENCE_VIEWPORT_WIDTH_PX` instead of the real canvas.

**Store zoom; label the slider in metres** computed against that reference width.

### 3.4 Where it lives

- `CameraMode` gains `'cinematic'`.
- Keyframes are journey data, not settings — they reference segments and are
  meaningless without the route. A new `cinematicSlice` (or an addition to
  `journeySlice`) holding `CinematicCameraKeyframe[]`, sorted by derived progress.
- Persistence: add to `buildReplayArchive`, `hydrateProject` and
  `projectFile/types.ts` + `validation.ts`. Absent in an older project file means
  an empty list, which §7 defines a sane fallback for.

---

## 4. Pose evaluation

One pure function, in the shape of the existing `replayCameraPlan.ts`:

```ts
export function getCinematicCameraPose(options: {
  keyframes: CinematicCameraKeyframe[];   // pre-sorted, progress already derived
  coordinates: number[][];                // cameraPathCoordinates
  progress: number;
  routeHeadingDeg: number | null;         // only needed for 'route'-frame keyframes
}): ReplayCameraPose | null
```

Pure, deterministic, offline-testable — which is what makes the acceptance
criteria in §10 measurable without a browser.

### 4.1 Interpolating between keyframes

Per-track scalar interpolation, not interpolation of camera positions in 3D.
Interpolating cartesian positions would swing the camera through the ground
between two poses on opposite sides of the subject; interpolating the orbit
parameters cannot.

- **bearing** — unwrap first. Accumulate shortest-arc deltas into a continuous
  angle before interpolating, or a turn from 350° to 10° will spin the long way
  round. Do this once when the track is built, not per frame.
- **pitch, zoom** — direct interpolation. Zoom is already logarithmic, so linear
  interpolation in zoom is geometrically correct.
- **Spline: centripetal Catmull-Rom**, or cubic Hermite with clamped tangents.
  Plain Catmull-Rom overshoots, which here means pitch going negative or zoom
  punching past a limit between two legal keyframes. Clamp the result to valid
  ranges regardless.
- **easing** — `hold` freezes the previous keyframe's pose until this one is
  reached (a locked-off shot, then a move); `linear` for constant-rate moves;
  `smooth` (default) eases in and out.

### 4.2 Edge cases that must be decided, not discovered

| Case | Behaviour |
|---|---|
| No keyframes | Fall back to the follow-behind pose (§7) |
| One keyframe | Hold that pose for the whole replay — a locked orbit |
| Before the first / after the last | Hold the nearest, do not extrapolate |
| Two keyframes at the same anchor | Later one wins; UI should prevent it |

---

## 5. Stabilisation: what to reuse, and what to deliberately not

The temptation will be to route the cinematic pose through the same smoothing
chain as follow-behind. **Do not.** That chain exists to reject noise from
procedural inputs this mode does not have, and its deadbands would actively make
things worse — a deadband on an already-smooth signal produces stick-slip, which
is failure mode #1 in CAMERA.md.

### Reuse

- **`getInterpolatedRouteCoordinate`** for every path read. Anything indexed by
  `Math.round(progress * (n - 1))` reintroduces the 10 Hz staircase.
- **The terrain elevation treatment** for the look-at height: the symmetric
  spatial average over `TERRAIN_SAMPLE_INDEX_OFFSETS` plus `limitRateOfChange`,
  then `setCenterElevation`. This is the mechanism that keeps the subject framed
  on 3D terrain, and it is orthogonal to how the pose was chosen.
- **`jumpTo` with hand-computed easing**, `currentTimeMs` (simulated playback
  time) rather than wall-clock, and `frameTimeMultiplierFromDeltaMs` for anything
  rate-based. These are the export-parity invariants; breaking them breaks export
  silently.

### Do not reuse

- **`smoothBearing` / `smoothZoom` / `smoothPitch`.** Their deadbands would turn
  a smooth authored move into a stepped one.
- **`getRouteBearingAtProgress`**, for `world`-frame keyframes. The route heading
  was the noisiest input in the entire camera; a world-locked shot never consults
  it. `route`-frame keyframes do need it, and should use the existing averaged
  version — that is precisely why it was made stable.
- **`calculateTerrainAwareAdjustments`.** The user authored this framing; a
  terrain model second-guessing it would fight them, and it was the source of the
  zoom pumping and pitch drift. Replace it with the collision guard in §6, which
  intervenes only when the shot would actually be ruined.

### The one thing that still needs smoothing: the anchor

The pose is smooth, but it is anchored to the marker, and the marker's position
comes from GPS. Lateral wobble in the anchor translates the whole frame.

Use a **centroid-averaged anchor** rather than the raw interpolated position —
the same trick that fixed the bearing: average the route position over a small
symmetric window. Symmetric, so it introduces no lag on a straight run (CAMERA.md
failure mode #2). Expose the window width as the mode's single "smoothing"
control, defaulting high.

---

## 6. Terrain collision: a new problem this mode creates

Follow-behind largely avoided flying into hillsides because its pitch and
distance were constrained. An authored camera can be placed anywhere, including
inside a mountain, and on a moving subject a shot that starts clear can become
occluded.

Required, and genuinely new work:

1. Derive the camera's world position from the pose (centre, zoom, pitch,
   bearing) — trigonometry, no new API.
2. Sample terrain along the ray from camera to subject with
   `queryTerrainElevation`, at a handful of fractions.
3. If the camera is below terrain + clearance, correct it.

**The correction must be a slow continuous nudge, not a snap** — reduce pitch
(lift the camera) and/or raise zoom, applied through a rate limit, and released
just as gradually. A hard correction would read as exactly the tremble this
project just spent a long time eliminating.

Surface it in the UI: a keyframe whose shot is blocked should be flagged while
authoring, so the user fixes it rather than the runtime silently overriding them.

---

## 7. Fallback when there are no keyframes

A user switching to cinematic mode with an empty timeline must not get a broken
camera. Two candidates:

- **(a) Behave exactly like follow-behind** until the first keyframe is added.
- **(b) A slow automatic orbit** — a gentle drift of world-frame bearing across
  the replay.

**Recommendation: (a).** It makes the mode's value obvious by contrast (the user
adds a keyframe and sees the camera do something they chose), and it means
"cinematic with no keyframes" is never worse than what exists. (b) is a nice
"surprise me" button later, implemented as *generating* keyframes the user can
then edit — which is much better than a hidden behaviour.

---

## 8. Authoring UX

### 8.1 The primary workflow: capture, don't construct

The most powerful and by far the cheapest way to author a pose is to let the user
make the real map show what they want, then capture it:

1. Scrub the timeline to a moment. The marker moves there; the map shows the
   current interpolated shot.
2. Drag / rotate / tilt / zoom the map with the normal MapLibre controls.
3. Press **Set camera keyframe**.

The captured `bearing`, `pitch` and `zoom` are stored, with `bearing` converted
to a route-relative offset if the user picked `route` framing. What the user sees
at the moment of capture is exactly what the replay will show — no translation
between an abstract widget and the result.

This should be built first. It is a small amount of code and delivers the whole
feature.

### 8.2 The 3D ball, as a second step

The orbit gizmo the user described: a sphere with a draggable handle representing
the camera, the subject at the centre, and the route's heading marked on it so
"behind" and "side-on" are legible.

It is genuinely useful for *precision* — nudging to exactly 90° side-on, or
matching two keyframes' elevation — and for understanding what a keyframe holds.
But it is a fiddly custom control, and it is not the fastest way to get a good
shot. Ship it after capture works.

Implementation notes: an SVG or 2D-canvas widget is sufficient and much lighter
than pulling in a 3D library. It needs to render only a circle (the orbit ring
seen from above), an elevation arc, a heading indicator, and a draggable handle.
Bind the same three values as capture: bearing, pitch, zoom. Dragging updates the
live map immediately, so the ball and the map are two views of one state.

### 8.3 The timeline

A strip under the existing playback bar, showing keyframes as draggable markers:

- drag horizontally to re-time (re-derives `routeSegmentDistance` from the new
  progress)
- select to edit, with a small panel for `frame`, `easing`, and numeric fields
- duplicate / delete
- a visual flag on any keyframe whose shot is terrain-blocked (§6)

### 8.4 Mobile

The capture workflow works on touch (pinch, rotate, tilt are already MapLibre
gestures). The ball needs a touch-friendly variant or can be desktop-only
initially; the numeric fields cover the gap.

---

## 9. Implementation phases

Each phase ends somewhere shippable and testable.

**Phase 1 — evaluation core, no UI.**
Types, the slice, `getCinematicCameraPose`, the interpolator, anchor derivation.
Entirely pure; fully unit-testable offline against the real sample GPX. Wire it
into `useTrailPlaybackCamera` behind the new mode with keyframes injected by a
test fixture. Landing this alone proves the motion quality before any UI exists.

**Phase 2 — capture authoring.**
Mode selector entry, "Set camera keyframe", the timeline strip, store wiring,
project-file persistence. The feature is usable at the end of this phase.

**Phase 3 — export parity.**
`useVideoExportRecorder` uses the same pose function; add the pose-sequence
equality test from §10. Should be nearly free if §5's invariants held, and the
test is what proves it.

**Phase 4 — terrain collision guard.**
§6, including the authoring-time warning.

**Phase 5 — the 3D ball.**
§8.2, plus the per-keyframe editing panel.

**Phase 6 — polish.**
Auto-generated orbit ("surprise me"), keyframe presets (over-the-shoulder,
side-on tracking, crane-up reveal), intro/outro interaction.

---

## 10. Acceptance criteria, in measurable terms

CAMERA.md's central lesson is that camera quality claims must be measured, not
eyeballed. These are the numbers this mode should be held to. All but the last
are offline.

| Criterion | Target | How |
|---|---|---|
| No staircase | pose changes on **every** frame | evaluate at 3600 frames, count unchanged |
| Smoothness between keyframes | turn-rate jerk p99 below the current follow-behind figure (~0.11 °/frame²) | second difference of the rendered bearing |
| A single keyframe is *perfectly* static | bearing/pitch/zoom swing **exactly 0** over the whole replay | one-keyframe fixture |
| No overshoot | interpolated pitch and zoom stay within the min/max of the surrounding keyframes | property test over random keyframe sets |
| Subject stays framed | **0** off-screen frames | browser instrumentation, per CAMERA.md |
| Export parity | pose sequence byte-identical between live and deterministic export | evaluate both paths over the same progress series and compare |
| Anchor smoothing is unbiased | no lag on a straight constant-speed run | synthetic straight route, compare to raw anchor |

The "single keyframe is exactly 0" criterion is the sharpest one: it is only
achievable if the mode really has removed the noisy inputs, and it will fail
loudly if someone later routes the pose back through the deadband chain.

---

## 11. Risks and open decisions

**Needs a decision before Phase 1**

- **Default `frame` for new keyframes.** `world` is more cinematic and much more
  stable; `route` is more intuitive to someone arriving from follow-behind.
  Recommendation: `world`, because the mode's selling point is shots that do not
  simply trail the subject.
- **Does the distance slider (the 8-stop ladder) apply here?** It should not —
  zoom is per-keyframe. Recommendation: hide it in this mode, and seed the first
  keyframe's zoom from the current stop so switching modes is continuous.

**Known risks**

- **Keyframes surviving journey edits.** The segment anchor (§3.2) handles
  reorder and re-time. Deleting the segment a keyframe lives on must delete or
  re-home the keyframe — decide explicitly and test it, as this is where photo
  placement has historically been fiddly.
- **Terrain queries per frame.** The collision guard adds ray samples on top of
  the nine the elevation average already does. Budget it, and consider evaluating
  the guard at a lower rate than the pose while keeping the *correction* smooth.
- **Intro and outro.** The cinematic fly-in currently targets the first playback
  pose. It should target the first keyframe's pose; the outro `fitBounds` can
  stay as is. Cheap, but easy to forget.
- **Scope.** This is the largest camera change yet attempted here. Phase 1 is
  independently valuable and independently verifiable; resist merging phases.

**Explicitly out of scope**

- A truly free camera looking at something other than the subject (§2). Would
  need manual transform control and its own export story.
- Per-keyframe field-of-view / lens changes.
- Motion blur or shutter effects.
