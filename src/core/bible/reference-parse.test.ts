import { describe, expect, it } from 'vitest';
import { parseReference } from './reference-parse.ts';
import { KJV_VERSIFICATION } from './versification.ts';
import { enBooks } from '../../i18n/books/en.ts';
import { ptBooks } from '../../i18n/books/pt.ts';

const parse = (input: string) => parseReference(input, KJV_VERSIFICATION, enBooks);

describe('parseReference', () => {
  it.each([
    ['John 3:16', { book: 'John', chapter: 3, verse: 16 }],
    ['jn 3 16', { book: 'John', chapter: 3, verse: 16 }],
    ['john3:16', { book: 'John', chapter: 3, verse: 16 }],
    ['1 Cor 13:4', { book: '1Cor', chapter: 13, verse: 4 }],
    ['1co13.4', { book: '1Cor', chapter: 13, verse: 4 }],
    ['Gen.1.1', { book: 'Gen', chapter: 1, verse: 1 }],
    ['Song of Solomon 2:1', { book: 'Song', chapter: 2, verse: 1 }],
    ['  II Kings 2 : 11 ', { book: '2Kgs', chapter: 2, verse: 11 }],
    ['Ps 23', { book: 'Ps', chapter: 23, verse: undefined }],
  ])('parses %j', (input, reference) => {
    expect(parse(input)).toEqual({ ok: true, reference });
  });

  it.each([
    ['', { kind: 'unreadable' }],
    ['John 3:16-18', { kind: 'unreadable' }],
    ['Hezekiah 1:1', { kind: 'unknown-book', query: 'Hezekiah' }],
    [
      'Jo 1:1',
      {
        kind: 'ambiguous-book',
        query: 'Jo',
        candidates: ['Josh', 'Job', 'Joel', 'Jonah', 'John'],
      },
    ],
    ['Genesis 51:1', { kind: 'no-such-chapter', book: 'Gen', chapters: 50 }],
    ['Psalms 23:7', { kind: 'no-such-verse', book: 'Ps', chapter: 23, verses: 6 }],
    ['John 3:0', { kind: 'no-such-verse', book: 'John', chapter: 3, verses: 36 }],
  ])('rejects %j', (input, error) => {
    expect(parse(input)).toEqual({ ok: false, error });
  });

  it('reads a reference written with accents, which is how Portuguese is typed', () => {
    for (const input of ['Gênesis 1:1', 'genesis 1:1', 'Êxodo 3:14', 'João 3:16', 'Jó 1:1']) {
      expect(parseReference(input, KJV_VERSIFICATION, ptBooks).ok).toBe(true);
    }
  });

  it('reads Jo as João and Jó as Job, which is the difference the accent makes', () => {
    const book = (input: string) => {
      const result = parseReference(input, KJV_VERSIFICATION, ptBooks);
      return result.ok ? result.reference.book : result.error.kind;
    };
    expect(book('Jo 3:16')).toBe('John');
    expect(book('Jó 1:1')).toBe('Job');
  });
});
