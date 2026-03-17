import type { ReactNode } from 'react';
import { ArrowLeft, BookOpen, Download, ExternalLink, Sparkles } from 'lucide-react';

interface HelpLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function HelpLayout({ eyebrow, title, description, children }: HelpLayoutProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(193,101,47,0.16),transparent_32%),linear-gradient(180deg,#f8f4ee_0%,#fcfaf6_42%,#f3ede2_100%)] text-[var(--evergreen)]">
      <header className="sticky top-0 z-20 border-b border-[var(--evergreen)]/10 bg-[var(--canvas)]/88 text-[var(--evergreen)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--evergreen)]/12 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] shadow-sm transition-colors hover:border-[var(--trail-orange)]/40 hover:text-[var(--trail-orange)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to app
          </a>
          <div className="hidden items-center gap-2 rounded-full border border-[var(--evergreen)]/10 bg-white/80 px-2 py-1 md:flex">
            <HeaderChip href="/tutorial.html" icon={<BookOpen className="h-3.5 w-3.5" />} label="Tutorial" />
            <HeaderChip href="/gpx-download-guide.html" icon={<Download className="h-3.5 w-3.5" />} label="GPX guide" />
          </div>
          <div className="flex items-center gap-3">
            <img src="/media/images/simplelogo.png" alt="TrailReplay" className="h-9 w-9 rounded-md bg-white p-1 shadow-sm" />
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--trail-orange)]">{eyebrow}</div>
              <div className="text-sm font-bold">TrailReplay</div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:py-14">
        <section className="relative overflow-hidden rounded-[2rem] border border-[var(--evergreen)]/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,246,238,0.94))] px-6 py-8 shadow-[0_30px_90px_rgba(27,42,32,0.1)] sm:px-8 sm:py-10">
          <div className="absolute right-[-3rem] top-[-4rem] h-40 w-40 rounded-full bg-[var(--trail-orange)]/10 blur-3xl" />
          <div className="absolute bottom-[-3rem] left-[-2rem] h-32 w-32 rounded-full bg-[var(--evergreen)]/8 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--trail-orange)]/20 bg-[var(--trail-orange-15)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--trail-orange)]">
                <Sparkles className="h-3.5 w-3.5" />
                {eyebrow}
              </div>
              <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--evergreen-80)] sm:text-base">
                {description}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="/" className="tr-btn tr-btn-primary">Open TrailReplay</a>
                <a
                  href="https://github.com/alexalmansa/TrailReplay"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tr-btn tr-btn-secondary inline-flex items-center gap-2"
                >
                  GitHub
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <HeroStat
                label="Built for"
                value="Routes with story"
                body="Import, style, narrate, and export without leaving the browser."
              />
              <HeroStat
                label="Best with"
                value="Rich GPX files"
                body="Tracks with timestamps and elevation make the replay immediately stronger."
              />
            </div>
          </div>
        </section>

        {children}
      </main>
    </div>
  );
}

function HeaderChip({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--evergreen)] transition-colors hover:bg-[var(--trail-orange-15)] hover:text-[var(--trail-orange)]"
    >
      {icon}
      {label}
    </a>
  );
}

function HeroStat({ label, value, body }: { label: string; value: string; body: string }) {
  return (
    <article className="rounded-[1.35rem] border border-[var(--evergreen)]/10 bg-white/85 p-4 shadow-sm">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--trail-orange)]">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      <p className="mt-1 text-sm leading-6 text-[var(--evergreen-60)]">{body}</p>
    </article>
  );
}
