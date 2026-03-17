export interface SampleTrack {
  title: string;
  subtitle: string;
  badge: string;
  href: string;
  highlight: string;
}

export const tutorialVideos = [
  {
    title: 'Path export with stats',
    description: 'A full route replay with live stats, elevation, and export-ready framing.',
    src: '/app/media/video/path-export-with-stats.mp4',
    downloadLabel: 'Download path export demo',
  },
  {
    title: 'Comparison mode demo',
    description: 'Two GPX files replayed together to compare pace, route choices, and timing.',
    src: '/app/media/video/comparison-mode-demo.mp4',
    downloadLabel: 'Download comparison mode demo',
  },
];

export const sampleTracks = [
  {
    title: "Camins d'Her CDH by UTMB Val d'Aran 2025",
    subtitle: 'Technical mountain ultra from one of the most iconic Catalan trail events.',
    badge: 'Trail ultra',
    href: '/app/media/samples/ultratrail-camins-dher-cdh-by-utmb-val-daran-2025.gpx',
    highlight: 'Great for testing elevation, cinematic camera, and stats framing on a demanding mountain course.',
  },
  {
    title: 'Pedals de Foc Non Stop 2023',
    subtitle: 'Legendary Pyrenean MTB loop and one of the reference endurance routes in Catalonia.',
    badge: 'Bikepacking / MTB',
    href: '/app/media/samples/pedals-de-foc-non-stop-2023.gpx',
    highlight: 'Perfect for long-distance pacing, map styling, and export previews with dense route storytelling.',
  },
] satisfies SampleTrack[];

export const tutorialFeatures = [
  {
    title: 'Multi-track journeys',
    body: 'Load one or many GPX/KML files, reorder them, and build a single narrative from separate activities.',
  },
  {
    title: 'Comparison mode',
    body: 'Overlay a second GPX track to compare two efforts from the same route or timeframe.',
  },
  {
    title: 'Media storytelling',
    body: 'Attach images to moments in the track, review their timing, and keep them visible in video exports.',
  },
  {
    title: 'Map styling',
    body: 'Switch between map styles, terrain overlays, labels, and cinematic follow camera presets.',
  },
  {
    title: 'Video export',
    body: 'Export 16:9, 1:1, or 9:16 videos with stats, elevation profile, and branded overlays.',
  },
  {
    title: 'Journey editing',
    body: 'Add transport segments, control durations, and shape the replay so the story matches the real trip.',
  },
];

export const quickStartSteps = [
  "Open TrailReplay v2 and upload one of the sample races or your own GPX/KML file.",
  'Review the journey order in the sidebar and add transport segments if needed.',
  'Customize map style, camera, stats, icons, and media timing.',
  'Play through the route to validate pacing and picture timing.',
  'Open Export, preview the crop, and record the final video.',
];

export const providerGuides = [
  {
    name: 'Wikiloc',
    icon: '🗺️',
    subtitle: 'Outdoor routes shared by the community',
    steps: [
      'Sign in at wikiloc.com and open your profile.',
      'Go to “My tracks” and choose the activity or public route you want.',
      'Open the route detail view and locate the download button.',
      'Select GPX format and save the file locally.',
    ],
    notes: [
      'Public trails can usually be downloaded too.',
      'Elevation data in the GPX improves the 3D replay.',
    ],
  },
  {
    name: 'Strava',
    icon: '🏃',
    subtitle: 'Activities from runs, rides, hikes, and more',
    steps: [
      'Sign in at strava.com and open the activity you want to export.',
      'Open the three-dot activity menu in the top-right area.',
      'Choose “Export GPX” or, if needed, “Export Original”.',
      'Save the file and upload it directly into TrailReplay v2.',
    ],
    notes: [
      'Prefer “Export GPX” when available for the cleanest import.',
      'Public activities can sometimes be exported depending on privacy settings.',
    ],
  },
];

export const otherProviders = [
  { title: 'Garmin Connect', body: 'Export completed activities from the web dashboard after opening the workout detail page.' },
  { title: 'Polar Flow', body: 'Look for export/download actions from the training session detail view.' },
  { title: 'Runkeeper', body: 'Use the web interface or account tools to export workout tracks as GPX.' },
  { title: 'AllTrails', body: 'Trail maps and recorded activities usually provide GPX downloads from the route page.' },
  { title: 'Apple Health', body: 'Use a third-party exporter when the original source app does not expose GPX directly.' },
  { title: 'Google Fit', body: 'Use Google Takeout or a connected source app when direct GPX export is unavailable.' },
];

export const gpxTips = [
  'More track points produce smoother animations.',
  'Timestamps help TrailReplay build realistic timing and pace.',
  'Elevation data improves terrain-aware camera and profile visuals.',
  'If a platform only exports FIT or TCX, convert it to GPX before importing.',
];
