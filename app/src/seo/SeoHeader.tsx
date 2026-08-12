import { ArrowLeft, BookOpen } from 'lucide-react';
import { useI18n } from '@/i18n/useI18n';
import { trackEvent } from '@/utils/analytics';
import type { SeoLandingPageConfig } from './seoPages';

export function SeoHeader({ page }: { page: SeoLandingPageConfig }) {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--evergreen)] bg-[var(--evergreen)] text-[var(--canvas)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <a
          href="/"
          onClick={() => trackEvent('seo_cta_clicked', {
            landing_page: page.slug,
            cta_location: 'header',
            target_page: 'app',
          })}
          className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] shadow-sm transition-colors hover:border-white/18 hover:bg-black/20"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('help.common.backToApp')}
        </a>

        <a
          href="/tutorial"
          onClick={() => trackEvent('help_cta_clicked', {
            cta_location: 'seo_header',
            target_page: 'tutorial',
          })}
          className="hidden items-center gap-2 rounded-xl bg-[var(--canvas)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--evergreen)] shadow-sm transition-colors hover:bg-white md:inline-flex"
        >
          <BookOpen className="h-3.5 w-3.5" />
          {t('app.tutorial')}
        </a>

        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/media/images/simplelogo.png"
            alt="TrailReplay"
            className="h-9 w-9 shrink-0 rounded-md bg-white p-1 shadow-sm ring-1 ring-white/10"
          />
          <div className="min-w-0 text-right">
            <div className="max-w-40 truncate text-[11px] uppercase tracking-[0.18em] text-white/60">{page.eyebrow}</div>
            <div className="text-sm font-bold text-[var(--canvas)]">TrailReplay</div>
          </div>
        </div>
      </div>
    </header>
  );
}
