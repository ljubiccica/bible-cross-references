import { BOOKS } from '../../core/bible/books.ts';
import type { BookId } from '../../core/bible/books.ts';
import type { BookNames, LocalizedBook } from './types.ts';

/**
 * English book names, taken from the canon itself rather than written out again: the English
 * names are part of `BOOKS`, which is also where the OSIS IDs and the chapter counts live.
 */
export const enBooks: BookNames = Object.fromEntries(
  BOOKS.map((book): readonly [BookId, LocalizedBook] => [
    book.id,
    {
      name: book.name,
      ...(book.referenceName === undefined ? {} : { referenceName: book.referenceName }),
      aliases: book.aliases,
    },
  ]),
) as BookNames;
