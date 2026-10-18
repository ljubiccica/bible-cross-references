import { describe, expect, it } from 'vitest';
import { GENRES } from '../core/bible/genres.ts';
import { toPassageOsisId } from '../core/bible/passage.ts';
import { KJV_VERSIFICATION as kjv } from '../core/bible/versification.ts';
import { LOCALE_IDS } from '../i18n/locale-id.ts';
import { TRANSLATION_MANIFESTS, DEFAULT_TRANSLATION_ID } from '../translations/registry.ts';
import { VOTE_THRESHOLDS } from '../visualizations/shared/link-filter.ts';
import { explorerUrl, parseExplorerUrl, type ViewRoute } from './explorer-location.ts';

/**
 * The URL is this app's only saved state, and readers share it: a link to a verse goes into a
 * message, a bookmark, a tweet, a sermon handout. Nobody can edit those once they are sent, so
 * the shapes below are a contract rather than a description.
 *
 * **A failure here means a link somebody already saved has stopped working.** That is almost
 * never the right change: fix the code instead. Adding a row is free and always welcome; editing
 * or deleting one needs a reason that survives the question "whose bookmark does this break?".
 */

const ROUTES: readonly [ViewRoute<'arcs'>, ViewRoute<'threads'>] = [
  { id: 'arcs', path: '' },
  { id: 'threads', path: 'threads/' },
];

/** The deployed base path, which every real link carries. */
const BASE = '/bible-cross-references/';

interface UrlState {
  readonly view: 'arcs' | 'threads';
  readonly ref: string | null;
  readonly minVotes: number;
  readonly hidden: readonly string[];
  readonly translation: string;
  readonly locale: string;
}

function read(url: string, base = BASE): UrlState {
  const location = parseExplorerUrl(
    new URL(url, 'https://trekhleb.dev'),
    base,
    ROUTES,
    kjv,
    DEFAULT_TRANSLATION_ID,
    'en',
  );
  return {
    view: location.view,
    ref: location.passage === null ? null : toPassageOsisId(location.passage, kjv),
    minVotes: location.filter.minVotes,
    hidden: [...location.filter.hiddenGenres].sort(),
    translation: location.translation,
    locale: location.locale,
  };
}

/** What a plain visit to the site means, which every row below starts from. */
const DEFAULTS: UrlState = {
  view: 'arcs',
  ref: null,
  minVotes: 4,
  hidden: [],
  translation: 'bsb',
  locale: 'en',
};

const SAVED: readonly (readonly [string, Partial<UrlState>])[] = [
  // The bare site, in all the shapes a host and a browser produce.
  ['/bible-cross-references/', {}],
  ['/bible-cross-references/index.html', {}],
  ['/bible-cross-references/?', {}],

  // The second view, including the two paths a static host answers for it.
  ['/bible-cross-references/threads/', { view: 'threads' }],
  ['/bible-cross-references/threads', { view: 'threads' }],
  ['/bible-cross-references/threads/index.html', { view: 'threads' }],

  // A verse and a chapter — the two things a reader links to most.
  ['/bible-cross-references/?ref=John.3.16', { ref: 'John.3.16' }],
  ['/bible-cross-references/?ref=Gen.1.1', { ref: 'Gen.1.1' }],
  ['/bible-cross-references/?ref=Isa.53', { ref: 'Isa.53' }],
  ['/bible-cross-references/?ref=Ps.23', { ref: 'Ps.23' }],
  ['/bible-cross-references/?ref=Rev.22.21', { ref: 'Rev.22.21' }],
  ['/bible-cross-references/threads/?ref=John.3.16', { view: 'threads', ref: 'John.3.16' }],

  // The filter.
  ['/bible-cross-references/?votes=all', { minVotes: -Infinity }],
  ['/bible-cross-references/?votes=0', { minVotes: 0 }],
  ['/bible-cross-references/?votes=1', { minVotes: 1 }],
  ['/bible-cross-references/?votes=2', { minVotes: 2 }],
  ['/bible-cross-references/?votes=3', { minVotes: 3 }],
  ['/bible-cross-references/?votes=4', { minVotes: 4 }],
  ['/bible-cross-references/?votes=5', { minVotes: 5 }],
  ['/bible-cross-references/?votes=10', { minVotes: 10 }],
  ['/bible-cross-references/?votes=20', { minVotes: 20 }],
  ['/bible-cross-references/?votes=50', { minVotes: 50 }],
  ['/bible-cross-references/?votes=100', { minVotes: 100 }],
  ['/bible-cross-references/?hide=law', { hidden: ['law'] }],
  ['/bible-cross-references/?hide=law,history,poetry', { hidden: ['history', 'law', 'poetry'] }],
  ['/bible-cross-references/?hide=major-prophets', { hidden: ['major-prophets'] }],
  ['/bible-cross-references/?hide=minor-prophets', { hidden: ['minor-prophets'] }],
  ['/bible-cross-references/?hide=gospels', { hidden: ['gospels'] }],
  ['/bible-cross-references/?hide=acts', { hidden: ['acts'] }],
  ['/bible-cross-references/?hide=pauline-epistles', { hidden: ['pauline-epistles'] }],
  ['/bible-cross-references/?hide=general-epistles', { hidden: ['general-epistles'] }],
  ['/bible-cross-references/?hide=revelation', { hidden: ['revelation'] }],
  [
    // Every genre hidden at once, which the legend lets a reader do.
    '/bible-cross-references/?hide=law,history,poetry,major-prophets,minor-prophets,gospels,acts,pauline-epistles,general-epistles,revelation',
    {
      hidden: [
        'acts',
        'general-epistles',
        'gospels',
        'history',
        'law',
        'major-prophets',
        'minor-prophets',
        'pauline-epistles',
        'poetry',
        'revelation',
      ],
    },
  ],

  // The translation.
  ['/bible-cross-references/?t=kjv', { translation: 'kjv' }],
  ['/bible-cross-references/?t=bsb', { translation: 'bsb' }],
  ['/bible-cross-references/?t=blivre', { translation: 'blivre' }],

  // The language.
  ['/bible-cross-references/?lang=pt', { locale: 'pt' }],
  ['/bible-cross-references/?lang=en', { locale: 'en' }],

  // Everything at once, in both orders a URL can carry them.
  [
    '/bible-cross-references/threads/?ref=John.3.16&votes=10&hide=law,acts&t=kjv&lang=pt',
    {
      view: 'threads',
      ref: 'John.3.16',
      minVotes: 10,
      hidden: ['acts', 'law'],
      translation: 'kjv',
      locale: 'pt',
    },
  ],
  [
    '/bible-cross-references/threads/?lang=pt&t=kjv&hide=acts,law&votes=10&ref=John.3.16',
    {
      view: 'threads',
      ref: 'John.3.16',
      minVotes: 10,
      hidden: ['acts', 'law'],
      translation: 'kjv',
      locale: 'pt',
    },
  ],

  // A link that picked up a tracking parameter on its way through a social network.
  ['/bible-cross-references/?ref=John.3.16&utm_source=twitter', { ref: 'John.3.16' }],
  ['/bible-cross-references/?ref=John.3.16#anything', { ref: 'John.3.16' }],
];

