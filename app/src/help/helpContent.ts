type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface SampleTrack {
  title: string;
  subtitle: string;
  badge: string;
  href: string;
  highlight: string;
}

export function getTutorialVideos(t: Translate) {
  return [
    {
      title: t('help.tutorial.videos.pathExport.title'),
      description: t('help.tutorial.videos.pathExport.description'),
      src: '/media/video/path-export-with-stats.mp4',
      downloadLabel: t('help.tutorial.videos.pathExport.downloadLabel'),
    },
    {
      title: t('help.tutorial.videos.comparison.title'),
      description: t('help.tutorial.videos.comparison.description'),
      src: '/media/video/comparison-mode-demo.mp4',
      downloadLabel: t('help.tutorial.videos.comparison.downloadLabel'),
    },
  ];
}

export function getSampleTracks(t: Translate): SampleTrack[] {
  return [
    {
      title: "Camins d'Her CDH by UTMB Val d'Aran 2025",
      subtitle: t('help.tutorial.sampleTracks.camins.subtitle'),
      badge: t('help.tutorial.sampleTracks.camins.badge'),
      href: '/media/samples/ultratrail-camins-dher-cdh-by-utmb-val-daran-2025.gpx',
      highlight: t('help.tutorial.sampleTracks.camins.highlight'),
    },
    {
      title: 'Pedals de Foc Non Stop 2023',
      subtitle: t('help.tutorial.sampleTracks.pedals.subtitle'),
      badge: t('help.tutorial.sampleTracks.pedals.badge'),
      href: '/media/samples/pedals-de-foc-non-stop-2023.gpx',
      highlight: t('help.tutorial.sampleTracks.pedals.highlight'),
    },
  ];
}

export function getTutorialFeatures(t: Translate) {
  return [
    {
      title: t('help.tutorial.features.multiTrack.title'),
      body: t('help.tutorial.features.multiTrack.body'),
    },
    {
      title: t('help.tutorial.features.comparison.title'),
      body: t('help.tutorial.features.comparison.body'),
    },
    {
      title: t('help.tutorial.features.media.title'),
      body: t('help.tutorial.features.media.body'),
    },
    {
      title: t('help.tutorial.features.mapStyle.title'),
      body: t('help.tutorial.features.mapStyle.body'),
    },
    {
      title: t('help.tutorial.features.export.title'),
      body: t('help.tutorial.features.export.body'),
    },
    {
      title: t('help.tutorial.features.journey.title'),
      body: t('help.tutorial.features.journey.body'),
    },
  ];
}

export function getQuickStartSteps(t: Translate) {
  return [
    t('help.tutorial.quickStart.step1'),
    t('help.tutorial.quickStart.step2'),
    t('help.tutorial.quickStart.step3'),
    t('help.tutorial.quickStart.step4'),
    t('help.tutorial.quickStart.step5'),
  ];
}

export function getProviderGuides(t: Translate) {
  return [
    {
      name: 'Wikiloc',
      icon: '🗺️',
      subtitle: t('help.gpxGuide.providers.wikiloc.subtitle'),
      siteHref: 'https://www.wikiloc.com',
      steps: [
        t('help.gpxGuide.providers.wikiloc.step1'),
        t('help.gpxGuide.providers.wikiloc.step2'),
        t('help.gpxGuide.providers.wikiloc.step3'),
        t('help.gpxGuide.providers.wikiloc.step4'),
      ],
      notes: [
        t('help.gpxGuide.providers.wikiloc.note1'),
        t('help.gpxGuide.providers.wikiloc.note2'),
      ],
    },
    {
      name: 'Strava',
      icon: '🏃',
      subtitle: t('help.gpxGuide.providers.strava.subtitle'),
      siteHref: 'https://www.strava.com',
      steps: [
        t('help.gpxGuide.providers.strava.step1'),
        t('help.gpxGuide.providers.strava.step2'),
        t('help.gpxGuide.providers.strava.step3'),
        t('help.gpxGuide.providers.strava.step4'),
      ],
      notes: [
        t('help.gpxGuide.providers.strava.note1'),
        t('help.gpxGuide.providers.strava.note2'),
      ],
    },
  ];
}

export function getOtherProviders(t: Translate) {
  return [
    { title: 'Garmin Connect', body: t('help.gpxGuide.otherProviders.garmin') },
    { title: 'Polar Flow', body: t('help.gpxGuide.otherProviders.polar') },
    { title: 'Runkeeper', body: t('help.gpxGuide.otherProviders.runkeeper') },
    { title: 'AllTrails', body: t('help.gpxGuide.otherProviders.alltrails') },
    { title: 'Apple Health', body: t('help.gpxGuide.otherProviders.appleHealth') },
    { title: 'Google Fit', body: t('help.gpxGuide.otherProviders.googleFit') },
  ];
}

export function getGpxTips(t: Translate) {
  return [
    t('help.gpxGuide.tips.tip1'),
    t('help.gpxGuide.tips.tip2'),
    t('help.gpxGuide.tips.tip3'),
    t('help.gpxGuide.tips.tip4'),
  ];
}
