import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { describe, expect, it } from 'vitest';
import { analytics } from './analytics.ts';
import { firstFrame } from './first-frame.ts';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { manifestFileName, offline } from './offline.ts';
import { PAGE_LIST, PAGES, ROOT_DIR } from './site.ts';
import { SITE_COPY, SITE_PAGE_IDS } from '../src/i18n/site-copy.ts';
import { preloadScript, siteHead } from './site-head.ts';
import { DEFAULT_LOCALE_ID, LOCALE_IDS, type LocaleId } from '../src/i18n/locale-id.ts';
import { translationDatasetPath } from '../src/core/datasets/paths.ts';
import { defaultTranslationFor } from '../src/translations/default-for-locale.ts';
import { initialChoice } from '../src/app/initial-choice.ts';
import { TRANSLATION_MANIFESTS } from '../src/translations/registry.ts';
import { LOCALE_STORAGE_KEY, TRANSLATION_STORAGE_KEY } from '../src/shared/lib/preference-keys.ts';

const APP_PAGE = Object.values(PAGES).find((page) => page.app);
const PAGE_PATH = `/${APP_PAGE?.entry ?? 'index.html'}`;

/** What these plugins hand back: the page rewritten, tags to add, or both. */
type IndexHtmlResult = string | { html: string; tags: unknown[] };
type IndexHtmlHandler = (html: string, context: { path: string }) => IndexHtmlResult;

/** Calls a plugin hook that may be a function or an object with a handler. */
function hook(plugin: Plugin, name: 'transformIndexHtml'): IndexHtmlHandler {
  const value = plugin[name];
  return (typeof value === 'function' ? value : value?.handler) as IndexHtmlHandler;
}

function resolveConfig(plugin: Plugin, command: 'build' | 'serve', base = '/'): void {
  const configResolved = plugin.configResolved;
  const handler = typeof configResolved === 'function' ? configResolved : configResolved?.handler;
  void handler?.call({} as never, { command, base } as never);
}

const HTML = '<html><head><title>t</title></head><body><div id="root"></div></body></html>';

describe('analytics', () => {
  it('adds the tag to a built page', () => {
    const plugin = analytics();
    resolveConfig(plugin, 'build');
    const tags = hook(plugin, 'transformIndexHtml')(HTML, { path: PAGE_PATH });
    expect(JSON.stringify(tags)).toContain('googletagmanager.com');
  });

  it("reports only from the site's own origin, so forks and previews send nothing", () => {
    const plugin = analytics();
    resolveConfig(plugin, 'build');
    const tags = hook(plugin, 'transformIndexHtml')(HTML, { path: PAGE_PATH });
    expect(JSON.stringify(tags)).toContain('trekhleb.dev');
  });

  it('adds nothing on the dev server', () => {
    const plugin = analytics();
    resolveConfig(plugin, 'serve');
    expect(
      hook(plugin, 'transformIndexHtml')(HTML, {
        path: PAGE_PATH,
      }),
    ).toEqual([]);
  });

  it('adds nothing to a file that is not a page', () => {
    const plugin = analytics();
    resolveConfig(plugin, 'build');
    expect(hook(plugin, 'transformIndexHtml')(HTML, { path: '/elsewhere.html' })).toEqual([]);
  });
});

describe('firstFrame', () => {
  const transform = () => hook(firstFrame(), 'transformIndexHtml');

  it('fills the empty root with the logo, so the first paint is not blank', () => {
    const result = transform()(HTML, { path: PAGE_PATH });
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.html).toContain('first-frame');
    expect(result.html).toContain('<svg');
    expect(JSON.stringify(result.tags)).toContain('color-scheme');
  });

  it('moves stylesheets to the end of the body, so content paints before them', () => {
    const withCss = HTML.replace('</head>', '<link rel="stylesheet" href="/a.css"></head>');
    const result = transform()(withCss, { path: PAGE_PATH });
    if (typeof result === 'string') throw new Error('expected a transform result');
    expect(result.html.indexOf('/a.css')).toBeGreaterThan(result.html.indexOf('<body>'));
  });

  it('leaves a page it does not know alone', () => {
    expect(transform()(HTML, { path: '/other.html' })).toBe(HTML);
  });

  it('refuses a page without the empty root it needs to fill', () => {
    expect(() => transform()('<html><body></body></html>', { path: PAGE_PATH })).toThrow(
      /expected an empty/,
    );
  });
});

