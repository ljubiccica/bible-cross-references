import { describe, expect, it } from 'vitest';
import { BOOK_ACCEPTANCE, type AcceptanceCase } from './books/acceptance.ts';
import {
  crossLocaleProblems,
  describeProblems,
  localeProblems,
  SAME_AS_ENGLISH_MAX,
  unusedAllowances,
  MINIMUM_ACCEPTANCE_CASES,
  resolve,
  type LocaleBundle,
  type Problem,
} from './completeness.ts';
import { contestedSpellings } from '../core/bible/book-lookup.ts';
import { DEFAULT_LOCALE_ID, LOCALE_IDS, type LocaleId } from './locale-id.ts';
import { getLocale } from './registry.ts';
import { SAME_AS_ENGLISH } from './same-as-english.ts';
import { SITE_COPY } from './site-copy.ts';

/**
 * The gate: a language is either finished or CI is red.
 *
 * The fallback to English in `translate.ts` is still there, and still tested — it is what keeps
 * a half-written catalogue from crashing in development. It is not a way to ship: a language
 * listed in `LOCALE_IDS` is offered to readers, and offering somebody a language that is half
 * English is worse than not offering it.
 */

function bundleFor(id: LocaleId): LocaleBundle {
  const locale = getLocale(id);
  const english = getLocale(DEFAULT_LOCALE_ID);
  return {
    id,
    tag: locale.tag,
    endonym: locale.endonym,
    messages: locale.messages,
    books: locale.books,
    genres: locale.genres,
    install: locale.install,
    site: SITE_COPY[id],
    acceptance: BOOK_ACCEPTANCE[id],
    english: {
      endonym: english.endonym,
      messages: english.messages,
      books: english.books,
      genres: english.genres,
      install: english.install,
      site: SITE_COPY[DEFAULT_LOCALE_ID],
    },
    sameAsEnglish: SAME_AS_ENGLISH[id],
    isDefault: id === DEFAULT_LOCALE_ID,
  };
}

describe('every language the app offers is finished', () => {
  it.each(LOCALE_IDS)('%s', (id) => {
    const problems = localeProblems(bundleFor(id));
    expect(problems, describeProblems(id, problems)).toEqual([]);
  });

  it('measures every language, so a new one cannot slip past unmeasured', () => {
    for (const id of LOCALE_IDS) {
      expect(Object.keys(SITE_COPY)).toContain(id);
      expect(Object.keys(BOOK_ACCEPTANCE)).toContain(id);
      expect(Object.keys(SAME_AS_ENGLISH)).toContain(id);
    }
  });

  it('has no allowlist entry that excuses nothing', () => {
    // An entry that would not produce a problem if removed is a leftover: the value was
    // translated later, or the key was mistyped. Either way it silently widens the exemption
    // for whatever lands on that key next.
    for (const id of LOCALE_IDS) {
      const unused = unusedAllowances(bundleFor(id));
      expect(unused, `${id}: remove these from same-as-english.ts`).toEqual([]);
    }
  });

  it('gives each language its own hreflang, picture, name and endonym', () => {
    const problems = crossLocaleProblems(LOCALE_IDS.map(bundleFor));
    expect(problems, describeProblems('languages', problems)).toEqual([]);
  });

  it('notices a language that is a copy of another language', () => {
    // The hole this closes: everything else compares a language with English, so a Portuguese
    // catalogue filed under `es` is measured against English, found different, and passes.
    const pt = bundleFor('pt');
    const clone = { ...pt, id: 'es' };
    const problems = crossLocaleProblems([bundleFor('en'), pt, clone]);
    expect(problems.some(({ detail }) => detail.includes('a copy of the other'))).toBe(true);
    expect(problems.some(({ key }) => key === 'pt/es')).toBe(true);
    // And the real pair is nowhere near the threshold.
    expect(crossLocaleProblems([bundleFor('en'), pt])).toEqual([]);
  });

  it('refuses to let a language keep everything in English by allowlisting it', () => {
    const everything = Object.fromEntries(
      Array.from({ length: SAME_AS_ENGLISH_MAX + 1 }, (_value, index) => [
        `messages.key${String(index)}`,
        'Spanish writes this exactly as English does.',
      ]),
    );
    const problems = localeProblems({ ...bundleFor('pt'), sameAsEnglish: everything });
    expect(problems.some(({ where }) => where === 'sameAsEnglish')).toBe(true);
  });

  it('explains every word it lets a language keep in English', () => {
    for (const [id, entries] of Object.entries(SAME_AS_ENGLISH)) {
      for (const [key, reason] of Object.entries(entries)) {
        expect(reason.trim(), `${id}.${key}`).not.toBe('');
      }
    }
  });
});

