import { describe, expect, it } from 'vitest';
import { bookNameCollisions, lookupBook, normalizeBookName } from './book-lookup.ts';
import { enBooks } from '../../i18n/books/en.ts';

function foundId(query: string): string | undefined {
  const result = lookupBook(query, enBooks);
  return result.kind === 'found' ? result.book.id : undefined;
}

describe('normalizeBookName', () => {
  it('lowercases and drops spaces and dots', () => {
    expect(normalizeBookName(' 1 Cor. ')).toBe('1cor');
  });

  it('turns a leading roman numeral into a digit', () => {
    expect(normalizeBookName('II Kings')).toBe('2kings');
    expect(normalizeBookName('Isaiah')).toBe('isaiah');
  });
});

describe('lookupBook', () => {
  it.each([
    ['Genesis', 'Gen'],
    ['gen', 'Gen'],
    ['Psalm', 'Ps'],
    ['psalms', 'Ps'],
    ['1 Cor', '1Cor'],
    ['1co', '1Cor'],
    ['III John', '3John'],
    ['jn', 'John'],
    ['phil', 'Phil'],
    ['song of songs', 'Song'],
    ['rev', 'Rev'],
  ])('finds %s', (query, id) => {
    expect(foundId(query)).toBe(id);
  });

  it('matches unambiguous prefixes of full names', () => {
    expect(foundId('lamen')).toBe('Lam');
    expect(foundId('philem')).toBe('Phlm');
  });

  it('reports ambiguous prefixes with their candidates', () => {
    const result = lookupBook('jo', enBooks);
    expect(result.kind).toBe('ambiguous');
    if (result.kind === 'ambiguous') {
      expect(result.candidates.map((book) => book.id)).toEqual([
        'Josh',
        'Job',
        'Joel',
        'Jonah',
        'John',
      ]);
    }
  });

  it('reports unknown names', () => {
    expect(lookupBook('xyz', enBooks).kind).toBe('unknown');
    expect(lookupBook('', enBooks).kind).toBe('unknown');
  });
});

describe('a catalogue two books share a spelling in', () => {
  /** `enBooks` with Jonah answering to a name John already has. */
  const clashing = {
    ...enBooks,
    Jonah: { ...enBooks.Jonah, aliases: [...enBooks.Jonah.aliases, 'john'] },
  };

  it('is reported, so a translator finds out in CI', () => {
    expect(bookNameCollisions(clashing)).toEqual(['john: Jonah and John']);
  });

  it('keeps one book rather than throwing, so the search box still works', () => {
    // This is reached from a submit handler, outside any error boundary: throwing here would
    // not show a message, it would just make searching stop working with no explanation. The
    // book that claimed the spelling first keeps it — Jonah, which the canon reaches first.
    const result = lookupBook('John', clashing);
    expect(result.kind === 'found' && result.book.id).toBe('Jonah');
  });

  it('finds no collision in the catalogue the app ships', () => {
    expect(bookNameCollisions(enBooks)).toEqual([]);
  });
});
