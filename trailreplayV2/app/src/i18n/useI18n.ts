import { useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { translate, translations, type LanguageCode } from './translations';

export function useI18n() {
  const language = useAppStore((state) => state.settings.language);
  const setSettings = useAppStore((state) => state.setSettings);

  const setLanguage = useCallback((lang: LanguageCode) => {
    setSettings({ language: lang });
    try {
      localStorage.setItem('trailReplayLang', lang);
    } catch (_) {}
  }, [setSettings]);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    return translate(language, key, params);
  }, [language]);

  return {
    t,
    language,
    setLanguage,
    languages: Object.keys(translations) as LanguageCode[],
  };
}
