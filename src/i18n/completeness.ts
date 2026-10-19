import {
  bookNameCollisions,
  contestedSpellings,
  normalizeBookName,
} from '../core/bible/book-lookup.ts';
import { BOOKS } from '../core/bible/books.ts';
import { GENRES, type GenreId } from '../core/bible/genres.ts';
import { parseReference } from '../core/bible/reference-parse.ts';
import { KJV_VERSIFICATION } from '../core/bible/versification.ts';
import { INSTALL_PLATFORMS } from '../shared/lib/install-platform.ts';
import type { AcceptanceCase } from './books/acceptance.ts';
import type { BookNames } from './books/types.ts';
import type { InstallGuides } from './install/types.ts';
import { en } from './messages/en.ts';
import type { LocaleMessages } from './messages/types.ts';
import { SITE_PAGE_IDS, type SiteCopy } from './site-copy.ts';

/**
 * What it takes for a language to be finished, checked.
 *
 * The compiler already makes a language's shape impossible to get wrong: a `Record<LocaleId, …>`
 * names every place a new id has to appear, and a message catalogue typed as `Messages` cannot
 * leave a key out. None of that can see whether the words are blank, whether they are still the
 * English ones, or whether `Jo` finds the book a Brazilian means — so this does.
 *
 * Written as functions over data rather than over `LOCALE_IDS`, for two reasons: a deliberately
 * broken fixture can be fed to the same checks, so that the gate is known to fail and not merely
 * believed to pass; and the scaffold (`npm run locale:new`) can report what is left to do using
 * exactly the rules CI will apply.
 */

/** One thing wrong with a language, named precisely enough to go and fix it. */
export interface Problem {
  /** Which part of the language: `messages`, `books`, `genres`, `install`, `site`, `acceptance`. */
  readonly where: string;
  /** The key, book id, page or case at fault. */
  readonly key: string;
  readonly detail: string;
}

/** Everything one language has to provide. */
export interface LocaleBundle {
  readonly id: string;
  readonly tag: string;
  readonly endonym: string;
  readonly messages: LocaleMessages;
  readonly books: BookNames;
  readonly genres: Readonly<Record<GenreId, string>>;
  readonly install: InstallGuides;
  readonly site: SiteCopy;
  readonly acceptance: readonly AcceptanceCase[];
  /** The same for the default language, which this one is measured against. */
  readonly english: {
    readonly endonym: string;
    readonly messages: LocaleMessages;
    readonly books: BookNames;
    readonly genres: Readonly<Record<GenreId, string>>;
    readonly install: InstallGuides;
    readonly site: SiteCopy;
  };
  /** `<where>.<key>` entries this language is allowed to leave identical to English. */
  readonly sameAsEnglish: Readonly<Record<string, string>>;
  /** True for the language the source is written in, which is not compared against itself. */
  readonly isDefault: boolean;
}

/** The fewest acceptance cases a language may ship, so that an empty table cannot pass. */
export const MINIMUM_ACCEPTANCE_CASES = 5;
/** A description short enough to be cut off in a result page helps nobody; nor does an essay. */
export const DESCRIPTION_LENGTH = { min: 50, max: 320 } as const;
/** A home screen gives a name about this much room before it truncates it. */
export const SHORT_NAME_MAX = 16;

function blank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim() === '';
}

/** `Emphasized` and plain strings alike, as one string, so two of them can be compared. */
function flatten(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((part: unknown) =>
        typeof part === 'string'
          ? part
          : typeof part === 'object' && part !== null && 'strong' in part
            ? String(part.strong)
            : '',
      )
      .join('');
  }
  return '';
}

/** Distinctive stand-ins for a message's arguments, so a dropped one is visible in the result. */
function probes(count: number): string[] {
  return Array.from({ length: count }, (_value, index) => `«arg${String(index + 1)}»`);
}

