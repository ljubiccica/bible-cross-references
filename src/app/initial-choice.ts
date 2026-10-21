import { isTranslationId, type TranslationId } from '../core/datasets/ids.ts';
import { isLocaleId, matchLocale, DEFAULT_LOCALE_ID, type LocaleId } from '../i18n/locale-id.ts';
import { defaultTranslationFor } from '../translations/default-for-locale.ts';

/** URL query parameter holding the interface language (`?lang=pt`). */
export const LOCALE_PARAM = 'lang';
/** URL query parameter holding the translation (`?t=kjv`). */
export const TRANSLATION_PARAM = 't';

/** The locale a URL names, or `null` if it names none the app has. */
export function localeFromParams(params: URLSearchParams): LocaleId | null {
  const id = params.get(LOCALE_PARAM);
  return id !== null && isLocaleId(id) ? id : null;
}

/** The translation a URL names, or `null` if it names none the app knows. */
export function translationFromParams(params: URLSearchParams): TranslationId | null {
  const id = params.get(TRANSLATION_PARAM);
  return id !== null && isTranslationId(id) ? id : null;
}

/** What a visit starts with, before anything has rendered. */
export interface InitialChoice {
  readonly locale: LocaleId;
  readonly translation: TranslationId;
}

/** The stored answers, read by whoever can reach storage. */
export interface StoredChoice {
  readonly locale: string | null;
  readonly translation: string | null;
}

/**
 * Which language and which Bible a visit opens with.
 *
 * Takes its inputs rather than reading them, so that there is exactly one copy of this rule. The
 * app calls it with `localStorage` and `navigator.languages`; the build calls it to generate the
 * inline script that preloads a dataset before any module has parsed, and a test runs that
 * script and compares its answer to this function. Two implementations of a rule drift — this
 * one did, and the preload spent an extra 3.8 MB on every shared link that named a translation
 * before anyone noticed.
 *
 * The order is the page's own language, then the address, then the reader's own stored choice,
 * then their browser. The translation is settled after the language because it falls back to the
 * language's own Bible.
 *
 * The page's own language comes first because it is not a preference but a fact: a file served
 * at `/pt/` was written in Portuguese, head and all, before anything here ran. Nothing below can
 * change what a crawler or a link preview already read, so nothing below may change what the
 * reader sees either.
 */
export function initialChoice(
  params: URLSearchParams,
  stored: StoredChoice,
  languages: readonly string[],
  pathLocale: LocaleId | null = null,
): InitialChoice {
  const storedLocale = stored.locale !== null && isLocaleId(stored.locale) ? stored.locale : null;
  const locale =
    pathLocale ??
    localeFromParams(params) ??
    storedLocale ??
    matchLocale(languages) ??
    DEFAULT_LOCALE_ID;
  const storedTranslation =
    stored.translation !== null && isTranslationId(stored.translation) ? stored.translation : null;
  const translation =
    translationFromParams(params) ?? storedTranslation ?? defaultTranslationFor(locale);
  return { locale, translation };
}
