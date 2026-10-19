import { useCallback, useSyncExternalStore } from 'react';
import { LOCALE_PARAM, localeFromParams } from '../app/initial-choice.ts';
import { LOCALE_PREFERENCE } from '../shared/lib/preference-keys.ts';
import { readPreference, writePreference } from '../shared/lib/preferences.ts';
import { isLocaleId, matchLocale, type LocaleId } from './locale-id.ts';
import { DEFAULT_LOCALE_ID } from './registry.ts';

/**
 * Which language the interface speaks. The URL decides, so a shared link reads the way its
 * author read it; without one, the reader's own last choice does; and failing that, whatever
 * their browser asks for.
 */

/** URL query parameter holding the interface language (`?lang=pt`). */
export { LOCALE_PARAM, localeFromParams };

/** Key of the stored choice, remembered between visits. */
const PREFERENCE_KEY = LOCALE_PREFERENCE;

/** The reader's last choice, outside React (the app needs it before it renders). */
export function readPreferredLocale(): LocaleId | null {
  const stored = readPreference(PREFERENCE_KEY);
  return stored !== null && isLocaleId(stored) ? stored : null;
}

/**
 * The language in use right now.
 *
 * It is kept apart from the stored one on purpose. A link that names a language should be read
 * in it, but following somebody else's link is not the same as choosing: it would be rude for a
 * Portuguese link shared with an English reader to change what that reader sees from then on.
 * So the address sets this, and only an explicit choice is written to storage — which is how
 * `?t=` already treats the translation.
 */
let active: LocaleId = DEFAULT_LOCALE_ID;
const listeners = new Set<() => void>();

/**
 * The reader's own language, which no address changes: the choice they stored, else what their
 * browser asks for, else English.
 *
 * This is what a URL naming no language falls back to. The active locale cannot serve that role,
 * because the address sets it — using it would make the fallback circular, and an address with
 * no `?lang=` would mean "whatever the last address meant" instead of "whatever this reader
 * prefers". Going Forward to an entry made in English is exactly that case.
 */
let preferred: LocaleId = DEFAULT_LOCALE_ID;
const preferredListeners = new Set<() => void>();

function subscribePreferred(listener: () => void): () => void {
  preferredListeners.add(listener);
  return () => {
    preferredListeners.delete(listener);
  };
}

/** Records the reader's own language, without touching what is on screen right now. */
export function setPreferredLocale(id: LocaleId): void {
  if (preferred === id) {
    return;
  }
  preferred = id;
  for (const listener of preferredListeners) {
    listener();
  }
}

/** The reader's own language, for a URL that names none. */
export function usePreferredLocale(): LocaleId {
  return useSyncExternalStore(
    subscribePreferred,
    () => preferred,
    () => DEFAULT_LOCALE_ID,
  );
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Sets the language for this visit, without recording it as a choice. */
export function setActiveLocale(id: LocaleId): void {
  if (active === id) {
    return;
  }
  active = id;
  for (const listener of listeners) {
    listener();
  }
}

/** The language in use, and how to change it — which also remembers it for the next visit. */
export function useLocalePreference(): readonly [LocaleId, (id: LocaleId) => void] {
  const current = useSyncExternalStore(
    subscribe,
    () => active,
    () => DEFAULT_LOCALE_ID,
  );
  const set = useCallback((id: LocaleId) => {
    writePreference(PREFERENCE_KEY, id);
    setPreferredLocale(id);
    setActiveLocale(id);
  }, []);
  return [current, set];
}

/**
 * What the app speaks on arrival: the URL's language, else the reader's stored one, else their
 * browser's, else English.
 */
export function initialLocaleId(url: URL, languages: readonly string[]): LocaleId {
  return localeFromParams(url.searchParams) ?? initialPreferredLocale(languages);
}

/** The same without the address: what this reader prefers, whatever link they happened to open. */
export function initialPreferredLocale(languages: readonly string[]): LocaleId {
  return readPreferredLocale() ?? matchLocale(languages) ?? DEFAULT_LOCALE_ID;
}