describe('saved URLs keep working', () => {
  it.each(SAVED)('%s', (url, expected) => {
    expect(read(url)).toEqual({ ...DEFAULTS, ...expected });
  });

  it('covers every view, every vote threshold, every genre and every language', () => {
    // A new one of any of these without a row above means this contract has a blind spot.
    const rows = SAVED.map(([url]) => url).join(' ');
    for (const route of ROUTES.slice(1)) {
      expect(rows).toContain(route.path);
    }
    for (const threshold of VOTE_THRESHOLDS) {
      expect(rows).toMatch(
        new RegExp(`votes=${threshold === -Infinity ? 'all' : String(threshold)}\\b`),
      );
    }
    for (const { id } of GENRES) {
      expect(rows).toContain(id);
    }
    for (const id of LOCALE_IDS) {
      expect(rows).toContain(`lang=${id}`);
    }
    for (const { id } of TRANSLATION_MANIFESTS) {
      expect(rows).toContain(`t=${id}`);
    }
  });
});

describe('a URL the app builds reads back as itself', () => {
  it.each(SAVED)('%s', (url) => {
    const state = read(url);
    const location = parseExplorerUrl(
      new URL(url, 'https://trekhleb.dev'),
      BASE,
      ROUTES,
      kjv,
      DEFAULT_TRANSLATION_ID,
      'en',
    );
    const route = ROUTES.find((candidate) => candidate.id === location.view) ?? ROUTES[0];
    // `null` keeps the translation in the URL whatever it is, which is what a shared link needs.
    const rebuilt = explorerUrl(route, location, BASE, kjv, null);
    expect(read(rebuilt)).toEqual(state);
  });
});

describe('a hostile URL cannot reach the page', () => {
  // Every parameter is read into a closed set of values, so there is nothing to escape into: the
  // worst a crafted link can do is name something the app does not have and be ignored.
  const ATTACKS = [
    '/bible-cross-references/?ref=<script>alert(1)</script>',
    '/bible-cross-references/?ref=javascript:alert(1)',
    "/bible-cross-references/?ref=');alert(1);//",
    '/bible-cross-references/?ref=John.3.16"><img src=x onerror=alert(1)>',
    '/bible-cross-references/?ref=../../../../etc/passwd',
    '/bible-cross-references/?ref=%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    '/bible-cross-references/?t=javascript:alert(1)',
    '/bible-cross-references/?t=https://evil.example/steal',
    '/bible-cross-references/?lang=javascript:alert(1)',
    '/bible-cross-references/?lang=../../en',
    '/bible-cross-references/?hide=<script>',
    '/bible-cross-references/?votes=Infinity',
    '/bible-cross-references/?votes=1e999',
    '/bible-cross-references/?votes[]=1',
    '/bible-cross-references/?__proto__=polluted',
    '/bible-cross-references/?constructor=polluted',
    '/bible-cross-references/?ref=__proto__',
    '/bible-cross-references/?ref=constructor',
  ];

  it.each(ATTACKS)('%s falls back to a safe default', (url) => {
    expect(read(url)).toEqual(DEFAULTS);
  });

  it('leaves Object.prototype alone', () => {
    read('/bible-cross-references/?__proto__[polluted]=yes&ref=__proto__');
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('reads an absurdly long parameter without hanging', () => {
    // The book group's nested quantifiers are quadratic, so a long run of letters is the shape
    // that would show it. A tenth of a second is far below anything a reader would notice.
    const started = performance.now();
    expect(read(`/bible-cross-references/?ref=${'a'.repeat(50_000)}`)).toEqual(DEFAULTS);
    expect(performance.now() - started).toBeLessThan(2000);
  });

  it('ignores a parameter it has never heard of', () => {
    expect(read('/bible-cross-references/?ref=John.3.16&admin=true&debug=1')).toEqual({
      ...DEFAULTS,
      ref: 'John.3.16',
    });
  });
});

describe('a URL from another deployment', () => {
  it('shows the home view when the path is outside the base', () => {
    expect(read('/somewhere-else/?ref=John.3.16').view).toBe('arcs');
  });

  it('still reads the query, because the parameters do not depend on the path', () => {
    expect(read('/somewhere-else/?ref=John.3.16').ref).toBe('John.3.16');
  });
});
