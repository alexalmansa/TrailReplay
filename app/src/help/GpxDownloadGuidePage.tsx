import { Download, FileCode2, Globe2, MapPinned } from 'lucide-react';
import { HelpLayout } from './HelpLayout';
import { gpxTips, otherProviders, providerGuides } from './helpContent';

export function GpxDownloadGuidePage() {
  return (
    <HelpLayout
      eyebrow="GPX guide"
      title="How to get GPX files into TrailReplay"
      description="Use this page when your route still lives inside Strava, Wikiloc, Garmin Connect, or another platform. The goal is simple: export a clean GPX file and bring it straight into TrailReplay."
    >
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[1.5rem] border border-[var(--evergreen)]/15 bg-[linear-gradient(160deg,var(--evergreen),#24372a)] p-6 text-[var(--canvas)] shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[var(--trail-orange)]">
            <FileCode2 className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold">What makes a good GPX file?</h2>
          <ul className="mt-4 space-y-3">
            {gpxTips.map((tip) => (
              <li key={tip} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white/85">
                {tip}
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-[1.5rem] border border-[var(--evergreen)]/15 bg-white/80 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--trail-orange-15)] text-[var(--trail-orange)]">
              <MapPinned className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Before you export</h2>
              <p className="text-sm text-[var(--evergreen-60)]">A quick checklist that avoids the most common import issues.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.25rem] border border-[var(--evergreen)]/10 bg-[var(--canvas)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--trail-orange)]">Choose GPX when possible</p>
              <p className="mt-2 text-sm leading-6 text-[var(--evergreen-80)]">If a platform offers GPX, use it. FIT and TCX sometimes need conversion before import.</p>
            </div>
            <div className="rounded-[1.25rem] border border-[var(--evergreen)]/10 bg-[var(--canvas)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--trail-orange)]">Keep timestamps</p>
              <p className="mt-2 text-sm leading-6 text-[var(--evergreen-80)]">Timestamp-rich GPX files help pace, duration, and journey timing look much better.</p>
            </div>
            <div className="rounded-[1.25rem] border border-[var(--evergreen)]/10 bg-[var(--canvas)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--trail-orange)]">Prefer full-activity exports</p>
              <p className="mt-2 text-sm leading-6 text-[var(--evergreen-80)]">A route-only GPX is usable, but a recorded activity usually contains richer timing and elevation.</p>
            </div>
            <div className="rounded-[1.25rem] border border-[var(--evergreen)]/10 bg-[var(--canvas)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--trail-orange)]">Check privacy first</p>
              <p className="mt-2 text-sm leading-6 text-[var(--evergreen-80)]">If you are exporting public activities, confirm the share settings before downloading or publishing the replay.</p>
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-[1.5rem] border border-[var(--evergreen)]/15 bg-[var(--trail-orange-15)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--trail-orange)]">Fast path</p>
            <h2 className="mt-2 text-xl font-bold">If you already have a file, skip the providers</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--evergreen-80)]">
              TrailReplay works best when the GPX already contains timestamps and elevation. If your export has those two, you can import it immediately and use the tutorial only for polish and export framing.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="/" className="tr-btn tr-btn-primary">Open TrailReplay</a>
            <a href="/tutorial.html" className="tr-btn tr-btn-secondary inline-flex items-center gap-2">
              <Download className="h-4 w-4" />
              Open tutorial
            </a>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        {providerGuides.map((provider) => (
          <article key={provider.name} className="rounded-[1.5rem] border border-[var(--evergreen)]/15 bg-white/80 p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--evergreen)]/15 bg-[var(--trail-orange-15)] text-2xl">
                  {provider.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{provider.name}</h2>
                  <p className="text-sm text-[var(--evergreen-60)]">{provider.subtitle}</p>
                </div>
              </div>
              <a
                href={provider.name === 'Strava' ? 'https://www.strava.com' : 'https://www.wikiloc.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--trail-orange)] hover:underline"
              >
                Open {provider.name}
              </a>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.72fr]">
              <ol className="space-y-3">
                {provider.steps.map((step, index) => (
                  <li key={step} className="flex gap-4 rounded-2xl border border-[var(--evergreen)]/10 bg-[var(--canvas)] px-4 py-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--evergreen)] text-sm font-bold text-[var(--canvas)]">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-[var(--evergreen-80)]">{step}</p>
                  </li>
                ))}
              </ol>

              <div className="rounded-[1.25rem] border border-[var(--evergreen)]/10 bg-[var(--trail-orange-15)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--trail-orange)]">Notes</p>
                <ul className="mt-3 space-y-3">
                  {provider.notes.map((note) => (
                    <li key={note} className="text-sm leading-6 text-[var(--evergreen-80)]">
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-[1.5rem] border border-[var(--evergreen)]/15 bg-white/80 p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--trail-orange-15)] text-[var(--trail-orange)]">
            <Globe2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Other platforms</h2>
            <p className="text-sm text-[var(--evergreen-60)]">The wording changes, but the logic is usually the same: open activity, export, choose GPX.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {otherProviders.map((provider) => (
            <article key={provider.title} className="rounded-[1.25rem] border border-[var(--evergreen)]/10 bg-[var(--canvas)] p-5">
              <h3 className="text-base font-semibold">{provider.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--evergreen-80)]">{provider.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-[var(--evergreen)]/15 bg-[linear-gradient(160deg,var(--evergreen),#233427)] p-6 text-[var(--canvas)] shadow-sm">
        <h2 className="text-xl font-bold">Next step</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/85">
          Once the GPX file is on your machine, open TrailReplay, import it, review the journey, and use the tutorial if you want a faster first export.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href="/" className="tr-btn tr-btn-primary">Open TrailReplay</a>
          <a href="/tutorial.html" className="tr-btn tr-btn-secondary inline-flex items-center gap-2">
            <Download className="h-4 w-4" />
            Open tutorial
          </a>
        </div>
      </section>
    </HelpLayout>
  );
}
