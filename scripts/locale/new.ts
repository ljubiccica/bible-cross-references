import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { LOCALE_IDS } from '../../src/i18n/locale-id.ts';

/**
 * Starts a new language: `npm run locale:new es`.
 *
 * It writes one file per thing a language has to say, each of them still English, and then
 * prints the handful of shared files that need a line adding. Nothing here translates anything —
 * the point is that every file exists and compiles, so that from this moment on the compiler and
 * `npm run check` can say exactly what is left:
 *
 * - the compiler names every `Record<LocaleId, …>` still missing an entry;
 * - `src/i18n/completeness.test.ts` names every word still in English, every blank, every book
 *   whose spelling two books claim, and every case the acceptance table has to pin.
 *
 * So the way to add a language is: run this, add the lines it prints, then work until
 * `npm run check` is green. Green means finished — there is no half-finished state that ships.
 */

const ROOT = resolve(import.meta.dirname, '../..');

const id = process.argv[2];

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (id === undefined || !/^[a-z]{2,3}$/.test(id)) {
  fail('Usage: npm run locale:new -- <id>, where <id> is a language tag such as "es" or "uk".');
}
if ((LOCALE_IDS as readonly string[]).includes(id)) {
  fail(`${id} is already in LOCALE_IDS. Run \`npm run check\` to see what is left to translate.`);
}

const NOTE = (what: string) =>
  `/**
 * ${what}
 *
 * TODO: translate. Every value below is still English, which is what \`npm run check\` reports —
 * it lists each one by name until all of them have been replaced. Delete this note when they have.
 */`;

const FILES: readonly { readonly path: string; readonly contents: string }[] = [
  {
    path: `src/i18n/messages/${id}.ts`,
    contents: `import type { Messages } from './types.ts';
import { en } from './en.ts';

${NOTE('The interface in this language.')}
export const ${id}: Messages = { ...en };
`,
  },
  {
    path: `src/i18n/books/${id}.ts`,
    contents: `import type { BookNames } from './types.ts';
import { enBooks } from './en.ts';

${NOTE('The books in this language.')}
 /*
 * Aliases are the abbreviations a reader of this language actually types. They are matched after
 * accents are folded away, so an entry needs no accents of its own — except where folding would
 * bring two books together, as Portuguese \`Jo\` (João) and \`Jó\` (Job) do. Where it does, each
 * book has to claim its own spelling exactly, and \`src/i18n/books/acceptance.ts\` has to say
 * which book a reader typing it without the accent reaches. \`npm run check\` names those cases.
 */
export const ${id}Books: BookNames = { ...enBooks };
`,
  },
  {
    path: `src/i18n/genres/${id}.ts`,
    contents: `import type { GenreId } from '../../core/bible/genres.ts';
import { enGenres } from './en.ts';

${NOTE('The ten genres in this language.')}
export const ${id}Genres: Readonly<Record<GenreId, string>> = { ...enGenres };
`,
  },
  {
    path: `src/i18n/install/${id}.tsx`,
    contents: `import type { InstallGuides } from './types.ts';
import { enInstall } from './en.tsx';

${NOTE('The install steps in this language.')}
 /*
 * These name real buttons, so a translator working here is reading their own phone rather than
 * only this file: each step has to say what that browser actually calls the button, in this
 * language, on that device.
 */
export const ${id}Install: InstallGuides = { ...enInstall };
`,
  },
];

const existing = FILES.filter(({ path }) => existsSync(resolve(ROOT, path)));
if (existing.length > 0) {
  fail(`already started: ${existing.map(({ path }) => path).join(', ')}`);
}

for (const { path, contents } of FILES) {
  const file = resolve(ROOT, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, contents);
  console.log(`  created  ${path}`);
}

console.log(`
Now add ${id} to the files every language shares. The compiler will name any you miss:

  src/i18n/locale-id.ts       LOCALE_IDS: add '${id}'
  src/i18n/locale-tags.ts     LOCALE_TAGS: { tag: '<BCP 47 tag>', endonym: '<its name in itself>' }
  src/i18n/registry.ts        import the four files above and add the locale
  src/i18n/site-copy.ts       SITE_COPY: titles, descriptions, noscript, manifest, share picture
  src/i18n/books/acceptance.ts  BOOK_ACCEPTANCE: what a reader types, checked by a native speaker
  src/i18n/same-as-english.ts   SAME_AS_ENGLISH: {} to begin with
  src/app/url-contract.test.ts  SAVED: a row for ?lang=${id} and one for /${id}/, so the
                                addresses this language is shared at can never quietly change

Then:

  npm run check               lists everything still untranslated, by name
  npm run build               writes ${id}/index.html and ${id}/threads/index.html
  npm run test:e2e            opens /${id}/ in a real browser

Green means finished. See CONTRIBUTING.md → "Adding a language".
`);
