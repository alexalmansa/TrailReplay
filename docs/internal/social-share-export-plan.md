# Social Share Export Implementation Plan

## Goal

Add a dedicated still-image social export flow to TrailReplay so a user can generate a polished shareable poster from an activity.

The first release should support two templates:

1. `Map-first`
   - 3D map or satellite background
   - route as the hero
   - one selected photo in a docked module
   - summary stats and a mini elevation chart

2. `Photo-first`
   - full-bleed selected photo background
   - route shape overlaid directly on the photo
   - summary stats and a mini elevation chart

The `Photo-first` template must be intentionally simplified:

- no AI subject detection
- no person cutout
- no route masking behind the runner
- no automatic semantic placement around the subject

Instead, the route overlay will be manually adjustable by the user with simple transform controls.

## Design Direction

Use the approved concept direction in:

- `docs/proposals/final/social-share-map-first-v2.png`
- `docs/proposals/final/social-share-photo-first-v2.png`

Visual rules for v1:

- dark, map-first TrailReplay look
- route accent in brand orange (`#C1652F`)
- off-white typography
- real TrailReplay logo lockup
- restrained editorial layout, not a social-app screenshot
- stats based on route summary, not transient playback chrome

## Current Codebase Fit

The active surface is the browser app in `app/`.

Relevant existing capabilities:

- Export already captures the live map canvas from `#map-capture-container` and renders into an offscreen canvas:
  - `app/src/components/sidebar/export/useVideoExportRecorder.ts`
  - `app/src/App.tsx`
- Export already understands crop and aspect-ratio previews:
  - `app/src/utils/crop.ts`
  - `app/src/components/app/CropPreviewBars.tsx`
- Photos already exist as structured media with route placement and renderable URLs:
  - `app/src/types/index.ts`
  - `app/src/hooks/usePhotos.ts`
  - `app/src/store/slices/mediaSlice.ts`
- Stats and elevation already exist as live UI overlays:
  - `app/src/components/stats/StatsOverlay.tsx`
  - `app/src/components/map/MapElevationProfile.tsx`

## Key Product Decision

Do **not** build social share export by stretching the current video overlay system.

The current exporter is optimized for:

- recording animated frames
- capturing existing DOM overlays with `html2canvas`
- replay-state overlays such as `.tr-stats-overlay` and `.tr-picture-popup`

That is the wrong abstraction for a poster composer.

Instead, implement a dedicated still-image renderer that:

1. reuses map capture from the current export pipeline
2. reuses media and route data from the store
3. draws a poster directly onto a dedicated canvas
4. exports `PNG` first

This keeps the social share output deterministic, crisp, and easier to theme.

## Scope for V1

### In scope

- Dedicated social share export mode inside the Export panel
- `4:5` as the default v1 ratio
- Configurable ratios in v1:
  - `4:5`
  - `1:1`
  - `9:16`
- `Map-first` template
- `Photo-first` simplified template
- Real TrailReplay logo in output
- User-selectable photo from uploaded pictures
- Manual route placement controls for `Photo-first`
- PNG download
- Larger preview panel before download
- Limited user-adjustable layout controls in the preview flow

### Out of scope

- AI subject segmentation
- route-behind-person compositing
- automatic layout generation from image saliency
- multi-photo collage templates
- text annotations rendered into the poster
- video export refactor
- backend rendering

## Product Requirements

### Map-first template

Required elements:

- full-bleed map background
- fitted route polyline
- title
- location
- stats row
- mini elevation chart
- one selected photo module
- logo

Behavior:

- route remains dominant
- photo module has a fixed layout zone
- map crop obeys selected social aspect ratio

### Photo-first template

Required elements:

- full-bleed selected photo background
- route overlay drawn on top of the image
- dark gradient or subtle contrast treatment for legibility
- title
- location
- stats row
- mini elevation chart
- logo

Behavior:

- route is drawn as a clean overlay, never masked behind the subject
- user can reposition and resize the route inside a safe overlay region
- photo remains full-bleed; layout does not depend on person detection

## Data Model Changes

Add a dedicated social export model instead of overloading `VideoExportSettings`.

### New types

Add to `app/src/types/index.ts`:

- `SocialShareTemplate = 'map-first' | 'photo-first'`
- `SocialShareAspectRatio = '4:5' | '1:1' | '9:16'`
- `SocialShareBackgroundMode = 'map' | 'photo'`
- `SocialShareRouteTransform`
- `SocialShareSettings`

Suggested shape:

```ts
export interface SocialShareRouteTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
  opacity: number;
}

export interface SocialShareSettings {
  template: SocialShareTemplate;
  aspectRatio: SocialShareAspectRatio;
  selectedPictureId: string | null;
  titleMode: 'journey-name' | 'track-name' | 'custom';
  customTitle: string;
  locationLabel: string;
  showLocation: boolean;
  showStats: boolean;
  showElevationMiniChart: boolean;
  stats: Array<'distance' | 'time' | 'elevGain'>;
  routeTransform: SocialShareRouteTransform;
}
```

