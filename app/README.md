# TrailReplay V2

This package contains the active TrailReplay application.

## Commands

```bash
npm install
npm run dev
```

Other useful commands:

```bash
npm run lint
npm run test:run
npm run build
```

## Entry Points
- `src/main.tsx`: main V2 app entry
- `src/help/tutorial-main.tsx`: tutorial page entry
- `src/help/gpx-guide-main.tsx`: GPX download guide entry

## Structure
- `src/components/`: UI and feature surfaces
- `src/hooks/`: domain hooks
- `src/store/`: Zustand state
- `src/utils/`: shared domain logic
- `src/help/`: standalone V2 help pages
- `public/`: legal pages, media, and static assets

## Build Output
Vite builds this package for the site root, and production output is written to `app/dist`.
