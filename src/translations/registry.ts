import type { TranslationId } from '../core/datasets/ids.ts';
import type { TranslationManifest } from './translation-manifest.ts';

export const TRANSLATIONS: Readonly<Record<TranslationId, TranslationManifest>> = {
  bsb: {
    id: 'bsb',
    name: 'Berean Standard Bible',
    abbreviation: 'BSB',
    language: 'en',
    direction: 'ltr',
    versification: 'kjv',
    license: { name: 'Public domain', url: 'https://berean.bible/terms.htm' },
    attribution: 'Scripture text: Berean Standard Bible (BSB), dedicated to the public domain.',
    homepage: 'https://berean.bible/',
    access: 'bundled',
  },
  'chr1914-sl': {
    id: 'chr1914-sl',
    name: 'Slovenščina — Chráska 1914 (osnutek)',
    abbreviation: 'CHR 1914 draft',
    language: 'sl',
    direction: 'ltr',
    versification: 'kjv',
    license: {
      name: 'Local OCR preview; distribution status unverified',
      url: 'https://www.dlib.si/',
    },
    attribution: 'Slovenian text: Chráska 1914, local OCR draft.',
    homepage: 'https://www.dlib.si/',
    access: 'bundled',
    previewVerseCount: 31102,
    previewNotice:
      'Slovenian draft · 31,102 of 31,102 verses available. Unresolved verses are marked. Text is still being reviewed.',
    emptyVerseNote: 'Besedilo še ni pripravljeno — preverjanje OCR in številčenja še poteka.',
  },
};

/** The translation shown when the user has not picked one. */
export const DEFAULT_TRANSLATION_ID: TranslationId = 'bsb';

export function getTranslationManifest(id: TranslationId): TranslationManifest {
  return TRANSLATIONS[id];
}