### Store changes

Update:

- `app/src/store/storeTypes.ts`
- `app/src/store/defaults.ts`
- `app/src/store/slices/settingsSlice.ts`
- `app/src/store/createAppStore.ts`

Add:

- `socialShareSettings`
- `setSocialShareSettings`

Keep it parallel to `videoExportSettings`, not nested inside it.

## Rendering Architecture

Create a separate still-image rendering pipeline.

### New files

- `app/src/components/sidebar/export/useSocialShareExport.ts`
- `app/src/components/sidebar/export/socialShareRenderer.ts`
- `app/src/components/sidebar/export/socialShareLayout.ts`
- `app/src/components/sidebar/export/socialShareData.ts`
- `app/src/components/sidebar/export/socialShareRouteFit.ts`

### Responsibilities

#### `useSocialShareExport.ts`

- drives preview generation and export
- gathers store state
- invokes the renderer
- returns preview URL / loading / export handlers

#### `socialShareRenderer.ts`

- creates an offscreen canvas
- captures the map when needed
- draws background, route, photo, logo, text, stats, elevation
- returns a `Blob` or `dataURL`

#### `socialShareLayout.ts`

- template-specific geometry
- safe areas
- card bounds
- typography scale
- template slots for map, photo, stats, and logo

#### `socialShareData.ts`

- converts app state into social-share summary data
- chooses title
- computes route summary stats
- normalizes selected picture
- generates elevation sparkline points

#### `socialShareRouteFit.ts`

- computes route bounds inside a target overlay box
- preserves route orientation
- applies manual transform controls for `Photo-first`

## Map Capture Strategy

Reuse the map capture approach from `useVideoExportRecorder.ts`, but only the map extraction part.

Do not use `html2canvas` to capture the whole poster preview.

Implementation approach:

1. Read `mapGlobalRef.current?.getCanvas()`
2. Reuse crop math from `app/src/utils/crop.ts`
3. Draw the cropped map canvas into the poster canvas
4. For `Map-first`, this becomes the full background
5. For `Photo-first`, map capture is optional and only needed later if subtle contour or map texture is added

This keeps the output sharper and avoids DOM-capture artifacts.

## Summary Data Strategy

Do not reuse `StatsOverlay` directly for the social poster.

`StatsOverlay.tsx` is playback-progress based and tied to the live replay experience.

For social export, use route-summary data:

- total distance
- total elapsed time or moving time
- total elevation gain

Preferred source:

- active track summary in single-track mode
- computed journey summary in journey mode

Add a selector/helper that produces:

```ts
{
  title: string;
  locationLabel: string;
  distance: number;
  duration: number;
  elevationGain: number;
  elevationProfile: Array<{ x: number; y: number }>;
}
```

## UI Plan

Add a social export surface inside the current Export panel.

### New UI components

- `app/src/components/sidebar/export/SocialSharePanel.tsx`
- `app/src/components/sidebar/export/SocialSharePreview.tsx`
- `app/src/components/sidebar/export/SocialShareSettingsModal.tsx`

### Export panel changes

Update `app/src/components/sidebar/ExportPanel.tsx`:

- add a top-level mode switch:
  - `Video`
  - `Social`
- keep current video export untouched
- render `SocialSharePanel` when social mode is selected

### Social panel controls

V1 controls:

- template:
  - `Map-first`
  - `Photo-first`
- aspect ratio:
  - `4:5` default
  - `1:1`
  - `9:16`
- selected photo from uploaded pictures
- title mode:
  - journey name when a journey exists
  - track name fallback
  - custom
- location toggle / text
- stats toggle
- elevation mini-chart toggle

`Photo-first` only:

- route scale
- route horizontal offset
- route vertical offset
- route opacity

### Preview behavior

The social-share preview should not live only inside the narrow Export panel.

V1 should provide:

- an inline summary inside Export
- a larger preview panel or modal before download

That larger preview surface is where layout adjustments should happen.

The goal is to let the user tune composition without forcing them to work inside the sidebar width.

## Template Implementation Details

### Phase 1 template: Map-first

This should ship first.

Rendering order:

1. draw map background
2. apply subtle top/bottom shading for legibility
3. draw route line if not already visible enough in the map capture
4. draw title and location
5. draw photo module in a fixed docked slot
6. draw stats card
7. draw mini elevation chart
8. draw logo

Notes:

- photo should not use the current `PicturePopup` UI
- the photo module should be a purpose-built poster component
- route remains readable behind all content

### Phase 2 template: Photo-first simplified

Rendering order:

1. draw selected photo as full background
2. add dark gradient / vignette for legibility
3. compute route fit inside overlay bounds
4. draw route line with user transform controls applied
5. draw title and location
6. draw compact stats block
7. draw mini elevation chart
8. draw logo

Notes:

- no attempt to detect or avoid the subject
- route may cross over the runner
- manual controls are the acceptable simplification for v1

## File-by-File Change List

### New files

