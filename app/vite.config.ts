/// <reference types="vitest/config" />
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Cloudflare Pages Functions (functions/api/*.js — landmarks, contact) only
  // run when the site is served through Cloudflare itself. Plain `vite dev`
  // has no backend for `/api/*` at all, so those requests hit this dev
  // server's own origin and fail. Set LOCAL_API_PROXY_TARGET in a git-ignored
  // `.env` (see .gitignore) to forward `/api/*` to a real deployment instead
  // — left unset, no proxy is configured and `/api/*` behaves as it always
  // did locally (404/no backend).
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = env.LOCAL_API_PROXY_TARGET;

  return {
  base: '/',
  server: {
    proxy: apiProxyTarget ? {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: true,
      },
    } : undefined,
  },
  // The inspector stamps `code-path` source locations onto every element, so it
  // is dev-only: in production it leaks source structure and bloats both the
  // bundles and the prerendered HTML. The prerender script runs a Vite server
  // (command === 'serve') purely to render, so it opts out explicitly.
  plugins: [
    ...(command === 'serve' && !process.env.TRAILREPLAY_PRERENDER ? [inspectAttr()] : []),
    react(),
  ],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        tutorial: path.resolve(__dirname, 'tutorial.html'),
        gpxGuide: path.resolve(__dirname, 'gpx-download-guide.html'),
        stravaToVideo: path.resolve(__dirname, 'strava-to-video.html'),
        garminToVideo: path.resolve(__dirname, 'garmin-to-video.html'),
        gpxAnimation: path.resolve(__dirname, 'gpx-animation.html'),
        cyclingRouteAnimation: path.resolve(__dirname, 'cycling-route-animation.html'),
        runningRouteAnimation: path.resolve(__dirname, 'running-route-animation.html'),
        cinematicCamera: path.resolve(__dirname, 'cinematic-camera.html'),
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('maplibre-gl')) return 'maplibre';
          if (id.includes('mp4-muxer') || id.includes('fix-webm-duration')) return 'video-export';
          if (
            id.includes('exifr') ||
            id.includes('exifreader') ||
            id.includes('heic-to') ||
            id.includes('@xmldom')
          ) return 'media-processing';
          if (id.includes('recharts')) return 'charts';
          if (id.includes('@radix-ui')) return 'radix';
          return 'vendor';
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
  };
});
