# TrailReplay

TrailReplay is a browser-based GPX replay studio. The active product lives in `app/`, built with React and TypeScript. The repository root contains deployment config, the serverless feedback endpoint, and project documentation.

## App
- App folder: `app`
- Live editor: [trailreplay.com](https://trailreplay.com)
- Tutorial: [trailreplay.com/tutorial.html](https://trailreplay.com/tutorial.html)
- GPX guide: [trailreplay.com/gpx-download-guide.html](https://trailreplay.com/gpx-download-guide.html)

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

Production build from the repo root:

```bash
npm run build
```

That installs the app dependencies and builds the production site into `app/dist`.

## Repository Layout
- `app/`: active product
- `api/`: serverless endpoints used by the deployed site and feedback flow
- `docs/`: project notes and internal documentation

## Notes
- V1 has been discontinued and is no longer part of the active runtime.
- Legacy `/app`, `/app-v1`, tutorial, GPX guide, and Strava callback URLs are redirected to the current app entrypoints.
- Feedback submissions still go through `api/contact.js`.
