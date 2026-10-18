import type { BookId } from './books.ts';
import type { VerseIndex, VerseRef } from './verse-ref.ts';
import type { BookNames } from '../../i18n/books/types.ts';
import type { Versification } from './versification.ts';

/** What a book is called on its own, e.g. `Psalms`, `Salmos`. */
export function bookName(book: BookId, names: BookNames): string {
  return names[book].name;
}

/** What a book is called inside a citation, e.g. `Psalm 23:1`, `Salmo 23:1`. */
export function bookReferenceName(book: BookId, names: BookNames): string {
  const localized = names[book];
  return localized.referenceName ?? localized.name;
}

/** Formats a verse for display, e.g. `Genesis 1:1` or `Psalm 23:4`. */
export function formatVerseRef(ref: VerseRef, names: BookNames): string {
  return `${bookReferenceName(ref.book, names)} ${String(ref.chapter)}:${String(ref.verse)}`;
}

/**
 * Formats an inclusive verse range compactly, e.g. `Romans 1:19–20`, `Genesis 1:31–2:3` or
 * `Genesis 50:26 – Exodus 1:1`.
 */
export function formatVerseRange(start: VerseRef, end: VerseRef, names: BookNames): string {
  if (start.book !== end.book) {
    return `${formatVerseRef(start, names)} – ${formatVerseRef(end, names)}`;
  }
  if (start.chapter !== end.chapter) {
    return `${formatVerseRef(start, names)}–${String(end.chapter)}:${String(end.verse)}`;
  }
  if (start.verse !== end.verse) {
    return `${formatVerseRef(start, names)}–${String(end.verse)}`;
  }
  return formatVerseRef(start, names);
}

/** Formats a verse, or an inclusive range of verses, given by canonical indices. */
export function formatVerseIndexRange(
  versification: Versification,
  names: BookNames,
  start: VerseIndex,
  end: VerseIndex = start,
): string {
  return formatVerseRange(versification.refAt(start), versification.refAt(end), names);
}
