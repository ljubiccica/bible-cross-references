import { GENRES } from '../core/bible/genres.ts';
import { parsePassageOsisId, toPassageOsisId, type Passage } from '../core/bible/passage.ts';
import type { Versification } from '../core/bible/versification.ts';
import type { TranslationId } from '../core/datasets/ids.ts';
import { DEFAULT_TRANSLATION_ID } from '../translations/registry.ts';
import {
  DEFAULT_LINK_FILTER,
  VOTE_THRESHOLDS,
  type LinkFilter,
} from '../visualizations/shared/link-filter.ts';
import { LOCALE_PARAM, localeFromParams } from '../i18n/locale-choice.ts';
import type { LocaleId } from '../i18n/locale-id.ts';
import { DEFAULT_LOCALE_ID } from '../i18n/registry.ts';
import { translationFromParams, TRANSLATION_PARAM } from './translation-choice.ts';

/** URL query parameter holding the focused passage as an OSIS ID (`?ref=John.3.16`, `?ref=Isa.53`). */
const PASSAGE_PARAM = 'ref';
/** The minimum number of votes, when it isn't the default: a number, or `all` for no minimum. */
const VOTES_PARAM = 'votes';
/** Hidden genres, comma-separated, e.g. `hide=law,history`. */
const HIDE_PARAM = 'hide';

/** A page of the explorer: which view it shows, and where. */
export interface ViewRoute<Id extends string> {
  readonly id: Id;
  /** Path relative to the site's base: `''` for the home page, or e.g. `'threads/'`. */
  readonly path: string;
}

/** What the URL says: the active view, the focused passage, the link filter and the text. */
export interface ExplorerLocation<Id extends string> {
  readonly view: Id;
  readonly passage: Passage | null;
  readonly filter: LinkFilter;
  readonly translation: TranslationId;
  /**
   * The language the interface speaks. A link naming one reads as its author read it; a link
   * naming none reads in the recipient's own language, which is the case for English authors,
   * since `?lang=en` is left out to keep a plain link plain.
   */
  readonly locale: LocaleId;
}

/** Unknown thresholds and genres fall back to the defaults. */
function parseFilter(params: URLSearchParams): LinkFilter {
  const votes = params.get(VOTES_PARAM);
  const minVotes = votes === 'all' ? -Infinity : Number(votes);
  const hidden = new Set((params.get(HIDE_PARAM) ?? '').split(','));
  return {
    minVotes:
      votes !== null && VOTE_THRESHOLDS.includes(minVotes)
        ? minVotes
        : DEFAULT_LINK_FILTER.minVotes,
    hiddenGenres: new Set(GENRES.filter(({ id }) => hidden.has(id)).map(({ id }) => id)),
  };
}

/** `threads`, `threads/` and `threads/index.html` all name the `threads/` page. */
function normalizePath(path: string): string {
  const withoutIndex = path.endsWith('index.html') ? path.slice(0, -'index.html'.length) : path;
  return withoutIndex === '' || withoutIndex.endsWith('/') ? withoutIndex : `${withoutIndex}/`;
}

/**
 * Reads the view, the passage, the filter and the translation from a URL. Unknown paths show the
 * home view (the first route), an unknown passage shows none, and unknown filter values keep the
 * defaults. A URL naming no translation (or one the app does not have) shows `defaultTranslation`,
 * which is the reader's own choice from an earlier visit.
 */
export function parseExplorerUrl<Id extends string>(
  url: URL,
  base: string,
  routes: readonly [ViewRoute<Id>, ...ViewRoute<Id>[]],
  versification: Versification,
  defaultTranslation: TranslationId,
  defaultLocale: LocaleId,
): ExplorerLocation<Id> {
  const path = url.pathname.startsWith(base) ? normalizePath(url.pathname.slice(base.length)) : '';
  const route = routes.find((candidate) => candidate.path === path) ?? routes[0];
  const id = url.searchParams.get(PASSAGE_PARAM);
  return {
    view: route.id,
    passage: id === null ? null : (parsePassageOsisId(id, versification) ?? null),
    filter: parseFilter(url.searchParams),
    translation: translationFromParams(url.searchParams) ?? defaultTranslation,
    locale: localeFromParams(url.searchParams) ?? defaultLocale,
  };
}

/**
 * The translation a URL need not name for this reader: the one they land on without a `?t=`. For
 * a reader on the default translation that is the default, and their links stay plain; for anyone
 * else nothing may be left out, or the URL would reopen on a different text than it shows.
 */
export function plainTranslationFor(preferred: TranslationId): TranslationId | null {
  return preferred === DEFAULT_TRANSLATION_ID ? DEFAULT_TRANSLATION_ID : null;
}

/**
 * The URL (path and query, without the origin) that shows a passage in a view with a filter.
 * Defaults are left out, so a plain link stays plain.
 */
export function explorerUrl(
  route: ViewRoute<string>,
  {
    passage,
    filter,
    translation,
    locale,
  }: Pick<ExplorerLocation<string>, 'passage' | 'filter' | 'translation' | 'locale'>,
  base: string,
  versification: Versification,
  /**
   * The translation the URL need not name, because a reader opening it would land on that one
   * anyway: their own standing choice. `null` names the translation whatever it is, which is what
   * a link meant for someone else needs — their choice must not quietly replace its text.
   */
  omitTranslation: TranslationId | null = DEFAULT_TRANSLATION_ID,
): string {
  const params = new URLSearchParams();
  if (passage !== null) {
    params.set(PASSAGE_PARAM, toPassageOsisId(passage, versification));
  }
  if (translation !== omitTranslation) {
    params.set(TRANSLATION_PARAM, translation);
  }
  if (locale !== DEFAULT_LOCALE_ID) {
    params.set(LOCALE_PARAM, locale);
  }
  if (filter.minVotes !== DEFAULT_LINK_FILTER.minVotes) {
    params.set(VOTES_PARAM, filter.minVotes === -Infinity ? 'all' : String(filter.minVotes));
  }
  if (filter.hiddenGenres.size > 0) {
    const hidden = GENRES.filter(({ id }) => filter.hiddenGenres.has(id)).map(({ id }) => id);
    params.set(HIDE_PARAM, hidden.join(','));
  }
  // Commas are fine in a query and far more readable than %2C.
  const query = params.toString().replaceAll('%2C', ',');
  return `${base}${route.path}${query === '' ? '' : `?${query}`}`;
}
