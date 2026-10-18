import type { BookId } from '../../core/bible/books.ts';

/** What one book is called in one language, and what a reader may type to find it. */
export interface LocalizedBook {
  /** The book's name, e.g. `Genesis`, `Gênesis`. */
  readonly name: string;
  /** The name used when citing one passage, where it differs (`Psalms` → `Psalm 23:1`). */
  readonly referenceName?: string;
  /**
   * A short form for places with no room for the name — the arcs axis, where sixty-six labels
   * share one line. Falls back to the OSIS ID, which reads well enough in English (`Matt`,
   * `Rev`) and not at all in anything else.
   */
  readonly abbreviation?: string;
  /**
   * Extra spellings accepted when parsing. They are normalized before use — folded to lowercase
   * with accents and spaces removed — so an entry needs no accents of its own, and a reader who
   * types `genesis` for `Gênesis` is understood.
   */
  readonly aliases: readonly string[];
}

export type BookNames = Readonly<Record<BookId, LocalizedBook>>;