function checkMessages(bundle: LocaleBundle): Problem[] {
  const problems: Problem[] = [];
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    const where = 'messages';
    const value: unknown = bundle.messages[key];
    const english: unknown = en[key];
    if (value === undefined) {
      problems.push({ where, key, detail: 'missing: every message has to be translated' });
      continue;
    }
    if (typeof english === 'function') {
      if (typeof value !== 'function') {
        problems.push({ where, key, detail: 'should take arguments, as the English one does' });
        continue;
      }
      const args = probes(english.length);
      const englishText = flatten((english as (...rest: string[]) => unknown)(...args));
      let produced: unknown;
      try {
        produced = (value as (...rest: string[]) => unknown)(...args);
      } catch (error) {
        problems.push({
          where,
          key,
          detail: `threw when called: ${error instanceof Error ? error.message : String(error)}`,
        });
        continue;
      }
      const text = flatten(produced);
      if (text.trim() === '') {
        problems.push({ where, key, detail: 'produced nothing' });
        continue;
      }
      // Which arguments have to come out is decided by the English message, not by counting
      // them: several take a number purely to choose a plural form and never print it, and a
      // translation is right to drop that one too. Anything English does show, every language
      // has to show, or a reader is told the book is unknown without being told which book.
      for (const arg of args.filter((probe) => englishText.includes(probe))) {
        if (!text.includes(arg)) {
          problems.push({
            where,
            key,
            detail: `drops ${arg}: the English message shows it, so this one has to as well`,
          });
        }
      }
      if (text === englishText) {
        problems.push(...identical(bundle, where, key));
      }
      continue;
    }
    if (blank(value)) {
      problems.push({ where, key, detail: 'blank' });
      continue;
    }
    if (value === english) {
      problems.push(...identical(bundle, where, key));
    }
  }
  return problems;
}

function allowed(bundle: LocaleBundle, key: string): boolean {
  return Object.keys(bundle.sameAsEnglish).includes(key);
}

function identicalDetail(key: string): string {
  return `still the English words. If that is right, say why in src/i18n/same-as-english.ts under "${key}".`;
}

/** Reports a value left identical to English, unless this language has said why it is. */
function identical(bundle: LocaleBundle, where: string, key: string, suffix = ''): Problem[] {
  const full = `${where}.${key}${suffix}`;
  return bundle.isDefault || allowed(bundle, full)
    ? []
    : [{ where, key: `${key}${suffix}`, detail: identicalDetail(full) }];
}

function checkBooks(bundle: LocaleBundle): Problem[] {
  const problems: Problem[] = [];
  const where = 'books';
  for (const { id } of BOOKS) {
    const book = bundle.books[id];
    if (blank(book.name)) {
      problems.push({ where, key: id, detail: 'blank name' });
    }
    if (book.abbreviation !== undefined && blank(book.abbreviation)) {
      problems.push({ where, key: id, detail: 'blank abbreviation' });
    }
    if (book.aliases.some((alias) => blank(alias))) {
      problems.push({ where, key: id, detail: 'blank alias' });
    }
    if (book.name === bundle.english.books[id].name) {
      problems.push(...identical(bundle, where, id, '.name'));
    }
  }
  const names = BOOKS.map(({ id }) => bundle.books[id].name);
  for (const [index, name] of names.entries()) {
    if (names.indexOf(name) !== index) {
      problems.push({ where, key: name, detail: 'two books share this name' });
    }
  }
  for (const collision of bookNameCollisions(bundle.books)) {
    // `"jo: John and Jonah"` — the spelling, then the two books that claim it.
    const [spelling = collision, claimants = ''] = collision.split(': ');
    problems.push({
      where,
      key: spelling,
      detail: `two books answer to this spelling: ${claimants}`,
    });
  }
  return problems;
}

function checkGenres(bundle: LocaleBundle): Problem[] {
  const problems: Problem[] = [];
  const where = 'genres';
  const seen = new Map<string, GenreId>();
  for (const { id } of GENRES) {
    const name = bundle.genres[id];
    if (blank(name)) {
      problems.push({ where, key: id, detail: 'blank' });
      continue;
    }
    const other = seen.get(name);
    if (other !== undefined) {
      problems.push({ where, key: id, detail: `shares its name with ${other}` });
    }
    seen.set(name, id);
    if (name === bundle.english.genres[id]) {
      problems.push(...identical(bundle, where, id));
    }
  }
  return problems;
}