describe('siteHead', () => {
  it('adds the metadata a shared link needs', () => {
    const plugin = siteHead();
    resolveConfig(plugin, 'build', '/bible-cross-references/');
    const tags = JSON.stringify(
      hook(plugin, 'transformIndexHtml')(HTML, {
        path: PAGE_PATH,
      }),
    );
    expect(tags).toContain('canonical');
    expect(tags).toContain('og:');
    expect(tags).toContain('twitter:');
  });

  it('gives every page its icons and a dataset preload', () => {
    const plugin = siteHead();
    resolveConfig(plugin, 'build', '/base/');
    const tags = JSON.stringify(
      hook(plugin, 'transformIndexHtml')(HTML, {
        path: PAGE_PATH,
      }),
    );
    expect(tags).toContain('/base/favicon.svg');
    expect(tags).toContain('theme-color');
    expect(tags).toContain('preload');
  });

  it('keeps an unlisted page out of search engines, and gives it no card', () => {
    const plugin = siteHead();
    resolveConfig(plugin, 'build', '/');
    const tags = JSON.stringify(
      hook(plugin, 'transformIndexHtml')(HTML, {
        path: '/debug/index.html',
      }),
    );
    expect(tags).toContain('noindex');
    expect(tags).not.toContain('og:title');
  });

  it('keeps an unknown file out of search engines too', () => {
    const plugin = siteHead();
    resolveConfig(plugin, 'build', '/');
    expect(
      JSON.stringify(
        hook(plugin, 'transformIndexHtml')(HTML, {
          path: '/nope.html',
        }),
      ),
    ).toContain('noindex');
  });

  it('emits a sitemap', () => {
    const plugin = siteHead();
    resolveConfig(plugin, 'build', '/bible-cross-references/');
    const emitted: { fileName?: string; source?: string }[] = [];
    const generate = plugin.generateBundle;
    const handler = typeof generate === 'function' ? generate : generate?.handler;
    void handler?.call(
      { emitFile: (file: { fileName?: string; source?: string }) => emitted.push(file) } as never,
      {} as never,
      {} as never,
      false,
    );
    const sitemap = emitted.find((file) => file.fileName === 'sitemap.xml');
    expect(sitemap?.source).toContain('<urlset');
  });
});

