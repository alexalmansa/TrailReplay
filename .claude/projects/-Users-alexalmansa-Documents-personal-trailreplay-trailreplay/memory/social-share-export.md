---
name: social-share-export
description: Social share poster export feature (v1) — map-first + photo-first templates, PNG download, in-progress on feature/social-share-export-v1
metadata:
  type: project
---

Social share export v1 landed on branch `feature/social-share-export-v1`.

New files:
- `app/src/components/sidebar/export/socialShareData.ts` — summary data builder (title, stats, elevation profile) from store state
- `app/src/components/sidebar/export/socialShareRouteFit.ts` — lat/lon → canvas fitting with mercator correction + downsample util (7 tests in `.test.ts`)
- `app/src/components/sidebar/export/socialShareRenderer.ts` — offscreen canvas renderer for both templates; also exports `getPosterSize()` and `RenderInput`
- `app/src/components/sidebar/export/useSocialShareExport.ts` — hook: loads logo/photo, projects route, calls renderer, exposes `previewUrl`, `exportPng`, `generatePreview`
- `app/src/components/sidebar/export/SocialSharePanel.tsx` — sidebar panel with template / ratio / photo chooser / title / location / toggle overlays / photo-first route transform sliders
- `app/src/components/sidebar/export/SocialSharePreviewModal.tsx` — large preview modal + Download PNG button

Updated files:
- `app/src/types/index.ts` — added `SocialShareTemplate`, `SocialShareAspectRatio`, `SocialShareRouteTransform`, `SocialShareSettings`
- `app/src/store/storeTypes.ts` — added `socialShareSettings` + `setSocialShareSettings`
- `app/src/store/defaults.ts` — added `createDefaultSocialShareSettings()`
- `app/src/store/slices/settingsSlice.ts` — wired the new state + action
- `app/src/store/createAppStore.ts` — reset includes social share settings
- `app/src/components/sidebar/ExportPanel.tsx` — added Video / Social mode switch at top

**Why:** Dedicated poster composer (separate from video exporter) per issue spec; does not touch the video export path.
**How to apply:** If extending social export (new templates, AI masking, etc.), the renderer is the entry point.
