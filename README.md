# TrailReplay

TrailReplay is a browser-based GPX replay studio. The active product is V2, built in React and TypeScript under `trailreplayV2/app`. The repository root now contains the lightweight marketing/static shell, deployment config, shared assets, and the serverless feedback endpoint used by V2.

## Active App
- V2 app: `trailreplayV2/app`
- Live editor: [trailreplay.com/app](https://trailreplay.com/app)
- Tutorial: [trailreplay.com/app/tutorial.html](https://trailreplay.com/app/tutorial.html)
- GPX guide: [trailreplay.com/app/gpx-download-guide.html](https://trailreplay.com/app/gpx-download-guide.html)

## Local Development
Root shell:

```bash
npm install
npm run dev
```

V2 app:

```bash
cd trailreplayV2/app
npm install
npm run dev
```

Production build from the repo root:

```bash
npm run build
```

That builds the root static shell, builds V2, and copies the V2 output into `dist/app`.

## Repository Layout
- `trailreplayV2/app/`: active V2 product
- `public/`: root static assets and media
- `src/`: root static-site bootstrap, styling, translations, and analytics helpers
- `api/`: serverless endpoints used by the deployed site and V2 feedback
- `scripts/`: build/deployment helpers
- `docs/`: project notes and internal documentation

## Notes
- V1 has been discontinued and is no longer part of the active runtime.
- Legacy `/app-v1`, tutorial, GPX guide, and Strava callback URLs are redirected to the V2 experience.
- Feedback submissions still go through `api/contact.js`.
