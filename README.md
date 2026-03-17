# TrailReplay

TrailReplay turns raw GPX files into polished, shareable route stories. You can import one or more activities, replay them on a 3D map, add photos and annotations, compare tracks, and export the result as a video, all directly in the browser.

The active product lives in [`app/`](./app), built with React and TypeScript, and powers [trailreplay.com](https://trailreplay.com).

## Demo Videos

**Path Export with Stats** - Export a trail with detailed statistics and elevation data

https://github.com/user-attachments/assets/73c65611-8348-4b4d-b7c2-af661ab5e75f

[▶ Watch Path Export Demo](https://trailreplay.com/tutorial.html#demo-videos)

**Comparison Mode** - Compare two GPX files from the same timeframe to see where each person was at any moment

https://github.com/user-attachments/assets/c42e5efd-6c08-4591-ab66-92cc16484f24

[▶ Watch Comparison Mode Demo](https://trailreplay.com/tutorial.html#demo-videos)

> If GitHub does not render the inline previews, you can still watch them in the tutorial or open the original MP4 files in [`media/video/`](./media/video).

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
