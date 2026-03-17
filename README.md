# TrailReplay

TrailReplay turns raw GPX files into polished, shareable route stories. You can import one or more activities, replay them on a 3D map, add photos and annotations, compare tracks, and export the result as a video, all directly in the browser.

The active product lives in [`app/`](./app), built with React and TypeScript, and powers [trailreplay.com](https://trailreplay.com).

## Demo Videos

<video controls src="https://raw.githubusercontent.com/alexalmansa/TrailReplay/v2-architecture-cleanup/app/public/media/video/path-export-with-stats.mp4" title="TrailReplay Path Export With Stats" style="max-width: 100%;"></video>

<video controls src="https://raw.githubusercontent.com/alexalmansa/TrailReplay/v2-architecture-cleanup/app/public/media/video/comparison-mode-demo.mp4" title="TrailReplay Comparison Mode Demo" style="max-width: 100%;"></video>

If inline playback does not appear in your viewer, use the direct files instead:
- [Path export with stats video](./app/public/media/video/path-export-with-stats.mp4)
- [Comparison mode video](./app/public/media/video/comparison-mode-demo.mp4)
- [Live tutorial demos](https://trailreplay.com/tutorial.html#demo-videos)

## What TrailReplay Does

- Import one or many GPX files and replay them on an interactive map.
- Build a full journey by combining tracks, reordering them, and adding transport segments.
- Display live stats, elevation, pace, and route progress during playback.
- Attach photos to the route, either from GPS metadata or by manual placement on the map.
- Compare activities side by side with different colors and timing offsets.
- Export polished videos with map motion, stats overlays, elevation profile, and media popups.
- Keep the core workflow local in the browser so GPX files and exported media are not uploaded by default.

## Live Links

- App: [trailreplay.com](https://trailreplay.com)
- Tutorial: [trailreplay.com/tutorial.html](https://trailreplay.com/tutorial.html)
- GPX download guide: [trailreplay.com/gpx-download-guide.html](https://trailreplay.com/gpx-download-guide.html)

## Local Development

From the repo root:

```bash
npm install
npm --prefix app install
npm run dev
```

From the app folder:

```bash
cd app
npm install
npm run dev
```

Useful commands:

```bash
npm run lint
npm run test
npm run build
```

The root scripts delegate to the active app in `app/`.

## Repository Layout

- `app/`: active TrailReplay frontend, help pages, public assets, and tests
- `api/`: serverless feedback endpoint used by the deployed site
- `docs/`: internal notes and branding assets

## Notes

- V1 has been discontinued and is no longer part of the active runtime.
- Legacy paths are redirected to the current root-served app and help pages.
- Feedback submissions still go through [`api/contact.js`](./api/contact.js).
