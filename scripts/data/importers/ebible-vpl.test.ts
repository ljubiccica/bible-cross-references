import { describe, expect, it } from 'vitest';
import { BOOKS } from '../../../src/core/bible/books.ts';
import { KJV_CHAPTER_VERSE_COUNTS } from '../../../src/core/bible/kjv-versification.ts';
import { PROVENANCE, verseIndex } from '../../../src/test-utils/fixtures.ts';
import { BOOK_CODES, importEbibleVerseLines } from './ebible-vpl.ts';

/** Builds a complete eBible-style file; `transform` may rewrite or drop (return `null`) lines. */
function createVerseLines(transform: (line: string) => string | null = (line) => line): string {
  const lines = BOOKS.flatMap((book, bookIndex) =>
    KJV_CHAPTER_VERSE_COUNTS[book.id].flatMap((verseCount, chapterOffset) =>
      Array.from({ length: verseCount }, (_, verseOffset) => {
        const reference = `${BOOK_CODES[bookIndex] ?? ''} ${chapterOffset + 1}:${verseOffset + 1}`;
        return transform(`${reference} Text of ${reference}.`);
      }),
    ),
  ).filter((line) => line !== null);
  return ['﻿' + lines.join('\r\n'), ''].join('\r\n');
}

describe('importEbibleVerseLines', () => {
  it('imports every verse in canonical order', () => {
    const file = importEbibleVerseLines(createVerseLines(), 'kjv', PROVENANCE);
    expect(file).toMatchObject({
      format: 'translation-text',
      translationId: 'kjv',
      versification: 'kjv',
      provenance: PROVENANCE,
      notices: [],
    });
    expect(file.verses).toHaveLength(31102);
    expect(file.verses[0]).toBe('Text of GEN 1:1.');
    expect(file.verses[verseIndex('Ps', 23, 1)]).toBe('Text of PSA 23:1.');
    expect(file.verses.at(-1)).toBe('Text of REV 22:21.');
  });

  it('drops the typographic marks these editions carry, keeping the wording', () => {
    const file = importEbibleVerseLines(
      createVerseLines((line) =>
        line.startsWith('GEN 1:1 ') ? 'GEN 1:1 ¶ In the beginning [was] the Word.' : line,
      ),
      'kjv',
      PROVENANCE,
    );
    expect(file.verses[0]).toBe('In the beginning was the Word.');
  });

  it('keeps omitted verses as empty text and reports them', () => {
    const file = importEbibleVerseLines(
      createVerseLines((line) => (line.startsWith('MAT 17:21 ') ? 'MAT 17:21' : line)),
      'kjv',
      PROVENANCE,
    );
    expect(file.verses[verseIndex('Matt', 17, 21)]).toBe('');
    expect(file.notices).toEqual([
      expect.objectContaining({ level: 'info', count: 1, examples: ['Matt.17.21'] }),
    ]);
  });

  it.each([
    [
      'an unknown book code',
      (text: string) => text.replace('GEN 1:1 ', 'GENESIS 1:1 '),
      'unknown book code "GENESIS"',
    ],
    [
      'a verse outside the versification',
      (text: string) => text.replace('GEN 1:1 ', 'GEN 1:99 '),
      'Gen.1.99 is not in the KJV versification',
    ],
    [
      'a duplicate verse',
      (text: string) => text.replace('GEN 1:2 ', 'GEN 1:1 '),
      'duplicate verse Gen.1.1',
    ],
    [
      'a malformed line',
      (text: string) => text.replace('GEN 1:1 ', 'GEN 1-1 '),
      'unrecognized format',
    ],
  ])('rejects %s', (_, corrupt, message) => {
    expect(() => importEbibleVerseLines(corrupt(createVerseLines()), 'kjv', PROVENANCE)).toThrow(
      message,
    );
  });

  it('rejects incomplete text', () => {
    const text = createVerseLines((line) => (line.startsWith('JUD 1:') ? null : line));
    expect(() => importEbibleVerseLines(text, 'kjv', PROVENANCE)).toThrow(
      '25 verses are missing, e.g. Jude.1.1',
    );
  });
});
