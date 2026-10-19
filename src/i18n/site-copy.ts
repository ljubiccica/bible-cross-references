import type { LocaleId } from './locale-id.ts';

/**
 * Everything the pages themselves say, in every language: the words a reader never sees but a
 * crawler and a link preview do.
 *
 * Kept out of `messages/`, which the app bundle ships, because none of this is read at run time —
 * it is baked into one HTML file per language at build time. Kept out of `vite/`, because it is
 * translated copy and belongs with the rest of the translated copy, where a translator will look
 * for it.
 *
 * Every field here is required of every language. A locale that is missing one does not compile,
 * and `completeness.ts` checks the things a type cannot see: that nothing is blank, and that
 * nothing was left in English by accident.
 */

/** The pages that exist in every language. `debug/` is not one: it is unlisted and English-only. */
export const SITE_PAGE_IDS = ['main', 'threads'] as const;
export type SitePageId = (typeof SITE_PAGE_IDS)[number];

/** The path a page occupies under its language, e.g. `''` for the home page, `threads/`. */
export const SITE_PAGE_PATHS: Readonly<Record<SitePageId, string>> = {
  main: '',
  threads: 'threads/',
};

/** What one page's head says. */
export interface PageCopy {
  /** The `<title>`, which is also `og:title` and the Twitter card's title. */
  readonly title: string;
  /** The `<meta name="description">`, which is also `og:description`. */
  readonly description: string;
  /** What a reader without JavaScript is told. */
  readonly noscript: string;
}

/** The picture a link preview shows, per language. */
export interface SocialImage {
  /** The file as it is published, e.g. `social-preview.pt.jpg`. */
  readonly file: string;
  /**
   * The file in `public/` to publish it from, where this language has no picture of its own yet.
   * The build copies it under the name above, so the URL is already the final one and the real
   * picture can replace it later without any link changing.
   */
  readonly from?: string;
  /**
   * Set where `from` is another language's picture. It makes a deliberate stand-in visible in a
   * review, and `completeness.ts` requires it: a picture that merely happens to be identical to
   * English is a mistake, one that says so is a decision.
   */
  readonly placeholder?: true;
  /** `og:image:alt`. Translated from the start, whatever the picture shows: it is text, and it is read aloud. */
  readonly alt: string;
}

export interface SiteCopy {
  /** The site's name in this language, for `og:site_name` and the installed app. */
  readonly siteName: string;
  /**
   * The `hreflang` this language claims, as the base language rather than a region: one set of
   * Portuguese words serves Lisbon and São Paulo, matching `LOCALE_IDS`. Claiming `pt-BR` here
   * would leave a reader in Portugal on the English page in search results.
   */
  readonly hreflang: string;
  /**
   * `og:locale`, which unlike `hreflang` wants a territory. Brazilian Portuguese is the right
   * answer for the text the app ships (the Bíblia Livre), even where `hreflang` is pan-Portuguese.
   */
  readonly ogLocale: string;
  readonly pages: Readonly<Record<SitePageId, PageCopy>>;
  readonly manifest: {
    readonly name: string;
    /** Shown under a home-screen icon, where there is room for very little. */
    readonly shortName: string;
    readonly description: string;
  };
  readonly socialImage: SocialImage;
}

export const SITE_COPY: Readonly<Record<LocaleId, SiteCopy>> = {
  en: {
    siteName: 'Bible Cross-References',
    hreflang: 'en',
    ogLocale: 'en_US',
    pages: {
      main: {
        title: 'Bible Cross-References',
        description:
          'Explore all 344,799 Bible cross-references: every verse on one line with its links as arcs, and every chapter with threads to where its verses connect.',
        noscript:
          'Bible Cross-References draws the 344,799 cross-references between the verses of the Bible. It needs JavaScript to run.',
      },
      threads: {
        title: 'Threads · Bible Cross-References',
        description:
          "Read any chapter of the Bible while threads show where each verse's cross-references land, from Genesis to Revelation.",
        noscript:
          'Threads shows where each verse of a Bible chapter connects across the whole Bible. It needs JavaScript to run.',
      },
    },
    manifest: {
      name: 'Bible Cross-References',
      shortName: 'Cross-Refs',
      description:
        'Every cross-reference in the Bible, drawn as arcs, and every chapter with its threads.',
    },
    socialImage: {
      file: 'social-preview.jpg',
      alt: 'Arcs connecting the verses of the Bible, from Genesis to Revelation, colored by genre',
    },
  },
  pt: {
    siteName: 'Referências Cruzadas da Bíblia',
    hreflang: 'pt',
    ogLocale: 'pt_BR',
    pages: {
      main: {
        title: 'Referências Cruzadas da Bíblia',
        description:
          'Explore as 344.799 referências cruzadas da Bíblia: cada versículo em uma linha, com suas ligações em arcos, e cada capítulo com seus fios.',
        noscript:
          'Referências Cruzadas da Bíblia desenha as 344.799 referências cruzadas entre os versículos da Bíblia. É preciso ativar o JavaScript.',
      },
      threads: {
        title: 'Fios · Referências Cruzadas da Bíblia',
        description:
          'Leia qualquer capítulo da Bíblia enquanto os fios mostram onde chegam as referências cruzadas de cada versículo, de Gênesis a Apocalipse.',
        noscript:
          'Fios mostra onde cada versículo de um capítulo da Bíblia se conecta em toda a Bíblia. É preciso ativar o JavaScript.',
      },
    },
    manifest: {
      name: 'Referências Cruzadas da Bíblia',
      shortName: 'Ref. Cruzadas',
      description:
        'Todas as referências cruzadas da Bíblia, desenhadas em arcos, e cada capítulo com seus fios.',
    },
    socialImage: {
      file: 'social-preview.pt.jpg',
      // Still the English picture: its title and the book names on it are English pixels. The
      // URL is already the final one, so the Portuguese picture can replace it without changing
      // a single link — but see README: a link shared before that happens caches the English
      // card on WhatsApp and Facebook, so it is worth doing before any of this is promoted.
      from: 'social-preview.jpg',
      placeholder: true,
      alt: 'Arcos ligando os versículos da Bíblia, de Gênesis a Apocalipse, coloridos por gênero',
    },
  },
};