- `app/src/components/sidebar/export/SocialSharePanel.tsx`
- `app/src/components/sidebar/export/SocialSharePreview.tsx`
- `app/src/components/sidebar/export/SocialShareSettingsModal.tsx`
- `app/src/components/sidebar/export/useSocialShareExport.ts`
- `app/src/components/sidebar/export/socialShareRenderer.ts`
- `app/src/components/sidebar/export/socialShareLayout.ts`
- `app/src/components/sidebar/export/socialShareData.ts`
- `app/src/components/sidebar/export/socialShareRouteFit.ts`
- `app/src/components/sidebar/export/socialShareRenderer.test.ts`
- `app/src/components/sidebar/export/socialShareRouteFit.test.ts`

### Existing files to update

- `app/src/types/index.ts`
- `app/src/store/storeTypes.ts`
- `app/src/store/defaults.ts`
- `app/src/store/slices/settingsSlice.ts`
- `app/src/store/createAppStore.ts`
- `app/src/components/sidebar/ExportPanel.tsx`
- `app/src/components/sidebar/export/ExportSettingsModal.tsx` or adjacent export UI shell if mode-switch ownership lands there
- `app/src/utils/crop.ts`
- `app/src/components/app/CropPreviewBars.tsx`
- locale files under `app/src/i18n/locales/`

## Delivery Phases

### Phase 1: Foundation

- add social-share store types and defaults
- add social export mode switch in Export panel
- add preview shell and settings shell
- add reusable summary-data helper
- add social aspect-ratio support, including `4:5`
- set default title behavior:
  - journey name when a journey exists
  - otherwise track name
- support explicit photo choice from uploaded pictures

Exit criteria:

- user can switch to a Social tab
- user sees a placeholder preview frame with correct ratio
- store persists social-share settings during the session

### Phase 2: Rendering engine

- implement offscreen poster renderer
- reuse map capture crop logic
- implement text, stat, and chart drawing helpers
- load and render the TrailReplay logo

Exit criteria:

- renderer can return a downloadable PNG
- preview and exported image visually match closely

### Phase 3: Map-first template

- implement final layout for `Map-first`
- add selected photo dock
- add summary stats and mini elevation
- add title/location controls
- add larger preview panel for final inspection and adjustment
- add user-facing controls for photo selection and basic layout tuning

Exit criteria:

- usable `Map-first` poster export with brand-correct output

### Phase 4: Photo-first simplified template

- implement full-bleed photo background
- add route overlay fitting and transform controls
- add opacity and placement controls
- keep route orientation north-up
- support only:
  - scale
  - x offset
  - y offset
- do not support route rotation in v1

Exit criteria:

- usable `Photo-first` poster export without AI masking

### Phase 5: Polish

- localization
- analytics for template selection and export completion
- empty-state handling when no photo is available
- visual refinement for mobile preview
- sharper logo and typography tuning

## Testing Plan

### Unit tests

Add tests for:

- social aspect-ratio crop math
- route fitting into a bounded overlay box
- route transform application
- summary stat selection
- elevation sparkline point generation

### Manual verification

Verify:

1. `Map-first` export works with one track and with a journey
2. `Photo-first` export works with a selected photo and no masking
3. `4:5` output exports at the expected dimensions
4. output remains legible on narrow screens
5. exported PNG matches preview composition closely
6. no dependency on active playback state for summary values

### Regression checks

Ensure:

- video export behavior is unchanged
- current stats overlay remains unchanged
- picture popup behavior remains unchanged
- photo import and placement flows remain unchanged

## Risks

1. Shared state confusion between video export and social export.
   - Mitigation: keep separate settings models and UI modes.

2. Preview/export mismatch.
   - Mitigation: use one rendering pipeline for both whenever possible.

3. Route overlay looking bad on some photos.
   - Mitigation: expose manual transform controls in `Photo-first`.

4. Summary data drift between track mode and journey mode.
   - Mitigation: centralize social-share summary data in a single helper.

5. Logo rendering inconsistencies from SVG/image loading.
   - Mitigation: preload one canonical logo asset and test export output directly.

## Product Decisions Locked In

These decisions are resolved and should be treated as v1 requirements:

1. Default ratio is mobile Instagram portrait `4:5`, but v1 should also allow `1:1` and `9:16`.
2. Title should default to the journey name when a journey exists, and fall back to track name otherwise.
3. The user must be able to override the title manually.
4. The selected photo should come from an explicit chooser over uploaded pictures, not from the currently opened picture as an implicit default.
5. `Photo-first` should support only route scale and x/y offset in v1.
6. The route should remain north-up in `Photo-first`; no route rotation in v1.
7. The preview should also be available as a larger panel or modal before download.
8. That larger preview surface should expose resize/adjustment controls for user-tunable layout elements where applicable.

## Recommended Implementation Order

Implement in this order:

1. foundation and state
2. shared renderer
3. `Map-first`
4. `Photo-first` simplified
5. polish and tests

This sequence delivers the strongest, lowest-risk version first while keeping the more visually ambitious `Photo-first` template practical without introducing AI processing.
