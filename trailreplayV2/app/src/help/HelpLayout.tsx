import type { ReactNode } from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';

interface HelpLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function HelpLayout({ eyebrow, title, description, children }: HelpLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--evergreen)]">
      <header className="border-b-2 border-[var(--evergreen)] bg-[var(--evergreen)] text-[var(--canvas)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <a
            href="/app"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to app
          </a>
          <div className="flex items-center gap-3">
            <img src="/app/media/images/simplelogo.png" alt="TrailReplay" className="h-9 w-9 rounded-md bg-white p-1" />
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">{eyebrow}</div>
              <div className="text-sm font-bold">TrailReplay v2</div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:py-14">
        <section className="rounded-[2rem] border-2 border-[var(--evergreen)] bg-gradient-to-br from-[var(--canvas)] via-[var(--trail-orange-15)] to-[var(--canvas)] px-6 py-8 shadow-[0_24px_80px_rgba(27,42,32,0.08)] sm:px-8 sm:py-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--trail-orange)]">{eyebrow}</p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--evergreen-80)] sm:text-base">
            {description}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="/app" className="tr-btn tr-btn-primary">Open TrailReplay</a>
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
        </section>

        {children}
      </main>
    </div>
  );
}