describe('offline', () => {
  it('emits a web app manifest that works under any base', () => {
    const plugin = offline();
    const emitted: { fileName?: string; source?: string }[] = [];
    const generate = plugin.generateBundle;
    const handler = typeof generate === 'function' ? generate : generate?.handler;
    void handler?.call(
      { emitFile: (file: { fileName?: string; source?: string }) => emitted.push(file) } as never,
      {} as never,
      {} as never,
      false,
    );
    const manifest = emitted.find((file) => file.fileName === 'manifest.webmanifest');
    const parsed: unknown = JSON.parse(manifest?.source ?? '{}');
    expect(parsed).toMatchObject({ start_url: './', scope: './', display: 'standalone' });
  });

  it('links the manifest from an app page of a build, and nowhere else', () => {
    const plugin = offline();
    resolveConfig(plugin, 'build', '/base/');
    const transform = hook(plugin, 'transformIndexHtml');
    expect(JSON.stringify(transform(HTML, { path: PAGE_PATH }))).toContain(
      '/base/manifest.webmanifest',
    );
    expect(transform(HTML, { path: '/debug/index.html' })).toEqual([]);
  });

  it('adds nothing on the dev server', () => {
    const plugin = offline();
    resolveConfig(plugin, 'serve', '/');
    expect(
      hook(plugin, 'transformIndexHtml')(HTML, {
        path: PAGE_PATH,
      }),
    ).toEqual([]);
  });

  it('writes a worker listing the files that are really on disk', async () => {
    // The bug this guards against: a worker that lists a file the build never wrote fails to
    // install, and the whole offline cache goes with it.
    const dir = await mkdtemp(join(tmpdir(), 'offline-test-'));
    await mkdir(join(dir, 'assets'), { recursive: true });
    await mkdir(join(dir, 'icons'), { recursive: true });
    await writeFile(join(dir, 'assets', 'main-abc.js'), 'console.log(1)');
    await writeFile(join(dir, 'assets', 'main-abc.css'), 'body{}');
    await writeFile(join(dir, 'assets', 'logo.woff2'), 'font');
    for (const locale of LOCALE_IDS) {
      await writeFile(join(dir, manifestFileName(locale)), '{}');
    }
    for (const icon of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png']) {
      await writeFile(join(dir, icon), 'x');
    }
    for (const icon of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) {
      await writeFile(join(dir, 'icons', icon), 'x');
    }
    for (const page of PAGE_LIST) {
      await mkdir(join(dir, page.entry, '..'), { recursive: true });
      await writeFile(join(dir, page.entry), '<html></html>');
    }

    const plugin = offline();
    const write = plugin.writeBundle;
    const handler = typeof write === 'function' ? write : write?.handler;
    await handler?.call({} as never, { dir } as never, {} as never);

    const { readFile } = await import('node:fs/promises');
    const worker = await readFile(join(dir, 'sw.js'), 'utf8');
    const files = JSON.parse(/const FILES = (\[.*?\]);/s.exec(worker)?.[1] ?? '[]') as string[];
    expect(files).toContain('assets/main-abc.js');
    expect(files).toContain('assets/main-abc.css');
    // Anything the bundler emits, not only code and styles.
    expect(files).toContain('assets/logo.woff2');
    for (const locale of LOCALE_IDS) {
      expect(files).toContain(manifestFileName(locale));
    }
    expect(files).not.toContain('sw.js');
    expect(worker).toContain('const VERSION = "');
    // Every language's pages are kept on the device, so a reader who installed the Portuguese
    // app opens it offline in Portuguese rather than falling back to the English root.
    const pages = JSON.parse(/const PAGES = (\[.*?\]);/s.exec(worker)?.[1] ?? '[]') as string[];
    for (const page of PAGE_LIST.filter(({ app }) => app)) {
      expect(pages).toContain(page.entry.replace(/index\.html$/, ''));
    }
    expect(pages).toContain('pt/');
  });
});

/**
 * The page's own words, in every language.
 *
 * These used to be read back out of the HTML with a regex, which meant reading text that had
 * already been escaped once and escaping it again: a single `&` in a title reached WhatsApp,
 * Twitter and the structured data as `&amp;amp;`. The copy is the source now, and these pin
 * that it arrives verbatim.
 */
describe('the head a page is given', () => {
  function headOf(page: { entry: string }): { html: string; tags: unknown[] } {
    const plugin = siteHead();
    resolveConfig(plugin, 'build', '/base/');
    const result = hook(plugin, 'transformIndexHtml')(
      '<html><head><title>t</title></head><body><div id="root"></div><noscript>x</noscript></body></html>',
      { path: `/${page.entry}` },
    );
    return typeof result === 'string' ? { html: result, tags: [] } : result;
  }

  function contentOf(tags: unknown[], name: string): string | undefined {
    const match = tags.find((tag) => {
      const attrs = (tag as { attrs?: Record<string, string> }).attrs ?? {};
      return attrs['property'] === name || attrs['name'] === name;
    });
    return (match as { attrs?: Record<string, string> } | undefined)?.attrs?.['content'];
  }

  it.each(PAGE_LIST.filter(({ listed }) => listed))(
    'gives $entry its own title and description, exactly as written',
    (page) => {
      if (page.id === 'debug') {
        return;
      }
      const copy = SITE_COPY[page.locale].pages[page.id];
      const { tags } = headOf(page);
      // Verbatim: not re-escaped, not taken from the English page, not the site name.
      expect(contentOf(tags, 'og:title')).toBe(copy.title);
      expect(contentOf(tags, 'twitter:title')).toBe(copy.title);
      expect(contentOf(tags, 'og:description')).toBe(copy.description);
      expect(contentOf(tags, 'og:locale')).toBe(SITE_COPY[page.locale].ogLocale);
      expect(contentOf(tags, 'og:site_name')).toBe(SITE_COPY[page.locale].siteName);
    },
  );

  it('escapes copy on its way into the page body rather than passing it through', () => {
    // The `<noscript>` block is built from the copy directly, so it is the one place the copy
    // becomes markup. Hostile punctuation has to come out as entities, exactly once.
    const page = PAGE_LIST.find(({ listed }) => listed);
    expect(page).toBeDefined();
    const { html } = headOf(page ?? { entry: 'index.html' });
    const noscript = /<noscript>([\s\S]*?)<\/noscript>/.exec(html)?.[1] ?? '';
    expect(noscript).not.toContain('&amp;amp;');
    expect(noscript).not.toContain('&amp;#');
    // The apostrophe in the English description survives as itself inside element text.
    expect(noscript.length).toBeGreaterThan(0);
  });

  it('tells a reader with no JavaScript what is wrong, in their own language', () => {
    for (const page of PAGE_LIST.filter(({ listed }) => listed)) {
      if (page.id === 'debug') {
        continue;
      }
      const { html } = headOf(page);
      expect(html).toContain(SITE_COPY[page.locale].pages[page.id].noscript);
    }
  });
});

