import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  escapeAttribute,
  escapeText,
  localeEntries,
  localeEntryHtml,
  writeLocaleEntries,
} from './locale-entries.ts';
import { DEFAULT_LOCALE_ID, LOCALE_IDS } from '../src/i18n/locale-id.ts';
import { LOCALE_TAGS } from '../src/i18n/locale-tags.ts';
import { SITE_COPY, SITE_PAGE_IDS } from '../src/i18n/site-copy.ts';

const OTHER_LOCALES = LOCALE_IDS.filter((id) => id !== DEFAULT_LOCALE_ID);

describe('the HTML written for a language', () => {
  it.each(OTHER_LOCALES.flatMap((id) => SITE_PAGE_IDS.map((page) => [id, page] as const)))(
    '%s %s says what that language says',
    (id, page) => {
      const html = localeEntryHtml(id, page);
      const copy = SITE_COPY[id].pages[page];
      expect(html).toContain(`<html lang="${LOCALE_TAGS[id].tag}"`);
      expect(html).toContain(`<title>${copy.title}</title>`);
      expect(html).toContain(copy.description);
      expect(html).toContain(copy.noscript);
    },
  );

  it('gives the app the same root and entry script the English pages have', () => {
    const html = localeEntryHtml('pt', 'main');
    // `firstFrame()` throws on a page without this exact element, and the bundler needs the
    // script: a generated page missing either would fail the build rather than ship broken.
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('<script type="module" src="/src/app/main.tsx"></script>');
    expect(html).toContain('<meta charset="UTF-8" />');
    expect(html).toContain('viewport-fit=cover');
  });

  it('says it is generated, so nobody edits the copy in the wrong place', () => {
    expect(localeEntryHtml('pt', 'main')).toContain('site-copy.ts');
  });

  it('escapes what it is given, so copy with punctuation cannot break the page', () => {
    // Fed hostile input directly rather than checked against the real catalogues, which contain
    // none of these characters: asserting that today's Portuguese description has no `<` in it
    // passes just as happily if these functions were the identity, which is how the same bug
    // went unnoticed one layer up in site-head.ts.
    expect(escapeText('Tom & Jerry <b>')).toBe('Tom &amp; Jerry &lt;b&gt;');
    expect(escapeAttribute('a "quoted" & <tagged> value')).toBe(
      'a &quot;quoted&quot; &amp; &lt;tagged&gt; value',
    );
    // `&` first, or the entities it writes would themselves be escaped again.
    expect(escapeText('&amp;')).toBe('&amp;amp;');
    expect(escapeAttribute("it's fine")).toBe("it's fine");
  });
});

describe('the entries a build has to write', () => {
  it('covers every page of every language but the default one', () => {
    const paths = localeEntries().map(({ path }) => path);
    for (const id of OTHER_LOCALES) {
      for (const page of SITE_PAGE_IDS) {
        const suffix = page === 'main' ? '' : `${page}/`;
        expect(paths).toContain(`${id}/${suffix}index.html`);
      }
      // Each generated directory ignores itself, so adding a language needs no .gitignore line.
      expect(paths).toContain(`${id}/.gitignore`);
    }
  });

  it('leaves the default language alone: its entries are committed, not generated', () => {
    for (const { path } of localeEntries()) {
      expect(path.startsWith(`${DEFAULT_LOCALE_ID}/`)).toBe(false);
    }
    expect(localeEntries().map(({ path }) => path)).not.toContain('index.html');
  });
});

describe('writing them', () => {
  it('writes every entry into a directory of its own', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'locale-entries-'));
    const written = writeLocaleEntries(dir);
    expect(written.length).toBe(localeEntries().length);
    for (const { path, html } of localeEntries()) {
      expect(await readFile(join(dir, path), 'utf8')).toBe(html);
    }
  });

  it('writes nothing the second time, so a watching dev server does not loop', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'locale-entries-'));
    writeLocaleEntries(dir);
    expect(writeLocaleEntries(dir)).toEqual([]);
  });

  it('puts back an entry somebody edited by hand', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'locale-entries-'));
    writeLocaleEntries(dir);
    const [first] = localeEntries();
    expect(first).toBeDefined();
    const file = join(dir, first?.path ?? '');
    await mkdir(join(file, '..'), { recursive: true });
    await writeFile(file, '<html>edited</html>');
    expect(writeLocaleEntries(dir)).toEqual([first?.path]);
    expect(await readFile(file, 'utf8')).toBe(first?.html);
  });
});
