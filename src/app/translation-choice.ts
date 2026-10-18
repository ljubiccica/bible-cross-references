import { useCallback } from 'react';
import { isTranslationId, type TranslationId } from '../core/datasets/ids.ts';
import { readPreference, useStringPreference } from '../shared/lib/preferences.ts';
import type { LocaleId } from '../i18n/locale-id.ts';
import { defaultTranslationFor } from '../translations/default-for-locale.ts';

export { defaultTranslationFor };

/**
 * Which translation to show. The URL decides, so a shared link reads the way its author read it;
 * without one, the reader's own last choice does, and failing that the default translation.
 */

/** URL query parameter holding the translation (`?t=kjv`). */
export const TRANSLATION_PARAM = 't';

/** Key of the stored choice, remembered between visits. */
const PREFERENCE_KEY = 'translation';

/** The translation a URL names, or `null` if it names none the app knows. */
export function translationFromParams(params: URLSearchParams): TranslationId | null {
  const id = params.get(TRANSLATION_PARAM);
  return id !== null && isTranslationId(id) ? id : null;
}

/** The reader's last choice, outside React (the app starts its download before it renders). */
export function readPreferredTranslation(localeId: LocaleId): TranslationId {
  const stored = readPreference(PREFERENCE_KEY);
  return stored !== null && isTranslationId(stored) ? stored : defaultTranslationFor(localeId);
}

/** The same choice, as a preference that lasts between visits. */
export function useTranslationPreference(
  localeId: LocaleId,
): readonly [TranslationId, (id: TranslationId) => void] {
  const [stored, store] = useStringPreference(PREFERENCE_KEY, defaultTranslationFor(localeId));
  const set = useCallback(
    (id: TranslationId) => {
      store(id);
    },
    [store],
  );
  return [isTranslationId(stored) ? stored : defaultTranslationFor(localeId), set];
}

/** What the app shows on arrival: the URL's translation, else the reader's, else the default. */
export function initialTranslationId(url: URL, localeId: LocaleId): TranslationId {
  return translationFromParams(url.searchParams) ?? readPreferredTranslation(localeId);
}
