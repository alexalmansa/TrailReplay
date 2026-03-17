import { BookOpen, Download, Film, ImageIcon, Layers3, Mountain, Route, TimerReset } from 'lucide-react';
import { HelpLayout } from './HelpLayout';
import { quickStartSteps, sampleTracks, tutorialFeatures, tutorialVideos } from './helpContent';

const featureIcons = [Route, Layers3, ImageIcon, Mountain, Film, TimerReset];

export function TutorialPage() {
  return (
    <HelpLayout
      eyebrow="Tutorial"
      title="Learn TrailReplay v2 from the real workflow"
      description="This guide focuses on the current v2 experience: importing tracks, shaping a journey, adding media, previewing the export crop, and recording a polished replay."
    >
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[1.5rem] border border-[var(--evergreen)]/12 bg-white/80 p-6 shadow-sm">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--trail-orange-15)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--trail-orange)]">
            <BookOpen className="h-4 w-4" />
            Quick start
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
            Catalonia sample routes
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
          <a href="/app/gpx-download-guide.html" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--trail-orange)] hover:underline">
            Need to export your own GPX first?
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
              <h2 className="text-xl font-bold">Why these two files?</h2>
              <p className="text-sm text-[var(--evergreen-60)]">They stress the exact parts of TrailReplay that matter most in a first serious preview.</p>
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
          <h2 className="text-xl font-bold">Best first pass</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-[1.15rem] border border-[var(--evergreen)]/10 bg-white/80 p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--trail-orange)]">Use Camins d'Her for</p>
              <p className="mt-2 text-sm leading-6 text-[var(--evergreen-80)]">terrain contrast, steeper camera moves, and checking whether the stats/export crop feel balanced on a mountain course.</p>
            </div>
            <div className="rounded-[1.15rem] border border-[var(--evergreen)]/10 bg-white/80 p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--trail-orange)]">Use Pedals de Foc for</p>
              <p className="mt-2 text-sm leading-6 text-[var(--evergreen-80)]">long pacing, route overview, and validating how a denser endurance GPX reads in replay and export mode.</p>
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
            <h2 className="text-xl font-bold">Watch actual v2 exports</h2>
            <p className="text-sm text-[var(--evergreen-60)]">These examples were recorded with the TrailReplay export flow.</p>
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
        <h2 className="text-xl font-bold">What v2 covers today</h2>
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
        <h2 className="text-xl font-bold">Recommended first run</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-white/60">1. Import</p>
            <p className="mt-2 text-sm leading-6 text-white/85">Use one of the sample GPX files if you only want to learn the interface first.</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-white/60">2. Style</p>
            <p className="mt-2 text-sm leading-6 text-white/85">Open Style, Media, and Settings to shape the replay before you record anything.</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-white/60">3. Export</p>
            <p className="mt-2 text-sm leading-6 text-white/85">Preview the crop frame in Export so the stats and media stay inside the recorded area.</p>
          </div>
        </div>
      </section>
    </HelpLayout>
  );
}
