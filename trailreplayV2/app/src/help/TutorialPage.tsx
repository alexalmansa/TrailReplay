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
        <article className="rounded-[1.5rem] border border-[var(--evergreen)]/15 bg-white/70 p-6 shadow-sm">
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

        <aside className="rounded-[1.5rem] border border-[var(--evergreen)]/15 bg-[var(--evergreen)] p-6 text-[var(--canvas)] shadow-sm">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/80">
            <Download className="h-4 w-4" />
            Sample GPX files
          </div>
          <div className="space-y-3">
            {sampleTracks.map((track) => (
              <a
                key={track.href}
                href={track.href}
                download
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm hover:bg-white/10"
              >
                <span>{track.label}</span>
                <Download className="h-4 w-4 text-[var(--trail-orange)]" />
              </a>
            ))}
          </div>
          <a href="/app/gpx-download-guide.html" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--trail-orange)] hover:underline">
            Need to export your own GPX first?
          </a>
        </aside>
      </section>

      <section className="rounded-[1.5rem] border border-[var(--evergreen)]/15 bg-white/70 p-6 shadow-sm">
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

      <section className="rounded-[1.5rem] border border-[var(--evergreen)]/15 bg-white/70 p-6 shadow-sm">
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

      <section className="rounded-[1.5rem] border border-[var(--evergreen)]/15 bg-[var(--evergreen)] p-6 text-[var(--canvas)] shadow-sm">
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