function checkInstall(bundle: LocaleBundle): Problem[] {
  const problems: Problem[] = [];
  const where = 'install';
  for (const platform of INSTALL_PLATFORMS) {
    const guide = bundle.install[platform];
    if (blank(guide.label)) {
      problems.push({ where, key: platform, detail: 'blank label' });
    }
    if (guide.steps.length === 0) {
      problems.push({ where, key: platform, detail: 'no steps' });
    }
    for (const [index, step] of guide.steps.entries()) {
      if (step.text === null || step.text === undefined || step.text === '') {
        problems.push({ where, key: `${platform}.${String(index)}`, detail: 'step says nothing' });
      }
    }
    // Only the device's name can be compared — the steps themselves are rich text naming real
    // buttons, and comparing those would mean comparing React trees. A translator who has not
    // started will not have changed this either.
    if (guide.label === bundle.english.install[platform].label) {
      problems.push(...identical(bundle, where, platform, '.label'));
    }
  }
  return problems;
}

function checkSite(bundle: LocaleBundle): Problem[] {
  const problems: Problem[] = [];
  const where = 'site';
  const { site } = bundle;
  if (blank(site.siteName)) {
    problems.push({ where, key: 'siteName', detail: 'blank' });
  } else if (site.siteName === bundle.english.site.siteName) {
    // The name under `og:site_name`, in the structured data and on the home screen.
    problems.push(...identical(bundle, where, 'siteName'));
  }
  // `hreflang` and `og:locale` are checked against the language they belong to, not only for
  // being well-formed: a Spanish page declaring `hreflang="de"` is valid BCP 47 and completely
  // wrong, and search engines would hand Spanish readers to the German cluster.
  for (const [key, tag] of [
    ['hreflang', site.hreflang],
    ['ogLocale', site.ogLocale],
  ] as const) {
    const base = tag.toLowerCase().split(/[-_]/)[0] ?? '';
    if (base !== bundle.id) {
      problems.push({
        where,
        key,
        detail: `${tag} is not ${bundle.id}: a language has to declare itself`,
      });
    }
  }
  for (const [key, tag] of [
    ['hreflang', site.hreflang],
    ['ogLocale', site.ogLocale.replace('_', '-')],
  ] as const) {
    try {
      Intl.getCanonicalLocales(tag);
    } catch {
      problems.push({ where, key, detail: `${tag} is not a valid language tag` });
    }
  }
  if (!site.ogLocale.includes('_')) {
    problems.push({
      where,
      key: 'ogLocale',
      detail: 'Open Graph wants language and territory, e.g. pt_BR',
    });
  }
  for (const id of SITE_PAGE_IDS) {
    const page = site.pages[id];
    for (const [field, value] of Object.entries(page)) {
      if (blank(value)) {
        problems.push({ where, key: `${id}.${field}`, detail: 'blank' });
      }
    }
    if (
      page.description.length < DESCRIPTION_LENGTH.min ||
      page.description.length > DESCRIPTION_LENGTH.max
    ) {
      problems.push({
        where,
        key: `${id}.description`,
        detail: `${String(page.description.length)} characters; wanted ${String(DESCRIPTION_LENGTH.min)}–${String(DESCRIPTION_LENGTH.max)}`,
      });
    }
    for (const field of ['title', 'description', 'noscript'] as const) {
      if (page[field] === bundle.english.site.pages[id][field]) {
        problems.push(...identical(bundle, where, id, `.${field}`));
      }
    }
  }
  for (const [field, value] of Object.entries(site.manifest)) {
    if (blank(value)) {
      problems.push({ where, key: `manifest.${field}`, detail: 'blank' });
      continue;
    }
    // The installed app's name and description, published as its own `manifest.<id>.webmanifest`
    // and shown under a home-screen icon. Exactly the kind of field a stub leaves in English.
    if (value === bundle.english.site.manifest[field as keyof typeof site.manifest]) {
      problems.push(...identical(bundle, where, 'manifest', `.${field}`));
    }
  }
  if (site.manifest.shortName.length > SHORT_NAME_MAX) {
    problems.push({
      where,
      key: 'manifest.shortName',
      detail: `${String(site.manifest.shortName.length)} characters; a home screen shows about ${String(SHORT_NAME_MAX)}`,
    });
  }
  const image = site.socialImage;
  if (!/\.(jpe?g|png)$/.test(image.file)) {
    problems.push({ where, key: 'socialImage.file', detail: 'should be a .jpg or .png' });
  }
  if (blank(image.alt)) {
    problems.push({
      where,
      key: 'socialImage.alt',
      detail: 'blank: it is text, and it is read aloud',
    });
  }
  if (image.from !== undefined && image.placeholder !== true) {
    problems.push({
      where,
      key: 'socialImage',
      detail: 'published from another language’s picture without saying so: set placeholder: true',
    });
  }
  if (image.placeholder === true && image.from === undefined) {
    problems.push({
      where,
      key: 'socialImage',
      detail: 'marked a placeholder but has no picture to stand in for it: set from',
    });
  }
  if (!bundle.isDefault && image.file === bundle.english.site.socialImage.file) {
    problems.push({
      where,
      key: 'socialImage.file',
      detail: 'shares English’s file, so both languages preview the same URL; give it its own name',
    });
  }
  if (image.alt === bundle.english.site.socialImage.alt) {
    problems.push(...identical(bundle, where, 'socialImage', '.alt'));
  }
  return problems;
}

