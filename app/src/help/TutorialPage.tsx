import { BookOpen, Download, Film, ImageIcon, Layers3, Mountain, Route, TimerReset } from 'lucide-react';
import { useI18n } from '@/i18n/useI18n';
import { HelpLayout } from './HelpLayout';
import { getQuickStartSteps, getSampleTracks, getTutorialFeatures, getTutorialVideos } from './helpContent';

const featureIcons = [Route, Layers3, ImageIcon, Mountain, Film, TimerReset];

export function TutorialPage() {
  const { t } = useI18n();
  const quickStartSteps = getQuickStartSteps(t);
  const sampleTracks = getSampleTracks(t);
  const tutorialFeatures = getTutorialFeatures(t);
  const tutorialVideos = getTutorialVideos(t);

  return (
    <HelpLayout
      eyebrow={t('help.tutorial.eyebrow')}
      title={t('help.tutorial.title')}
      description={t('help.tutorial.description')}
      headerActions={[
        {
          href: '/gpx-download-guide.html',
          icon: <Download className="h-3.5 w-3.5" />,
          label: t('help.tutorial.headerAction'),
          tone: 'solid',
        },
      ]}
    >
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[1.5rem] border border-[var(--evergreen)]/12 bg-white/80 p-6 shadow-sm">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--trail-orange-15)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--trail-orange)]">
            <BookOpen className="h-4 w-4" />
            {t('help.tutorial.quickStart.badge')}
          </div>
          <ol className="space-y-3">
            {quickStartSteps.map((step, index) => (
              <li key={step} className="flex gap-4 rounded-2xl border border-[var(--evergreen)]/10 bg-[var(--canvas)] px-4 py-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--evergreen)] text-sm font-bold text-[var(--canvas)]">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-[var(--evergreen-80)]">{step}</p>
              </li>
            ))}
          </ol>
        </article>

        <aside className="rounded-[1.5rem] border border-[var(--evergreen)]/15 bg-[linear-gradient(160deg,var(--evergreen),#223428)] p-6 text-[var(--canvas)] shadow-sm">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/80">
            <Download className="h-4 w-4" />
            {t('help.tutorial.sampleRoutesBadge')}
          </div>
          <div className="space-y-3">
            {sampleTracks.map((track) => (
              <a
                key={track.href}
                href={track.href}
                download
                className="block rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 transition-colors hover:bg-white/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="inline-flex rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
                      {track.badge}
                    </div>
                    <h3 className="mt-3 text-sm font-semibold leading-5 text-white">{track.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-white/72">{track.subtitle}</p>
                    <p className="mt-3 text-xs leading-5 text-white/65">{track.highlight}</p>
                  </div>
                  <Download className="mt-1 h-4 w-4 shrink-0 text-[var(--trail-orange)]" />
                </div>
              </a>
            ))}
          </div>
          <a href="/gpx-download-guide.html" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--trail-orange)] hover:underline">
            {t('help.tutorial.needGpxGuide')}
          </a>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-[1.5rem] border border-[var(--evergreen)]/15 bg-white/75 p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--trail-orange-15)] text-[var(--trail-orange)]">
              <Route className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t('help.tutorial.whyFilesTitle')}</h2>
              <p className="text-sm text-[var(--evergreen-60)]">{t('help.tutorial.whyFilesBody')}</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {sampleTracks.map((track) => (
              <article key={track.title} className="rounded-[1.25rem] border border-[var(--evergreen)]/10 bg-[var(--canvas)] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--trail-orange)]">{track.badge}</p>
                <h3 className="mt-2 text-base font-semibold">{track.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--evergreen-80)]">{track.highlight}</p>
              </article>
            ))}
          </div>
        </article>

        <article className="rounded-[1.5rem] border border-[var(--evergreen)]/15 bg-[var(--trail-orange-15)] p-6 shadow-sm">
          <h2 className="text-xl font-bold">{t('help.tutorial.bestFirstPassTitle')}</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-[1.15rem] border border-[var(--evergreen)]/10 bg-white/80 p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--trail-orange)]">{t('help.tutorial.caminsUseLabel')}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--evergreen-80)]">{t('help.tutorial.caminsUseBody')}</p>
            </div>
            <div className="rounded-[1.15rem] border border-[var(--evergreen)]/10 bg-white/80 p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--trail-orange)]">{t('help.tutorial.pedalsUseLabel')}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--evergreen-80)]">{t('help.tutorial.pedalsUseBody')}</p>
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-[1.5rem] border border-[var(--evergreen)]/15 bg-white/75 p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--trail-orange-15)] text-[var(--trail-orange)]">
            <Film className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{t('help.tutorial.watchExportsTitle')}</h2>
            <p className="text-sm text-[var(--evergreen-60)]">{t('help.tutorial.watchExportsBody')}</p>
          </div>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          {tutorialVideos.map((video) => (
            <figure key={video.src} className="rounded-[1.25rem] border border-[var(--evergreen)]/10 bg-[var(--canvas)] p-4">
              <video controls className="aspect-video w-full rounded-xl border border-[var(--evergreen)]/15 bg-black/80">
                <source src={video.src} type="video/mp4" />
              </video>
              <figcaption className="mt-4">
                <h3 className="text-base font-semibold">{video.title}</h3>
                <p className="mt-1 text-sm leading-6 text-[var(--evergreen-60)]">{video.description}</p>
                <a href={video.src} download className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--trail-orange)] hover:underline">
                  <Download className="h-4 w-4" />
                  {video.downloadLabel}
                </a>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-[var(--evergreen)]/15 bg-white/75 p-6 shadow-sm">
        <h2 className="text-xl font-bold">{t('help.tutorial.coversTitle')}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tutorialFeatures.map((feature, index) => {
            const Icon = featureIcons[index];
            return (
              <article key={feature.title} className="rounded-[1.25rem] border border-[var(--evergreen)]/10 bg-[var(--trail-orange-15)] p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--canvas)] text-[var(--trail-orange)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--evergreen-80)]">{feature.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-[var(--evergreen)]/15 bg-[linear-gradient(160deg,var(--evergreen),#233427)] p-6 text-[var(--canvas)] shadow-sm">
        <h2 className="text-xl font-bold">{t('help.tutorial.recommendedFirstRunTitle')}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-white/60">{t('help.tutorial.firstRun.importLabel')}</p>
            <p className="mt-2 text-sm leading-6 text-white/85">{t('help.tutorial.firstRun.importBody')}</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-white/60">{t('help.tutorial.firstRun.styleLabel')}</p>
            <p className="mt-2 text-sm leading-6 text-white/85">{t('help.tutorial.firstRun.styleBody')}</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-white/60">{t('help.tutorial.firstRun.exportLabel')}</p>
            <p className="mt-2 text-sm leading-6 text-white/85">{t('help.tutorial.firstRun.exportBody')}</p>
          </div>
        </div>
      </section>
    </HelpLayout>
  );
}
