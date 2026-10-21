import { bookName, bookReferenceName } from '../core/bible/reference-format.ts';
import type { ReferenceParseError } from '../core/bible/reference-parse.ts';
import type { Localization } from './use-locale.tsx';

/**
 * Puts a failed reference into the reader's own words. The parser reports what went wrong as
 * data; the sentence is built here, where the language is known.
 */
export function describeReferenceError(
  error: ReferenceParseError,
  { t, books, n }: Localization,
): string {
  switch (error.kind) {
    case 'unreadable':
      return t('reference.unreadable');
    case 'unknown-book':
      return t('reference.unknownBook')(error.query);
    case 'ambiguous-book': {
      const names = error.candidates.map((book) => bookName(book, books));
      const last = names.at(-1) ?? '';
      const list =
        names.length <= 1 ? last : `${names.slice(0, -1).join(', ')}${t('reference.or')}${last}`;
      return t('reference.ambiguous')(error.query, list);
    }
    case 'no-such-chapter':
      return t('reference.chapters')(
        bookName(error.book, books),
        n(error.chapters),
        error.chapters,
      );
    case 'no-such-verse':
      return t('reference.verses')(
        bookReferenceName(error.book, books),
        n(error.chapter),
        n(error.verses),
        error.verses,
      );
  }
}