/** The book part of a typed reference: `1º Coríntios 13` → `1º Coríntios`. */
function bookPartOf(typed: string): string {
  return typed.replace(/[\s.:]*\d+(?:[\s.:]+\d+)?\s*$/u, '').trim();
}

function checkAcceptance(bundle: LocaleBundle): Problem[] {
  const problems: Problem[] = [];
  const where = 'acceptance';
  if (bundle.acceptance.length < MINIMUM_ACCEPTANCE_CASES) {
    problems.push({
      where,
      key: bundle.id,
      detail: `${String(bundle.acceptance.length)} cases; wanted at least ${String(MINIMUM_ACCEPTANCE_CASES)}, checked by somebody who reads the language`,
    });
  }
  // What a reader actually typed, normalized but with its accents left on — `Jo` stays `jo` and
  // `Jó` stays `jó`. Folding here instead was the hole this used to have: `Jó 1:1` folds to
  // `jo`, so the accented case alone satisfied the requirement, and the unaccented spelling —
  // the one whose owner nothing else in the build pins — went unchecked. Removing `Jo 3:16`
  // then left the whole suite green while `Jo` quietly resolved to Jó.
  const pinned = new Set(
    bundle.acceptance.map((entry) => normalizeBookName(bookPartOf(entry.typed))),
  );
  for (const spelling of contestedSpellings(bundle.books)) {
    if (!pinned.has(spelling)) {
      problems.push({
        where,
        key: spelling,
        detail: `two books reach “${spelling}” once its accents are folded away, so which book a reader typing it without the accent reaches is decided by whichever claims that exact spelling — and nothing else here would notice if that changed hands. Add a case typing “${spelling}” itself to src/i18n/books/acceptance.ts.`,
      });
    }
  }
  for (const entry of bundle.acceptance) {
    if (blank(entry.note)) {
      problems.push({ where, key: entry.typed, detail: 'no note saying why this case is here' });
    }
    const actual = resolve(entry.typed, bundle.books);
    if (actual !== entry.expect) {
      problems.push({
        where,
        key: entry.typed,
        detail: `expected ${entry.expect}, got ${actual}`,
      });
    }
  }
  return problems;
}

