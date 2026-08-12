/// <reference types="vitest/config" />
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [inspectAttr(), react()],
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
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('maplibre-gl')) return 'maplibre';
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
});
