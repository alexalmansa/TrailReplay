import { ArrowRight, Check, Download, Film, Github, Play, Upload } from 'lucide-react';
import { trackEvent } from '@/utils/analytics';
import { SEO_LANDING_PAGES, type SeoLandingPageConfig } from './seoPages';

function trackSeoCta(page: SeoLandingPageConfig, location: string) {
  trackEvent('seo_cta_clicked', {
    landing_page: page.slug,
    cta_location: location,
    target_page: 'app',
  });
}

function HeroMedia({ page }: { page: SeoLandingPageConfig }) {
  if (page.heroMedia === 'product-video') {
    return (
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border-2 border-white/18 bg-[#101713] shadow-[10px_10px_0_rgba(193,101,47,0.28)] sm:aspect-video lg:aspect-[4/5]">
        <video
          className="h-full w-full object-cover"
          src="/media/video/path-export-with-stats.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label="TrailReplay animated GPX route export with live statistics"
        />
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-5 pb-5 pt-12 text-xs font-semibold text-white">
          <Play className="h-4 w-4 fill-current" />
          Real TrailReplay export
        </div>
      </div>
    );
  }

  const isRunning = page.heroMedia === 'running-photo';
  return (
    <div
      role="img"
      aria-label={isRunning ? 'Trail runner on an alpine ridgeline' : 'Cyclist riding a mountain switchback'}
      className="relative aspect-[2/3] overflow-hidden rounded-2xl border-2 border-white/18 bg-no-repeat shadow-[10px_10px_0_rgba(193,101,47,0.28)]"
      style={{
        backgroundImage: 'url(/media/images/seo/outdoor-route-stories.webp)',
        backgroundPosition: isRunning ? 'left center' : 'right center',
        backgroundSize: 'auto 100%',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      <div className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-12 text-xs font-semibold text-white">
        {isRunning ? 'Routes with real elevation and effort' : 'Make the geography part of the ride story'}
      </div>
    </div>
  );
}

export function SeoLandingPage({ page }: { page: SeoLandingPageConfig }) {
  const relatedPages = Object.values(SEO_LANDING_PAGES).filter((candidate) => candidate.slug !== page.slug);

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--evergreen)]">
      <header className="border-b border-white/10 bg-[var(--evergreen)] text-[var(--canvas)]">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="/" className="flex items-center gap-3" aria-label="TrailReplay home">
            <span className="rounded-md bg-white p-1"><img src="/media/images/simplelogo.png" alt="" className="h-6 w-6" /></span>
            <span className="hidden text-sm font-bold tracking-[-0.04em] text-white sm:inline">TRAILREPLAY</span>
          </a>
          <div className="hidden items-center gap-6 text-xs font-semibold md:flex">
            <a href="/tutorial" className="text-white/70 transition-colors hover:text-white">How it works</a>
            <a href="/gpx-download-guide" className="text-white/70 transition-colors hover:text-white">Get a GPX</a>
            <a href="https://github.com/alexalmansa/TrailReplay" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-white/70 transition-colors hover:text-white">
              <Github className="h-4 w-4" /> Open source
            </a>
          </div>
          <a
            href="/"
            onClick={() => trackSeoCta(page, 'header')}
            className="tr-btn tr-btn-primary whitespace-nowrap text-xs sm:text-sm"
          >
            Open app
          </a>
        </nav>
      </header>

      <main>
        <section className="bg-[var(--evergreen)] text-[var(--canvas)]">
          <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-7xl items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1.08fr_0.72fr] lg:py-16">
            <div className="max-w-3xl border-l-2 border-[var(--trail-orange)] pl-5 sm:pl-8">
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--trail-orange)]">{page.eyebrow}</p>
              <h1 className="text-4xl font-bold leading-[1.05] tracking-[-0.055em] sm:text-5xl lg:text-6xl">{page.title}</h1>
              <p className="mt-6 max-w-[62ch] text-base leading-7 text-white/80 sm:text-lg">{page.description}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="/" onClick={() => trackSeoCta(page, 'hero')} className="tr-btn tr-btn-primary inline-flex items-center gap-2 whitespace-nowrap">
                  Animate your GPX <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#how-it-works" className="inline-flex items-center gap-2 rounded-md border border-white/22 px-4 py-2 font-medium text-white transition-colors hover:bg-white/10">
                  See the steps
                </a>
              </div>
            </div>
            <HeroMedia page={page} />
          </div>
        </section>

        <aside className="border-b-2 border-[var(--evergreen)] bg-[var(--canvas)]">
          <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-5 text-sm font-semibold leading-6 sm:px-6">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--trail-orange)]" />
            <p>{page.proof}</p>
          </div>
        </aside>

        <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <h2 className="max-w-3xl text-3xl font-bold tracking-[-0.04em] sm:text-4xl">{page.stepsTitle}</h2>
          <p className="mt-4 max-w-[65ch] leading-7 text-[var(--evergreen-60)]">{page.stepsIntro}</p>
          <ol className="mt-12 grid overflow-hidden rounded-2xl border-2 border-[var(--evergreen)] md:grid-cols-2 lg:grid-cols-4">
            {page.steps.map((step, index) => (
              <li
                key={step.title}
                className={`border-[var(--evergreen)] p-6 ${index < 3 ? 'border-b-2' : ''} ${index < 2 ? 'md:border-b-2 lg:border-b-0' : 'md:border-b-0'} ${index % 2 === 0 ? 'md:border-r-2' : ''} ${index < 3 ? 'lg:border-r-2' : 'lg:border-r-0'} ${index === 0 ? 'bg-[var(--trail-orange-15)]' : 'bg-[var(--canvas)]'}`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--evergreen)] text-sm font-bold text-[var(--canvas)]">{index + 1}</span>
                <h3 className="mt-6 font-bold">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--evergreen-60)]">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y-2 border-[var(--evergreen)] bg-[var(--canvas)]">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:py-28">
            <div className="lg:sticky lg:top-24">
              <h2 className="text-3xl font-bold tracking-[-0.04em] sm:text-4xl">{page.featuresTitle}</h2>
              <a href="/" onClick={() => trackSeoCta(page, 'features')} className="mt-7 inline-flex items-center gap-2 font-bold text-[var(--trail-orange)] hover:underline">
                Try it with your route <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="divide-y divide-[var(--evergreen)]/12 border-y border-[var(--evergreen)]/12">
              {page.features.map(({ icon: Icon, title, body }) => (
                <article key={title} className="grid gap-4 py-7 sm:grid-cols-[3rem_1fr]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--evergreen)] text-[var(--canvas)]"><Icon className="h-5 w-5" /></div>
                  <div><h3 className="font-bold">{title}</h3><p className="mt-2 max-w-[58ch] text-sm leading-6 text-[var(--evergreen-60)]">{body}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <article>
            <h2 className="text-3xl font-bold tracking-[-0.04em]">{page.detailTitle}</h2>
            <div className="mt-6 space-y-5 text-sm leading-7 text-[var(--evergreen-80)]">
              {page.detailParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/gpx-download-guide" className="tr-btn tr-btn-secondary inline-flex items-center gap-2"><Download className="h-4 w-4" /> GPX guide</a>
              <a href="/tutorial" className="tr-btn tr-btn-outline inline-flex items-center gap-2"><Film className="h-4 w-4" /> Tutorial</a>
            </div>
          </article>
          <div>
            <h2 className="text-3xl font-bold tracking-[-0.04em]">Common questions</h2>
            <div className="mt-6 divide-y divide-[var(--evergreen)]/12 border-y border-[var(--evergreen)]/12">
              {page.faq.map((item) => (
                <details key={item.question} className="group py-5">
                  <summary className="cursor-pointer list-none pr-8 font-bold marker:hidden">{item.question}</summary>
                  <p className="mt-3 max-w-[62ch] text-sm leading-6 text-[var(--evergreen-60)]">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[var(--trail-orange)] text-[var(--canvas)]">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center">
            <div><h2 className="text-3xl font-bold tracking-[-0.04em]">Your route already has a story.</h2><p className="mt-2 text-white/78">Turn it into a replay you can share.</p></div>
            <a href="/" onClick={() => trackSeoCta(page, 'final')} className="inline-flex items-center gap-2 whitespace-nowrap rounded-md bg-[var(--evergreen)] px-5 py-3 font-bold text-[var(--canvas)] transition-transform active:translate-y-px">
              Upload a GPX <Upload className="h-4 w-4" />
            </a>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="text-xl font-bold">Explore more route-video guides</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {relatedPages.map((related) => (
              <a key={related.slug} href={`/${related.slug}`} className="group border-t-2 border-[var(--evergreen)] pt-4 transition-colors hover:border-[var(--trail-orange)]">
                <span className="text-sm font-bold group-hover:text-[var(--trail-orange)]">{related.eyebrow}</span>
                <span className="mt-2 block text-xs leading-5 text-[var(--evergreen-60)]">{related.description}</span>
              </a>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--evergreen)]/12 px-4 py-8 text-xs text-[var(--evergreen-60)] sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <a href="/" className="font-bold text-[var(--evergreen)]">TrailReplay</a>
          <span>Free and open-source GPX storytelling</span>
          <a href="/privacy" className="font-semibold hover:underline">Privacy</a>
        </div>
      </footer>
    </div>
  );
}
