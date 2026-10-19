/**
 * The names the app stores its preferences under.
 *
 * Kept free of anything that needs a `window`, because the build imports them too: the inline
 * preload script in `vite/site-head.ts` reads the stored language and translation before any
 * module has parsed, and a key typed out by hand there would drift the first time one is renamed.
 */
const PREFIX = 'bible-cross-references:';

/** The full storage key for a preference, for code that cannot call `readPreference`. */
export function preferenceKey(name: string): string {
  return PREFIX + name;
}

export const LOCALE_PREFERENCE = 'locale';
export const TRANSLATION_PREFERENCE = 'translation';

export const LOCALE_STORAGE_KEY = preferenceKey(LOCALE_PREFERENCE);
export const TRANSLATION_STORAGE_KEY = preferenceKey(TRANSLATION_PREFERENCE);
