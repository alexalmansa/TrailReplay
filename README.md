# TrailReplay

TrailReplay turns raw GPX files into polished, shareable route stories. You can import one or more activities, replay them on a 3D map, add photos and annotations, compare tracks, and export the result as a video, all directly in the browser.

The active product lives in [`app/`](./app), built with React and TypeScript, and powers [trailreplay.com](https://trailreplay.com).

## Demo Videos

**Path Export with Stats**  
Export a route story with animated map playback, live stats, elevation profile, and branded video output.

https://github.com/user-attachments/assets/73c65611-8348-4b4d-b7c2-af661ab5e75f

[▶ Watch in tutorial](https://trailreplay.com/tutorial.html#demo-videos)

**Comparison Mode**  
Compare two GPX tracks from the same time window and see where each person was at every moment.

https://github.com/user-attachments/assets/c42e5efd-6c08-4591-ab66-92cc16484f24

[▶ Watch in tutorial](https://trailreplay.com/tutorial.html#demo-videos)

> If GitHub does not render the inline previews for your session, you can still watch them in the tutorial or open the original MP4 files in [`media/video/`](./media/video).

## What It Is

TrailReplay is a browser-based GPX storytelling studio for runners, cyclists, hikers, and outdoor creators. Instead of just viewing a route on a static map, it lets you turn that route into an animated replay with timing, stats, elevation, images, and exportable video.

## What TrailReplay Does

- Import one or many GPX files and replay them on an interactive map.
- Build a full journey by combining tracks, reordering them, and adding transport segments.
- Display live stats, elevation, pace, and route progress during playback.
- Attach photos to the route, either from GPS metadata or by manual placement on the map.
- Compare activities side by side with different colors and timing offsets.
- Export polished videos with map motion, stats overlays, elevation profile, and media popups.
- Keep the core workflow local in the browser so GPX files and exported media are not uploaded by default.

## Main Product Areas

- GPX replay: animate a single activity or several combined tracks on an interactive 3D map.
- Journey builder: stitch routes together, reorder them, and add transport segments between activities.
- Storytelling layer: place photos along the route and use annotations to highlight moments.
- Comparison mode: replay different tracks together to compare timing and movement.
- Video export: generate ready-to-share route videos with overlays, branding, and elevation data.

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
