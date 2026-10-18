import { useMemo } from 'react';
import type { GenreId } from '../core/bible/genres.ts';
import { formatInteger, formatShare } from '../shared/lib/format.ts';
import type { BookNames } from './books/types.ts';
import type { InstallGuides } from './install/types.ts';
import { useLocalePreference } from './locale-choice.ts';
import type { LocaleId } from './locale-id.ts';
import { DEFAULT_LOCALE_ID, getLocale, type Locale } from './registry.ts';
import { createTranslator, type Translator } from './translate.ts';

/** Everything a component needs to speak the reader's language. */
export interface Localization {
  readonly locale: Locale;
  /** One message, e.g. `t('panel.close')`. */
  readonly t: Translator;
  readonly books: BookNames;
  readonly genreName: (genre: GenreId) => string;
  readonly install: InstallGuides;
  /** A count with the reader's own thousands separator. */
  readonly n: (value: number) => string;
  /** A share as a percentage, in the reader's own notation. */
  readonly share: (part: number, whole: number) => string;
}

const built = new Map<LocaleId, Localization>();

/** Builds a locale's helpers once and keeps them, so components get a stable object. */
export function localizationFor(id: LocaleId): Localization {
  const existing = built.get(id);
  if (existing) {
    return existing;
  }
  const locale = getLocale(id);
  const localization: Localization = {
    locale,
    t: createTranslator(locale),
    books: locale.books,
    genreName: (genre) => locale.genres[genre],
    install: locale.install,
    n: (value) => formatInteger(value, locale.tag),
    share: (part, whole) => formatShare(part, whole, locale.tag),
  };
  built.set(id, localization);
  return localization;
}

/** English, for the parts of the project that stay in the language the code is written in. */
export const ENGLISH = localizationFor(DEFAULT_LOCALE_ID);

/**
 * The reader's language.
 *
 * It comes from one module-level store rather than a React context, so every component — the
 * install dialog included, which renders outside the app's own tree — sees a change at once with
 * nothing to thread through.
 *
 * That store is this visit's, not the saved preference: unlike the translation, a language change
 * does **not** reach another open tab. The address decides the language, and two tabs can be at
 * two addresses, so following a Portuguese link in one tab leaves the other where it was.
 */
export function useLocalization(): Localization {
  const [localeId] = useLocalePreference();
  return useMemo(() => localizationFor(localeId), [localeId]);
}
