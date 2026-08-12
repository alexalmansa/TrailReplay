import { describe, expect, it } from 'vitest';
import { translations } from './translations';

interface TranslationNode {
  readonly [key: string]: string | TranslationNode;
}

function getLeafKeys(source: TranslationNode, prefix = ''): string[] {
  return Object.entries(source).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [path] : getLeafKeys(value, path);
  });
}

function getLeafValues(source: TranslationNode, prefix = ''): Record<string, string> {
  return Object.fromEntries(Object.entries(source).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [[path, value]] : Object.entries(getLeafValues(value, path));
  }));
}

function getPlaceholders(value: string): string[] {
  return value.match(/\{\{?\w+\}?\}/g)?.sort() ?? [];
}

describe('translations', () => {
  it('keeps every locale aligned with the English translation contract', () => {
    const englishKeys = getLeafKeys(translations.en).sort();

    for (const [language, locale] of Object.entries(translations)) {
      expect(getLeafKeys(locale).sort(), language).toEqual(englishKeys);
    }
  });

  it('preserves interpolation placeholders in every locale', () => {
    const englishValues = getLeafValues(translations.en);

    for (const [language, locale] of Object.entries(translations)) {
      const localeValues = getLeafValues(locale);
      for (const [key, englishValue] of Object.entries(englishValues)) {
        expect(getPlaceholders(localeValues[key]), `${language}:${key}`)
          .toEqual(getPlaceholders(englishValue));
      }
    }
  });
});
