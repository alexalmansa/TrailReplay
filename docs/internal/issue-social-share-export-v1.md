Title: Social share export v1 (map-first + photo-first posters)


Summary:
- Add a dedicated still-image social export flow to the web app in `app/`.
- Do not piggyback on the current video overlay recorder as the main composition system.
- Build a separate poster renderer that reuses the existing map capture path, route data, photo library, and export aspect-ratio logic.

Accepted product decisions:
- Default ratio is mobile Instagram portrait `4:5`.
- V1 should still allow `1:1` and `9:16` as configurable alternatives.
- Title defaults to the journey name when a journey exists; otherwise it falls back to track name.
- User can override the title manually.
- Selected photo must come from an explicit chooser over uploaded pictures.
- `Photo-first` stays north-up and only supports route scale + x/y offset in v1.
- No route rotation in v1.
- Preview should not be limited to the narrow Export sidebar.
- Provide a larger preview panel or modal before download.
- That larger preview should allow some user adjustments and resizing where the template supports it.

Templates in scope:
- `Map-first`
  - map or satellite background
  - route as the hero
  - one selected docked photo
  - summary stats
  - mini elevation chart
  - TrailReplay logo
- `Photo-first`
  - full-bleed selected photo
  - route drawn directly on top
  - summary stats
  - mini elevation chart
  - TrailReplay logo

Explicit simplifications for `Photo-first`:
- no AI person detection
- no subject cutout
- no route-behind-runner masking
- no automatic semantic composition around the subject

Why this should be separate from video export:
- Current exporter is optimized for animated recording and DOM overlay capture via `html2canvas`.
- Social share is a poster-composition problem, not a replay-overlay problem.
- A dedicated still-image renderer will produce cleaner output and be easier to theme and evolve.

Current codebase hooks we should reuse:
- Map capture and crop logic:
  - `app/src/components/sidebar/export/useVideoExportRecorder.ts`
  - `app/src/App.tsx`
  - `app/src/utils/crop.ts`
- Media and photo selection primitives:
  - `app/src/types/index.ts`
  - `app/src/hooks/usePhotos.ts`
  - `app/src/store/slices/mediaSlice.ts`
- Export UI entry point:
  - `app/src/components/sidebar/ExportPanel.tsx`

Implementation direction:
- Add separate `SocialShareSettings` in store, parallel to `videoExportSettings`.
- Add `Social` mode to the Export panel.
- Build a dedicated social-share renderer on an offscreen canvas.
- Export `PNG` first.
- Ship `Map-first` first, then `Photo-first` simplified.

Required v1 UI:
- `Video / Social` mode switch in Export
- social settings panel
- larger preview panel or modal
- template switcher
- aspect-ratio switcher
- explicit photo chooser from uploaded pictures
- title mode + custom title
- route transform controls for `Photo-first`

Suggested implementation order:
1. Foundation and state
2. Shared still-image renderer
3. `Map-first`
4. `Photo-first` simplified
5. Polish, localization, analytics, tests

Reference plan:
- `docs/internal/social-share-export-plan.md`

Reference mockups:
- `docs/proposals/final/social-share-map-first-v2.png`
- `docs/proposals/final/social-share-photo-first-v2.png`
