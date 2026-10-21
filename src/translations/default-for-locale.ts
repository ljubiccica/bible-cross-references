import type { TranslationId } from '../core/datasets/ids.ts';
import { DEFAULT_LOCALE_ID, type LocaleId } from '../i18n/locale-id.ts';
import { LOCALE_TAGS } from '../i18n/locale-tags.ts';
import { DEFAULT_TRANSLATION_ID, TRANSLATION_MANIFESTS } from './registry.ts';

/**
 * The translation to start with for a language: its own, where the app has one. A reader whose
 * browser asks for Portuguese should arrive at a Portuguese Bible without being asked, and the
 * two settings part company only once they choose otherwise.
 *
 * In its own module, free of React and of anything that needs a `window`, because the build
 * imports it too: the HTML preloads a Bible before any of the app runs, and it has to preload
 * the same one this would choose.
 */
export function defaultTranslationFor(localeId: LocaleId): TranslationId {
  const base = (tag: string): string => tag.toLowerCase().split('-')[0] ?? '';
  const tag = base(LOCALE_TAGS[localeId].tag);
  // The default's own language is answered by the default, not by whichever manifest happens to
  // be listed first: the app ships more than one English text, and which of them an English
  // reader starts on is a decision, not an accident of ordering.
  if (tag === base(LOCALE_TAGS[DEFAULT_LOCALE_ID].tag)) {
    return DEFAULT_TRANSLATION_ID;
  }
  const match = TRANSLATION_MANIFESTS.find((manifest) => base(manifest.language) === tag);
  return match?.id ?? DEFAULT_TRANSLATION_ID;
}