/** What the real parser makes of a typed reference, in the shape an acceptance case states. */
export function resolve(typed: string, names: BookNames): string {
  const result = parseReference(typed, KJV_VERSIFICATION, names);
  if (result.ok) {
    const { book, chapter, verse } = result.reference;
    return verse === undefined
      ? `${book}.${String(chapter)}`
      : `${book}.${String(chapter)}.${String(verse)}`;
  }
  if (result.error.kind === 'ambiguous-book') {
    return `ambiguous:${result.error.candidates.join(',')}`;
  }
  if (result.error.kind === 'unknown-book') {
    return 'unknown';
  }
  return result.error.kind;
}

/** The language's own name and tag, which the picker and `<html lang>` show readers. */
function checkIdentity(bundle: LocaleBundle): Problem[] {
  const problems: Problem[] = [];
  const where = 'locale';
  if (blank(bundle.endonym)) {
    problems.push({ where, key: 'endonym', detail: 'blank: the picker shows this to its reader' });
  } else if (bundle.endonym === bundle.english.endonym) {
    problems.push(...identical(bundle, where, 'endonym'));
  }
  const base = bundle.tag.toLowerCase().split('-')[0] ?? '';
  if (base !== bundle.id) {
    problems.push({
      where,
      key: 'tag',
      detail: `${bundle.tag} is not ${bundle.id}: the tag has to name its own language`,
    });
  }
  try {
    Intl.getCanonicalLocales(bundle.tag);
  } catch {
    problems.push({ where, key: 'tag', detail: `${bundle.tag} is not a valid language tag` });
  }
  return problems;
}

/**
 * Allowlist entries that excuse nothing.
 *
 * An entry in `same-as-english.ts` is only legitimate if removing it would produce a problem
 * with that exact key. One that would not is a leftover — the value was translated later, or
 * the key was mistyped — and leaving it there quietly widens the exemption for whatever lands
 * on that key next.
 */
export function unusedAllowances(bundle: LocaleBundle): readonly string[] {
  const keys = new Set(
    localeProblems({ ...bundle, sameAsEnglish: {} }).map(({ where, key }) => `${where}.${key}`),
  );
  return Object.keys(bundle.sameAsEnglish).filter((key) => !keys.has(key));
}

/**
 * Problems only visible with every language side by side.
 *
 * Two languages claiming one `hreflang` makes a search engine drop the whole alternate set, and
 * two sharing a share picture or a name in the picker is a copy-paste nobody would notice.
 */
export function crossLocaleProblems(bundles: readonly LocaleBundle[]): readonly Problem[] {
  const problems: Problem[] = [];
  const fields = [
    ['hreflang', (bundle: LocaleBundle) => bundle.site.hreflang],
    ['socialImage.file', (bundle: LocaleBundle) => bundle.site.socialImage.file],
    ['endonym', (bundle: LocaleBundle) => bundle.endonym],
    ['manifest.name', (bundle: LocaleBundle) => bundle.site.manifest.name],
  ] as const;
  for (const [key, read] of fields) {
    const seen = new Map<string, string>();
    for (const bundle of bundles) {
      const value = read(bundle);
      const owner = seen.get(value);
      if (owner !== undefined) {
        problems.push({
          where: 'languages',
          key,
          detail: `${bundle.id} and ${owner} both use “${value}”, which has to be unique per language`,
        });
      }
      seen.set(value, bundle.id);
    }
  }
  return problems;
}

/** Everything wrong with one language. Empty means it is finished. */
export function localeProblems(bundle: LocaleBundle): readonly Problem[] {
  return [
    ...checkIdentity(bundle),
    ...checkMessages(bundle),
    ...checkBooks(bundle),
    ...checkGenres(bundle),
    ...checkInstall(bundle),
    ...checkSite(bundle),
    ...checkAcceptance(bundle),
  ];
}

/** The problems as a list somebody can act on, one per line. */
export function describeProblems(id: string, problems: readonly Problem[]): string {
  return [
    `${id}: ${String(problems.length)} thing${problems.length === 1 ? '' : 's'} left`,
    ...problems.map(({ where, key, detail }) => `  ${where}.${key}: ${detail}`),
  ].join('\n');
}
