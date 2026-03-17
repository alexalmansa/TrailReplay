import { ca } from './locales/ca';
import { en } from './locales/en';
import { es } from './locales/es';

export const translations = {
  en,
  es,
  ca,
} as const;

export type LanguageCode = keyof typeof translations;
export type TranslationTree = (typeof translations)[LanguageCode];

export const languageLabels: Record<LanguageCode, string> = {
  en: 'English',
  es: 'Español',
  ca: 'Català',
};

export function getInitialLanguage(): LanguageCode {
  if (typeof window === 'undefined') return 'en';

  try {
    const saved = localStorage.getItem('trailReplayLang');
    if (saved && saved in translations) {
      return saved as LanguageCode;
    }
  } catch {
    // Ignore storage access failures and fall back to browser/default language.
  }

  const browser = navigator.language?.slice(0, 2) as LanguageCode | undefined;
  return browser && browser in translations ? browser : 'en';
}

function resolveTranslationValue(source: TranslationTree, key: string): string | undefined {
  return key
    .split('.')
    .reduce<unknown>((current, part) => {
      if (current && typeof current === 'object' && part in current) {
        return (current as Record<string, unknown>)[part];
      }
      return undefined;
    }, source) as string | undefined;
}

export function translate(
  lang: LanguageCode,
  key: string,
  params: Record<string, string | number> = {}
): string {
  const raw = resolveTranslationValue(translations[lang], key)
    ?? resolveTranslationValue(translations.en, key);

  if (typeof raw !== 'string') return key;

  return raw.replace(/\{(\w+)\}/g, (_match, token) => String(params[token] ?? `{${token}}`));
}