/**
 * The gate, failing.
 *
 * A check nobody has watched fail is a check nobody knows works. Each case below breaks one
 * thing in a finished language and asserts that this is the thing reported — so that a real
 * language with the same fault is caught, and so that a future refactor cannot quietly turn a
 * check into a no-op while the suite stays green.
 */
describe('the gate catches a language that is not finished', () => {
  const sound = bundleFor('pt');

  function problemsOf(broken: Partial<LocaleBundle>): readonly Problem[] {
    return localeProblems({ ...sound, ...broken });
  }

  function found(problems: readonly Problem[], where: string, key: string): Problem | undefined {
    return problems.find((problem) => problem.where === where && problem.key === key);
  }

  it('a message left out', () => {
    const messages = { ...sound.messages };
    delete messages['panel.close'];
    const problem = found(problemsOf({ messages }), 'messages', 'panel.close');
    expect(problem?.detail).toContain('missing');
  });

  it('a message left blank', () => {
    const problems = problemsOf({ messages: { ...sound.messages, 'panel.close': '   ' } });
    expect(found(problems, 'messages', 'panel.close')?.detail).toBe('blank');
  });

  it('a message left in English', () => {
    const problems = problemsOf({ messages: { ...sound.messages, 'panel.close': 'Close' } });
    expect(found(problems, 'messages', 'panel.close')?.detail).toContain('still the English words');
  });

  it('a message that drops one of its arguments', () => {
    const problems = problemsOf({
      messages: { ...sound.messages, 'reference.unknownBook': () => 'Livro desconhecido.' },
    });
    expect(found(problems, 'messages', 'reference.unknownBook')?.detail).toContain('drops «arg1»');
  });

  it('a message that throws', () => {
    const problems = problemsOf({
      messages: {
        ...sound.messages,
        'reference.unknownBook': () => {
          throw new Error('boom');
        },
      },
    });
    expect(found(problems, 'messages', 'reference.unknownBook')?.detail).toContain('threw');
  });

  it('a book left blank', () => {
    const problems = problemsOf({
      books: { ...sound.books, Gen: { ...sound.books.Gen, name: '' } },
    });
    expect(found(problems, 'books', 'Gen')?.detail).toBe('blank name');
  });

  it('a book given a spelling another book already answers to', () => {
    const problems = problemsOf({
      books: { ...sound.books, Jonah: { ...sound.books.Jonah, aliases: ['jo'] } },
    });
    expect(found(problems, 'books', 'jo')?.detail).toContain('two books answer');
  });

  it('two books given the same name', () => {
    const problems = problemsOf({
      books: { ...sound.books, Jonah: { ...sound.books.Jonah, name: sound.books.Joel.name } },
    });
    expect(found(problems, 'books', sound.books.Joel.name)?.detail).toContain('share this name');
  });

  it('a genre left in English', () => {
    const problems = problemsOf({
      genres: { ...sound.genres, law: sound.english.genres.law },
    });
    expect(found(problems, 'genres', 'law')?.detail).toContain('still the English words');
  });

  it('two genres given the same name', () => {
    const problems = problemsOf({
      genres: { ...sound.genres, acts: sound.genres.gospels },
    });
    expect(found(problems, 'genres', 'acts')?.detail).toContain('shares its name');
  });

  it('a device left without install steps', () => {
    const problems = problemsOf({
      install: { ...sound.install, ios: { ...sound.install.ios, steps: [] } },
    });
    expect(found(problems, 'install', 'ios')?.detail).toBe('no steps');
  });

  it('a device name left in English', () => {
    // `desktop`, not `ios` or `android`: those two are product names and are allowed to stay,
    // which this quietly also checks — an allowlist that stopped working would show up here.
    const problems = problemsOf({
      install: {
        ...sound.install,
        desktop: { ...sound.install.desktop, label: sound.english.install.desktop.label },
      },
    });
    expect(found(problems, 'install', 'desktop.label')?.detail).toContain('still the English');
    expect(found(problems, 'install', 'ios.label')).toBeUndefined();
  });

  it('a page title left blank', () => {
    const problems = problemsOf({
      site: {
        ...sound.site,
        pages: { ...sound.site.pages, main: { ...sound.site.pages.main, title: '' } },
      },
    });
    expect(found(problems, 'site', 'main.title')?.detail).toBe('blank');
  });

  it('a description too short to be worth showing', () => {
    const problems = problemsOf({
      site: {
        ...sound.site,
        pages: { ...sound.site.pages, main: { ...sound.site.pages.main, description: 'Curto.' } },
      },
    });
    expect(found(problems, 'site', 'main.description')?.detail).toContain('wanted');
  });

  it('an og:locale with no territory', () => {
    const problems = problemsOf({ site: { ...sound.site, ogLocale: 'pt' } });
    expect(found(problems, 'site', 'ogLocale')?.detail).toContain('territory');
  });

  it('an hreflang that is not a language tag', () => {
    // Starts with the right language, so it gets past the "declare yourself" check below and
    // reaches the well-formedness one.
    const problems = problemsOf({ site: { ...sound.site, hreflang: 'pt-!' } });
    expect(found(problems, 'site', 'hreflang')?.detail).toContain('not a valid language tag');
  });

  it('an hreflang or og:locale for a different language altogether', () => {
    // Valid BCP 47 and completely wrong: search engines would hand Portuguese readers to the
    // German cluster, and nothing else in the build compares these to the language they are on.
    expect(
      found(problemsOf({ site: { ...sound.site, hreflang: 'de' } }), 'site', 'hreflang')?.detail,
    ).toContain('is not pt');
    expect(
      found(problemsOf({ site: { ...sound.site, ogLocale: 'ja_JP' } }), 'site', 'ogLocale')?.detail,
    ).toContain('is not pt');
  });

  it('a manifest left in English, which is the installed app’s own name', () => {
    const problems = problemsOf({
      site: {
        ...sound.site,
        manifest: { ...sound.site.manifest, name: sound.english.site.manifest.name },
      },
    });
    expect(found(problems, 'site', 'manifest.name')?.detail).toContain('still the English');
  });

  it('a site name left in English', () => {
    const problems = problemsOf({ site: { ...sound.site, siteName: sound.english.site.siteName } });
    expect(found(problems, 'site', 'siteName')?.detail).toContain('still the English');
  });

  it('a language that calls itself by the English name, or tags itself as another', () => {
    expect(
      found(problemsOf({ endonym: sound.english.endonym }), 'locale', 'endonym')?.detail,
    ).toContain('still the English');
    expect(found(problemsOf({ endonym: '  ' }), 'locale', 'endonym')?.detail).toContain('blank');
    expect(found(problemsOf({ tag: 'de-DE' }), 'locale', 'tag')?.detail).toContain('is not pt');
  });

  it('a share picture that reuses English’s URL', () => {
    const problems = problemsOf({
      site: {
        ...sound.site,
        socialImage: { ...sound.site.socialImage, file: sound.english.site.socialImage.file },
      },
    });
    expect(found(problems, 'site', 'socialImage.file')?.detail).toContain('its own name');
  });

  it('a stand-in share picture that does not admit to being one', () => {
    const withoutFlag = { ...sound.site.socialImage };
    delete withoutFlag.placeholder;
    const problems = problemsOf({ site: { ...sound.site, socialImage: withoutFlag } });
    expect(found(problems, 'site', 'socialImage')?.detail).toContain('placeholder: true');
  });

  it('a name too long for a home screen', () => {
    const problems = problemsOf({
      site: {
        ...sound.site,
        manifest: { ...sound.site.manifest, shortName: 'Referências Cruzadas da Bíblia' },
      },
    });
    expect(found(problems, 'site', 'manifest.shortName')?.detail).toContain('home screen');
  });

  it('an acceptance table too thin to have been read by anyone', () => {
    const problems = problemsOf({ acceptance: sound.acceptance.slice(0, 1) });
    expect(found(problems, 'acceptance', 'pt')?.detail).toContain(String(MINIMUM_ACCEPTANCE_CASES));
  });

  it('an acceptance case with no note saying why it is there', () => {
    const acceptance: readonly AcceptanceCase[] = [
      ...sound.acceptance,
      { typed: 'Mc 1:1', expect: 'Mark.1.1', note: '' },
    ];
    expect(found(problemsOf({ acceptance }), 'acceptance', 'Mc 1:1')?.detail).toContain('no note');
  });

  it('an acceptance case that no longer holds', () => {
    const acceptance: readonly AcceptanceCase[] = sound.acceptance.map((entry) =>
      entry.typed === 'Jo 3:16' ? { ...entry, expect: 'Job.3.16' } : entry,
    );
    expect(found(problemsOf({ acceptance }), 'acceptance', 'Jo 3:16')?.detail).toBe(
      'expected Job.3.16, got John.3.16',
    );
  });

  /**
   * The case this whole table exists for. `bookNameCollisions` stays empty here and every other
   * check passes: taking `Jo` away from João moves it to Jó without a word, and only a case that
   * names the answer notices.
   */
  it('a change that quietly moves “Jo” from João to Jó', () => {
    const books = {
      ...sound.books,
      John: { ...sound.books.John, abbreviation: 'Joa', aliases: ['joao'] },
    };
    expect(localeProblems({ ...sound, books }).some(({ where }) => where === 'books')).toBe(false);
    expect(resolve('Jo 3:16', books)).toBe('Job.3.16');
    expect(found(localeProblems({ ...sound, books }), 'acceptance', 'Jo 3:16')?.detail).toBe(
      'expected John.3.16, got Job.3.16',
    );
  });

  it('a message that is a plain string where English takes arguments', () => {
    const problems = problemsOf({
      messages: {
        ...sound.messages,
        // Deliberately the wrong shape: a translator who wrote the sentence out instead of
        // keeping the function, and so lost the book the reader typed. The compiler stops this
        // in a real catalogue; the cast is what lets the check itself be tested.
        'reference.unknownBook': 'Livro desconhecido.' as unknown as (query: string) => string,
      },
    });
    expect(found(problems, 'messages', 'reference.unknownBook')?.detail).toContain(
      'should take arguments',
    );
  });

  it('a message with no singular, where English has one', () => {
    // `+ 1 versículos`. Not blank, not English, prints its argument — it passed everything
    // until the forms were compared against English's.
    const problems = problemsOf({
      messages: {
        ...sound.messages,
        'panel.moreVerses': (count: string) => `+ ${count} versículos`,
      },
    });
    expect(found(problems, 'messages', 'panel.moreVerses')?.detail).toContain(
      'the same for one as for many',
    );
  });

  it('a message that produces nothing at all', () => {
    const problems = problemsOf({
      messages: { ...sound.messages, 'stats.verses': () => [] },
    });
    expect(found(problems, 'messages', 'stats.verses')?.detail).toBe('produced nothing');
  });

  it('an identity dodge that changes nothing a reader can see', () => {
    // Each of these used to pass: a value is "different from English" by one invisible
    // character and entirely untranslated.
    for (const dodge of ['Close ', 'Close\u200b', 'Close\u00a0', 'CLOSE', ' close ']) {
      const problems = problemsOf({ messages: { ...sound.messages, 'panel.close': dodge } });
      expect(found(problems, 'messages', 'panel.close')?.detail, JSON.stringify(dodge)).toContain(
        'still the English words',
      );
    }
  });

  it('a book with no short form, which would be labelled by its English OSIS id', () => {
    const withoutShortForm = { ...sound.books.Matt };
    delete withoutShortForm.abbreviation;
    const problems = problemsOf({ books: { ...sound.books, Matt: withoutShortForm } });
    expect(found(problems, 'books', 'Matt')?.detail).toContain('English OSIS id');
  });

  it('a book abbreviation or alias left blank', () => {
    expect(
      found(
        problemsOf({ books: { ...sound.books, Gen: { ...sound.books.Gen, abbreviation: ' ' } } }),
        'books',
        'Gen',
      )?.detail,
    ).toBe('blank abbreviation');
    expect(
      found(
        problemsOf({ books: { ...sound.books, Gen: { ...sound.books.Gen, aliases: ['gn', ''] } } }),
        'books',
        'Gen',
      )?.detail,
    ).toBe('blank alias');
  });

  it('a genre left blank', () => {
    const problems = problemsOf({ genres: { ...sound.genres, law: '  ' } });
    expect(found(problems, 'genres', 'law')?.detail).toBe('blank');
  });

  it('a device label left blank, or a step that says nothing', () => {
    expect(
      found(
        problemsOf({
          install: { ...sound.install, ios: { ...sound.install.ios, label: '' } },
        }),
        'install',
        'ios',
      )?.detail,
    ).toBe('blank label');
    const [firstStep] = sound.install.ios.steps;
    expect(
      found(
        problemsOf({
          install: {
            ...sound.install,
            ios: {
              ...sound.install.ios,
              steps: firstStep ? [{ ...firstStep, text: '' }] : [],
            },
          },
        }),
        'install',
        'ios.0',
      )?.detail,
    ).toBe('step says nothing');
  });

  it('a site name or a manifest field left blank', () => {
    expect(
      found(problemsOf({ site: { ...sound.site, siteName: ' ' } }), 'site', 'siteName')?.detail,
    ).toBe('blank');
    expect(
      found(
        problemsOf({
          site: { ...sound.site, manifest: { ...sound.site.manifest, description: '' } },
        }),
        'site',
        'manifest.description',
      )?.detail,
    ).toBe('blank');
  });

  it('a share picture that is not a picture', () => {
    const problems = problemsOf({
      site: { ...sound.site, socialImage: { ...sound.site.socialImage, file: 'preview.svg' } },
    });
    expect(found(problems, 'site', 'socialImage.file')?.detail).toContain('.jpg or .png');
  });

  it('a share picture called a placeholder with nothing standing in for it', () => {
    const problems = problemsOf({
      site: {
        ...sound.site,
        socialImage: { file: 'social-preview.pt.jpg', placeholder: true, alt: 'Arcos' },
      },
    });
    expect(found(problems, 'site', 'socialImage')?.detail).toContain('set from');
  });

  it('a share picture whose alt text is still English', () => {
    const problems = problemsOf({
      site: {
        ...sound.site,
        socialImage: { ...sound.site.socialImage, alt: sound.english.site.socialImage.alt },
      },
    });
    expect(found(problems, 'site', 'socialImage.alt')?.detail).toContain('still the English');
  });

  /**
   * What `npm run locale:new` leaves behind: every file in place and compiling, every word still
   * English. This is the state a contributor starts from, and the gate has to describe it rather
   * than merely reject it — the list it prints is the to-do list.
   */
  it('a language freshly scaffolded, where nothing has been translated yet', () => {
    const problems = localeProblems({
      ...sound,
      id: 'xx',
      messages: sound.english.messages,
      books: sound.english.books,
      genres: sound.english.genres,
      install: sound.english.install,
      site: sound.english.site,
      acceptance: [],
      sameAsEnglish: {},
    });
    // Named one by one, not just counted: the report is what a contributor works through.
    const report = describeProblems('xx', problems);
    expect(report).toContain('messages.app.name');
    expect(report).toContain('books.Gen.name');
    expect(report).toContain('genres.law');
    expect(report).toContain('install.ios.label');
    expect(report).toContain('site.main.title');
    expect(report).toContain('acceptance.xx');
    // Every message, every book and every genre is reported, so nothing is silently accepted.
    const where = (name: string) => problems.filter((problem) => problem.where === name).length;
    expect(where('messages')).toBeGreaterThan(100);
    // A name left in English for each, and a short form missing for each: English itself needs
    // none, so a language that copied it has sixty-six books labelled by their OSIS ids.
    expect(where('books')).toBe(132);
    expect(where('genres')).toBe(10);
  });

  /**
   * The unaccented spelling has to be pinned, and the requirement cannot be edited away.
   *
   * Two earlier versions of this rule both had the same hole. Measuring coverage on the folded
   * spelling let `Jó 1:1` stand in for `Jo 3:16`. Deriving the requirement from which spellings
   * two books currently compete for was worse, because the very edit that breaks `Jo` — taking
   * it away from João — is the edit that ends the competition, so the demand vanished exactly
   * when it was needed. It is derived from each book's own accents now, and accents do not move.
   */
  it('a language whose accents hide a book, with the unaccented spelling left unpinned', () => {
    const withoutUnaccented = sound.acceptance.filter((entry) => entry.typed !== 'Jo 3:16');
    // The accented case is still there, and is deliberately not enough on its own.
    expect(withoutUnaccented.some((entry) => entry.typed === 'Jó 1:1')).toBe(true);
    expect(
      found(problemsOf({ acceptance: withoutUnaccented }), 'acceptance', 'jo')?.detail,
    ).toContain('typed “jo” without its accent');

    // And the demand survives the edit that used to make it disappear: once João stops claiming
    // `jo` the two books no longer compete, but `Jó` is still spelled with an accent, so a case
    // typing `jo` is still required — and the one in the table now fails, which is the point.
    const books = {
      ...sound.books,
      John: { ...sound.books.John, abbreviation: 'Joa', aliases: ['joao'] },
    };
    expect(contestedSpellings(books)).toEqual([]);
    expect(resolve('Jo 3:16', books)).toBe('Job.3.16');
    expect(
      found(problemsOf({ acceptance: withoutUnaccented, books }), 'acceptance', 'jo')?.detail,
    ).toContain('typed “jo” without its accent');
    expect(
      localeProblems({ ...sound, books }).find(({ where }) => where === 'acceptance')?.detail,
    ).toBe('expected John.3.16, got Job.3.16');
  });

  it('an acceptance table that counts but checks nothing', () => {
    // Six rows, all about John, which used to satisfy the minimum on count alone.
    const repeated: readonly AcceptanceCase[] = [
      { typed: 'Jo 3:16', expect: 'John.3.16', note: 'x' },
      { typed: 'Jo 3:17', expect: 'John.3.17', note: 'x' },
      { typed: 'Jo 3:18', expect: 'John.3.18', note: 'x' },
      { typed: 'Jo 1:1', expect: 'John.1.1', note: 'x' },
      { typed: 'Jo 1:2', expect: 'John.1.2', note: 'x' },
      { typed: 'Jo 1:3', expect: 'John.1.3', note: 'x' },
    ];
    const problems = problemsOf({ acceptance: repeated });
    expect(problems.some(({ detail }) => detail.includes('different books'))).toBe(true);
  });

  it('the same acceptance case written twice', () => {
    const [first] = sound.acceptance;
    expect(first).toBeDefined();
    const acceptance: readonly AcceptanceCase[] = first
      ? [...sound.acceptance, first]
      : sound.acceptance;
    expect(found(problemsOf({ acceptance }), 'acceptance', first?.typed ?? '')?.detail).toBe(
      'the same case twice',
    );
  });

  it('a language freshly scaffolded, where nothing has been translated yet', () => {
    const problems = localeProblems({
      ...sound,
      id: 'xx',
      messages: sound.english.messages,
      books: sound.english.books,
      genres: sound.english.genres,
      install: sound.english.install,
      site: sound.english.site,
      acceptance: [],
      sameAsEnglish: {},
    });
    // Named one by one, not just counted: the report is what a contributor works through.
    const report = describeProblems('xx', problems);
    expect(report).toContain('messages.app.name');
    expect(report).toContain('books.Gen.name');
    expect(report).toContain('genres.law');
    expect(report).toContain('install.ios.label');
    expect(report).toContain('site.main.title');
    expect(report).toContain('acceptance.xx');
    // Every message, every book and every genre is reported, so nothing is silently accepted.
    const where = (name: string) => problems.filter((problem) => problem.where === name).length;
    expect(where('messages')).toBeGreaterThan(100);
    // A name left in English for each, and a short form missing for each: English itself needs
    // none, so a language that copied it has sixty-six books labelled by their OSIS ids.
    expect(where('books')).toBe(132);
    expect(where('genres')).toBe(10);
  });
});
