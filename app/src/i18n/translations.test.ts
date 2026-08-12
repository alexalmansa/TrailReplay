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

describe('translations', () => {
  it('keeps every locale aligned with the English translation contract', () => {
    const englishKeys = getLeafKeys(translations.en).sort();

    for (const [language, locale] of Object.entries(translations)) {
      expect(getLeafKeys(locale).sort(), language).toEqual(englishKeys);
    }
  });
});
