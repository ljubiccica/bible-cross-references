import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { transformWithOxc, type Plugin } from 'vite';
import { DATASET_SCHEMA_VERSION } from '../src/core/datasets/formats.ts';
import { DATASETS_DIRECTORY } from '../src/core/datasets/paths.ts';
import { sharedDatasetPaths } from '../src/visualizations/shared/viz-datasets.ts';
import { LOCALE_IDS, type LocaleId } from '../src/i18n/locale-id.ts';
import { localeManifestFileName, localePathSegment } from '../src/i18n/locale-path.ts';
import { SITE_COPY } from '../src/i18n/site-copy.ts';
import { atEndOfHead, PAGE_LIST, pageOf, ROOT_DIR } from './site.ts';

/** Files from `public/` that the offline cache keeps with each version. */
const OFFLINE_PUBLIC_FILES = [
  'favicon.svg',
  'favicon.ico',
  'apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

/** Where the bundler writes what it emits (Vite's default `build.assetsDir`). */
const ASSETS_DIRECTORY = 'assets';

/**
 * The web app manifest, one per language: installable, with paths relative to itself, so it works
 * under any base.
 *
 * Each language is its own installable app — its own name on the home screen, and its own
 * `start_url`, so that installing from `/pt/` opens in Portuguese rather than at the English
 * root. They share a `scope`, which is the whole site, so the installed app can still follow a
 * link into another language without leaving the app.
 */
/** Where a language's manifest is published; shared with the app, which repoints the link. */
export const manifestFileName = localeManifestFileName;

function webAppManifest(locale: LocaleId) {
  const { manifest } = SITE_COPY[locale];
  const start = `./${localePathSegment(locale)}`;
  return {
    // No `id`. Every other URL here is resolved against the manifest, but `id` is resolved
    // against the *origin* of `start_url` (appmanifest §"id", step 4: "Let base origin be
    // manifest["start_url"]'s origin"), so the `./de/` that looks right beside `start_url`
    // would identify this app as `https://trekhleb.dev/de/` — outside the app's own path, and
    // in English's case `https://trekhleb.dev/` itself, the identity any manifest at the root
    // of the domain would claim. Left out, `id` defaults to the resolved `start_url`, which is
    // what was meant. An installed app keeps the identity it was installed under forever, so
    // this is worth getting right before a language ships rather than after.
    name: manifest.name,
    short_name: manifest.shortName,
    description: manifest.description,
    start_url: start,
    scope: './',
    lang: SITE_COPY[locale].hreflang,
    display: 'standalone',
    background_color: '#0d0d0d',
    theme_color: '#0d0d0d',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: 'icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}

/**
 * Makes the built site an installable web app that works offline: writes the web app manifest
 * (linked from the app pages) and the service worker, compiled from sw/service-worker.ts with
 * this version's files and a hash of them. The app registers it (src/app/register-offline-cache.ts)
 * with the site's base as its scope. Nothing of this runs on the dev server.
 */
export function offline(): Plugin {
  let base = '/';
  let building = false;
  return {
    name: 'bible-cross-references:offline',
    configResolved(config) {
      base = config.base;
      building = config.command === 'build';
    },
    transformIndexHtml(_, context) {
      const page = pageOf(context.path);
      if (!building || !page?.app) {
        return [];
      }
      // Each page links its own language's manifest, so installing from a Portuguese page
      // installs the Portuguese app.
      return atEndOfHead([
        {
          tag: 'link',
          attrs: { rel: 'manifest', href: `${base}${manifestFileName(page.locale)}` },
        },
      ]);
    },
    generateBundle() {
      for (const locale of LOCALE_IDS) {
        this.emitFile({
          type: 'asset',
          fileName: manifestFileName(locale),
          source: `${JSON.stringify(webAppManifest(locale), null, 2)}\n`,
        });
      }
    },

    /**
     * The worker is written once everything else is on disk, and its list of files is read from
     * there. The bundle a plugin is handed while the build is still running names chunks that
     * never reach disk (duplicate entries that are merged afterwards), and a worker that tries to
     * cache a file that does not exist fails to install — taking the whole offline cache with it.
     */
    async writeBundle(options) {
      const outDir = options.dir ?? resolve(ROOT_DIR, 'dist');
      const built = readdirSync(outDir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => relative(outDir, resolve(entry.parentPath, entry.name)))
        .map((fileName) => fileName.replaceAll('\\', '/'));
      // Everything the bundler emitted, whatever it is: code, styles, and the fonts or images a
      // stylesheet may come to pull in, which land in the same directory and are needed just as
      // much. The rest of the output is pages, datasets (cached as they are used), and the files
      // in public/ — of which only the icons below are worth a copy on the device.
      const files = [
        ...built.filter((fileName) => fileName.startsWith(`${ASSETS_DIRECTORY}/`)),
        ...LOCALE_IDS.map(manifestFileName),
      ].toSorted();
      // Every language's pages, so a reader who installed the Portuguese app has the Portuguese
      // pages on their device rather than only the English ones.
      const pages = PAGE_LIST.filter(({ app }) => app).map(({ entry }) =>
        entry.replace(/index\.html$/, ''),
      );

      const version = createHash('sha256');
      for (const fileName of [...files, ...OFFLINE_PUBLIC_FILES]) {
        version.update(fileName);
        version.update(readFileSync(resolve(outDir, fileName)));
      }
      for (const { entry } of PAGE_LIST) {
        // The name as well as the bytes, so that two pages trading contents is a change.
        version.update(entry);
        // The built page, not its source: it carries the inlined first frame and the head tags.
        version.update(readFileSync(resolve(outDir, entry)));
      }

      const workerSource = readFileSync(resolve(ROOT_DIR, 'sw/service-worker.ts'), 'utf8');
      // The worker itself belongs in the hash, and it is the one input easy to leave out:
      // everything else here is something the worker *caches*, and this is the worker doing the
      // caching. Left out, a release whose only change is to this file keeps the same
      // `SHELL_CACHE` name, `activate` finds nothing to delete and `store` skips every URL that
      // is already there — so the one release that cannot clear a bad shell cache is the release
      // shipped to fix it. That is precisely the cache nobody can invalidate.
      version.update(workerSource);

      const worker = await transformWithOxc(workerSource, 'service-worker.ts', { lang: 'ts' });
      const injected = [
        `const PAGES = ${JSON.stringify(pages)};`,
        `const FILES = ${JSON.stringify([...files, ...OFFLINE_PUBLIC_FILES])};`,
        `const DATASETS = ${JSON.stringify(sharedDatasetPaths())};`,
        `const DATA_DIRECTORY = ${JSON.stringify(DATASETS_DIRECTORY)};`,
        `const ASSETS_DIRECTORY = ${JSON.stringify(ASSETS_DIRECTORY)};`,
        `const VERSION = ${JSON.stringify(version.digest('hex').slice(0, 16))};`,
        `const SCHEMA_VERSION = ${JSON.stringify(DATASET_SCHEMA_VERSION)};`,
      ].join('\n');
      writeFileSync(resolve(outDir, 'sw.js'), `${injected}\n${worker.code}`);
    },
  };
}
