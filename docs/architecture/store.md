# Store Architecture

TrailReplay uses a Zustand store composed from focused slices in `app/src/store/slices`.

## Current slice boundaries

- `tracksSlice`: imported GPX/KML tracks and comparison tracks
- `journeySlice`: journey timeline, transport segments, and segment ordering
- `mediaSlice`: pictures, videos, icon changes, and pending manual placements
- `playbackSlice`: animation state, progress, speed, and timeline phase
- `exportSlice`: export settings and export runtime status
- `settingsSlice`: user display preferences, map style, terrain, language, and camera defaults
- `uiSlice`: sidebar, loading, current panel, selected picture, and general UI flags

## State ownership rules

- Export runtime state (`isExporting`, `exportProgress`, `exportStage`) lives with export settings.
- Map/camera display preferences live in `settingsSlice`, not in playback.
- Journey and media slices should avoid owning transient UI flags unless the flag directly affects domain behavior.

## Public store API

The public entry point is `app/src/store/useAppStore.ts`.

Guidelines:

- Add new domain state to the narrowest slice possible.
- Reuse default factory helpers from `app/src/store/defaults.ts` to avoid shared object references.
- Prefer slice-level tests in `createAppStore.test.ts` and focused integration tests for cross-slice behavior.

## Cross-slice invariants

- Importing the first track creates a default journey and activates the journey panel.
- Starting an export locks the active panel to `export`.
- Reset restores new default objects for playback, settings, camera, and export settings.
