import { Globe } from 'lucide-react';
import { languageLabels } from '@/i18n/translations';
import { useI18n } from '@/i18n/useI18n';

export function LanguageSelectorCard() {
  const { t, language, setLanguage } = useI18n();

  return (
    <div className="rounded-[1.35rem] border border-[var(--evergreen)]/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(243,237,226,0.85))] p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--trail-orange-15)] text-[var(--trail-orange)]">
          <Globe className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-[var(--evergreen)]">
            {t('settings.language')}
          </h3>
          <p className="mt-1 text-xs text-[var(--evergreen-60)]">
            {t('tracks.languageHint')}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {Object.entries(languageLabels).map(([code, label]) => {
              const isActive = language === code;

              return (
                <button
                  key={code}
                  onClick={() => setLanguage(code as keyof typeof languageLabels)}
                  className={`
                    rounded-xl border px-3 py-2 text-sm font-semibold transition-colors
                    ${isActive
                      ? 'border-[var(--trail-orange)] bg-[var(--trail-orange)] text-[var(--canvas)] shadow-sm'
                      : 'border-[var(--evergreen)]/12 bg-white/85 text-[var(--evergreen)] hover:border-[var(--trail-orange)]/35 hover:bg-white'}
                  `}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
