import { DEFAULT_LOCALE_ID, isLocaleId, type LocaleId } from './locale-id.ts';

/**
 * Where a language lives in the address.
 *
 * The language is a path segment — `/bible-cross-references/pt/` — rather than only a query
 * parameter, because a static host serves one file per path and nothing per query. A crawler, and
 * every social network's link preview, reads the file it is served and never runs the app, so a
 * page that is Portuguese only after JavaScript has run previews in English wherever it is
 * shared. One file per language is what fixes that, and a path is the only thing that selects it.
 *
 * The default language keeps the bare path it has always had: `?lang=pt` links that readers
 * saved before this existed still name their language in the query, and still work, so nothing
 * that was ever shared breaks. See `localeUpgradeUrl` for how those links quietly become the
 * new shape.
 */

/** The path segment a language adds, e.g. `pt/`. Empty for the default language, which is at the root. */
export function localePathSegment(locale: LocaleId): string {
  return locale === DEFAULT_LOCALE_ID ? '' : `${locale}/`;
}

/** A path split into the language it names and what is left: `/base/pt/threads/` → `pt`, `threads/`. */
export interface LocalePath {
  /** The language the path names, or `null` where it names none (the default language's pages). */
  readonly locale: LocaleId | null;
  /** The rest of the path, relative to the base and with the language segment removed. */
  readonly rest: string;
}

/**
 * Splits the language segment off a path.
 *
 * `/en/` is deliberately not a language path: English is served at the root, there is no `/en/`
 * file to serve, and treating it as one would invent a URL the build never writes.
 */
export function splitLocalePath(pathname: string, base: string): LocalePath {
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : '';
  const slash = rest.indexOf('/');
  const head = slash === -1 ? rest : rest.slice(0, slash);
  if (head !== '' && head !== DEFAULT_LOCALE_ID && isLocaleId(head)) {
    return { locale: head, rest: slash === -1 ? '' : rest.slice(slash + 1) };
  }
  return { locale: null, rest };
}

/** The language a path names, or `null` for the default language's pages. */
export function localeFromPath(pathname: string, base: string): LocaleId | null {
  return splitLocalePath(pathname, base).locale;
}

/**
 * Where a language's web app manifest is published, e.g. `manifest.pt.webmanifest`.
 *
 * Shared with the build, which emits one per language, and with the app, which repoints the
 * `<link rel="manifest">` when a reader changes language: choosing Portuguese pushes a new
 * address without reloading the document, so without this the page would still be offering the
 * English manifest and installing from it would give an app named in English that opens at the
 * English root.
 */
export function localeManifestFileName(locale: LocaleId): string {
  return locale === DEFAULT_LOCALE_ID ? 'manifest.webmanifest' : `manifest.${locale}.webmanifest`;
}
