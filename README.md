# TrailReplay

TrailReplay turns raw GPX files into polished, shareable trail stories. The entire pipeline—track ingestion, 3D map playback, journey authoring, and video export—runs in the browser, so nothing leaves the user’s machine unless they explicitly share it. A production build of this repo powers [trailreplay.com](https://trailreplay.com).

📹 **Demo Videos**

<video controls src="media/video/trailreplay-segment-builder.mp4" title="TrailReplay Capture - Segment Builder" style="max-width: 100%;"></video>

<video controls src="media/video/trailreplay-export-flow.mp4" title="TrailReplay Capture - Export Flow" style="max-width: 100%;"></video>

If inline playback does not appear on GitHub, use the download links instead: [segment builder](media/video/trailreplay-segment-builder.mp4), [export flow](media/video/trailreplay-export-flow.mp4).

## Highlights
- **In-browser GPX studio**: Drag-and-drop one or many GPX files, paste links from Strava or Wikiloc to open their download pages, and attach local images that become picture-in-picture annotations.
- **Journey builder**: Merge activities into a single route, reorder segments, add transportation hops with realistic timing, or sketch connector routes directly on the map. OSRM routing is used by default; bring your own OpenRouteService/Mapbox key for premium routing.
- **Immersive 3D maps**: MapLibre GL powers satellite, topo, and street styles with optional 3D terrain (Mapzen Terrarium and OpenTopography). A follow-behind camera, auto zoom, and layout-aware UI keep the action framed.
- **Storytelling timeline**: Manage annotations, icon swaps, and photo overlays from one timeline. Events appear in the playback, on the progress bar, and in exports without blocking the animation.
- **Playback & comparison tools**: Scrub with mouse or touch, review kilometre splits, toggle live speed vs pace metrics, and load a second GPX file for side-by-side comparison with independent colouring.
- **Video export built in**: Auto recording supports WebM and browser-powered MP4 via `MediaRecorder`. Manual mode highlights the capture window for external tools, and aspect ratio presets keep overlays pixel perfect.
- **Localization & feedback**: English and Spanish translations ship by default. A lightweight feedback widget, analytics hooks, and cookie consent manager are wired in but easy to disable.

## Quick Start
TrailReplay is a Vite project—standard Node tooling applies.

```
npm install
npm run dev
```

- Development server: <http://localhost:5173> (Vite auto-opens the landing page; `app.html` is the main editor).
- Build for production: `npm run build` (outputs to `dist/` and copies `strava-callback.html`).
- Preview a production build: `npm run preview`.

### Prerequisites
- Node.js 18+.
- Modern Chromium, Firefox, or Safari for 3D map rendering and video recording features.

## Using the App Locally
- **Sample data**: Open `tutorial.html` for a guided walkthrough and download the GPX samples under `public/media/samples/`.
- **Upload workflow**: Drag-and-drop files onto the upload card or click to browse. Paste Strava/Wikiloc URLs with “Import from Strava/Wikiloc” to open the correct download pages in a new tab.
- **Journey authoring**: The journey builder (right-hand panel) lets you reorder tracks, insert transportation segments, draw connectors, and control segment duration. Timings sync automatically with the map animation, stats, and elevation chart.
- **Annotations & icons**: Use the add-annotation and add-icon-change buttons or click directly on the progress bar/map when in selection mode. Picture annotations use the images you uploaded earlier and fade in/out without pausing playback.
- **Stats & comparison**: Toggle kilometre splits, choose speed or pace units, and enable comparison mode to overlay a second GPX file with its own colour and name.
- **Video export**: Pick WebM, MP4, or manual recording. Auto modes hide non-essential UI, enforce aspect ratios, and use `MediaRecorder` with tuned bitrate defaults. Manual mode gives on-screen guidance for OS-level capture utilities.

## Repository Layout
- `src/core/TrailReplayApp.js` – composition root that wires controllers, global state, and translations.
- `src/controllers/` – feature controllers (file ingest, journey, map, playback, stats, timeline, export, video export, annotations, icons, progress, URL helper).
- `src/map/` – MapLibre renderer, camera helpers, annotation/icon rendering, picture overlays, and terrain controls.
- `src/journey/` – journey builder engine, segment UI, timing logic, and optional routing/drawing utilities.
- `src/utils/` – analytics wrapper, MP4 helpers, constants, and shared utilities.
- `public/` – static assets plus sample GPX files (`public/media/samples/`).
- `docs/` & standalone `.html` files – marketing pages, tutorials, privacy policy, terms, etc., served as-is in production.

## Configuration Notes
- **Analytics**: Edit `src/config/analytics.js` to change the GA4 ID, disable tracking, or require consent. The default build enables GA for non-localhost domains.
- **Routing APIs**: `src/routingService.js` falls back to the public OSRM instance. To use OpenRouteService or Mapbox, set `routingService.openRouteServiceApiKey` or `.mapboxApiKey` at runtime before calculating routes.
- **Terrain & map styles**: 3D terrain is enabled automatically when the browser supports it. Users can switch between Mapzen Terrarium and OpenTopography SRTM datasets; styles and labels live in `src/map/MapRenderer.js`.
- **Branding & assets**: Logos, favicons, and hero imagery live under `media/`. Update `media/images/simplelogo.png` and related assets to rebrand.
- **Localization**: Translations reside in `src/translations.js`. Add a new language by extending the `translations` object and providing the appropriate `data-i18n` strings in the markup.
- **Feedback**: `src/ui/feedback.js` and `src/ui/feedbackSolicitation.js` handle the optional feedback drawer and solicitation prompts.

## Development Tips
- Inspect console logs—the controllers emit verbose traces (especially journey and export flows) to aid debugging.
- The app stores runtime state on `window.app`; use DevTools to trigger helpers like `window.setTrackColors()` or `window.forceSyntheticTimeData()`.
- Because everything is client-side, any network failures you see in dev usually come from tile servers or rate-limited routing APIs; exports and playback continue to work offline once the map tiles are cached.

## Privacy & Data
- GPX parsing, journey editing, rendering, and video export happen locally. Files and generated videos are never uploaded to a backend.
- Analytics can be turned off entirely or restricted to production domains via `ANALYTICS_CONFIG`.
- When users open Strava/Wikiloc links, the app simply opens the provider’s download page in a new tab—no credentials or API tokens are handled.

## Contributing
Issues and pull requests are welcome. Helpful contributions include bug fixes, new journey-building tools, camera presets, translations, or documentation enhancements. Please explain any new dependencies and add usage notes when you change user-facing behaviour.

## License
This project is released under the MIT License. See [LICENSE](LICENSE) for details.

## Support the Project
If TrailReplay is useful to you, consider supporting development on Ko-fi: <https://ko-fi.com/alexalmansa>