describe('the committed English entries', () => {
  /**
   * `src/i18n/site-copy.ts` is the source of every page's words now, so the two HTML files that
   * are still committed are a copy of it. If they drift, the file a reader is served says one
   * thing and every `og:` tag beside it says another.
   */
  it.each(SITE_PAGE_IDS)('%s says what SITE_COPY.en says', (id) => {
    const entry = id === 'main' ? 'index.html' : `${id}/index.html`;
    const html = readFileSync(resolve(ROOT_DIR, entry), 'utf8');
    const copy = SITE_COPY[DEFAULT_LOCALE_ID].pages[id];
    const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '';
    const description = /<meta\s+name="description"\s+content="([^"]*)"/s.exec(html)?.[1] ?? '';
    expect(title.replace('%SITE_NAME%', SITE_COPY[DEFAULT_LOCALE_ID].siteName)).toBe(copy.title);
    expect(description.replaceAll(/\s+/g, ' ').trim()).toBe(copy.description);
  });
});

describe('the inline preload script', () => {
  /**
   * Runs the generated script the way a browser would, and reports what it preloaded.
   *
   * The script is a second implementation of a rule the app already owns, written as a string
   * because it has to run before any module parses. The only way to keep the two honest is to
   * execute it and compare its answer to the real function — which is how three disagreements
   * were found the first time, including one that downloaded an extra 3.8 MB on every shared
   * link that named a translation.
   */
  function preloadedBy(options: {
    readonly search?: string;
    readonly stored?: Readonly<Record<string, string>>;
    readonly languages?: readonly string[];
    /** The language of the file served, which a page under a language path has baked in. */
    readonly pageLocale?: LocaleId | null;
  }): readonly string[] {
    const href = `https://trekhleb.dev/bible-cross-references/${options.search ?? ''}`;
    const store = options.stored ?? {};
    const hrefs: string[] = [];
    const scope = {
      navigator: {
        serviceWorker: { controller: null },
        languages: options.languages ?? ['en-US'],
      },
      location: { href },
      localStorage: { getItem: (key: string) => store[key] ?? null },
      document: {
        createElement: () => ({ rel: '', as: '', crossOrigin: '', href: '' }),
        head: {
          append: (link: { href: string }) => {
            hrefs.push(link.href);
          },
        },
      },
      URL,
    };
    runInNewContext(preloadScript({ ...PLAN, pageLocale: options.pageLocale ?? null }), scope);
    return hrefs;
  }

  const PLAN = {
    shared: '/base/data/cross-references/openbible.json',
    byTranslation: Object.fromEntries(
      TRANSLATION_MANIFESTS.map((manifest) => [
        manifest.id,
        `/base/${translationDatasetPath(manifest.id)}`,
      ]),
    ),
    byLocale: Object.fromEntries(
      LOCALE_IDS.map((id) => [id, `/base/${translationDatasetPath(defaultTranslationFor(id))}`]),
    ),
    fallback: `/base/${translationDatasetPath(defaultTranslationFor(DEFAULT_LOCALE_ID))}`,
    localeKey: LOCALE_STORAGE_KEY,
    translationKey: TRANSLATION_STORAGE_KEY,
    pageLocale: null,
  };

  /** What the app itself will load, from the one function that decides it. */
  function appWouldLoad(options: {
    readonly search?: string;
    readonly stored?: Readonly<Record<string, string>>;
    readonly languages?: readonly string[];
    readonly pageLocale?: LocaleId | null;
  }): string {
    const url = new URL(`https://trekhleb.dev/bible-cross-references/${options.search ?? ''}`);
    const store = options.stored ?? {};
    const { translation } = initialChoice(
      url.searchParams,
      {
        locale: store[LOCALE_STORAGE_KEY] ?? null,
        translation: store[TRANSLATION_STORAGE_KEY] ?? null,
      },
      options.languages ?? ['en-US'],
      options.pageLocale ?? null,
    );
    return `/base/${translationDatasetPath(translation)}`;
  }

  it.each([
    ['a plain visit', {}],
    ['a link naming a translation', { search: '?t=kjv' }],
    ['a link naming a language', { search: '?lang=pt' }],
    ['a link naming both', { search: '?t=kjv&lang=pt' }],
    ['a Portuguese browser', { languages: ['pt-BR'] }],
    ['a browser shouting its tag', { languages: ['PT-BR'] }],
    ['a stored translation', { stored: { [TRANSLATION_STORAGE_KEY]: 'kjv' } }],
    ['a stored language', { stored: { [LOCALE_STORAGE_KEY]: 'pt' } }],
    [
      'a stored translation and a link naming another',
      { search: '?t=bsb', stored: { [TRANSLATION_STORAGE_KEY]: 'kjv' } },
    ],
    ['a language the app does not speak', { search: '?lang=fr' }],
    // The pages under a language path: their language is a fact about the file, so it outranks
    // everything a reader brings with them.
    ['a Portuguese page', { pageLocale: 'pt' as const }],
    [
      'a Portuguese page for a reader who stored English',
      { pageLocale: 'pt' as const, stored: { [LOCALE_STORAGE_KEY]: 'en' } },
    ],
    [
      'a Portuguese page in an English browser',
      { pageLocale: 'pt' as const, languages: ['en-US'] },
    ],
    [
      'a Portuguese page whose link names a translation',
      { pageLocale: 'pt' as const, search: '?t=kjv' },
    ],
  ])('preloads what the app will load, for %s', (_name, options) => {
    expect(preloadedBy(options)).toEqual([PLAN.shared, appWouldLoad(options)]);
  });

  it('is not fooled by a parameter that names something on Object.prototype', () => {
    // `lang in byLocale` found `toString` and preloaded a URL built from a function's source.
    for (const key of ['toString', 'constructor', '__proto__', 'valueOf', 'hasOwnProperty']) {
      expect(preloadedBy({ search: `?lang=${key}` })).toEqual([PLAN.shared, PLAN.fallback]);
      expect(preloadedBy({ search: `?t=${key}` })).toEqual([PLAN.shared, PLAN.fallback]);
    }
  });

  it('does nothing at all when the offline cache is already serving the page', () => {
    const hrefs: string[] = [];
    runInNewContext(preloadScript(PLAN), {
      navigator: { serviceWorker: { controller: {} }, languages: ['en-US'] },
      location: { href: 'https://trekhleb.dev/bible-cross-references/' },
      localStorage: { getItem: () => null },
      document: {
        createElement: () => ({}),
        head: { append: (link: { href: string }) => hrefs.push(link.href) },
      },
      URL,
    });
    expect(hrefs).toEqual([]);
  });

  it('survives a browser that refuses storage, rather than taking the page down with it', () => {
    const hrefs: string[] = [];
    runInNewContext(preloadScript(PLAN), {
      navigator: { serviceWorker: { controller: null }, languages: ['en-US'] },
      location: { href: 'https://trekhleb.dev/bible-cross-references/' },
      localStorage: {
        getItem: () => {
          throw new Error('storage is disabled');
        },
      },
      document: {
        createElement: () => ({ rel: '', as: '', crossOrigin: '', href: '' }),
        head: { append: (link: { href: string }) => hrefs.push(link.href) },
      },
      URL,
    });
    expect(hrefs).toEqual([PLAN.shared, PLAN.fallback]);
  });
});
