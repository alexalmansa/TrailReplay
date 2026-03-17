import { languageLabels } from '@/i18n/translations';
import { useI18n } from '@/i18n/useI18n';

export function LanguageSelectorCard() {
  const { t, language, setLanguage } = useI18n();

  return (
    <div className="rounded-[1.2rem] border border-[var(--evergreen)]/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(243,237,226,0.82))] p-4 shadow-sm">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--evergreen)]">
        {t('settings.language')}
      </h3>
      <p className="mt-1 text-xs leading-5 text-[var(--evergreen-60)]">
        {t('tracks.languageHint')}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {Object.entries(languageLabels).map(([code, label]) => {
          const isActive = language === code;

          return (
            <button
              key={code}
              onClick={() => setLanguage(code as keyof typeof languageLabels)}
              className={`
                rounded-full border px-3 py-1.5 text-xs font-semibold leading-none transition-colors
                ${isActive
                  ? 'border-[var(--trail-orange)] bg-[var(--trail-orange)] text-[var(--canvas)] shadow-sm'
                  : 'border-[var(--evergreen)]/12 bg-white/90 text-[var(--evergreen)] hover:border-[var(--trail-orange)]/35 hover:bg-white'}
              `}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
