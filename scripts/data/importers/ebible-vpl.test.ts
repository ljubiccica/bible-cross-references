import { describe, expect, it } from 'vitest';
import { BOOKS } from '../../../src/core/bible/books.ts';
import { KJV_CHAPTER_VERSE_COUNTS } from '../../../src/core/bible/kjv-versification.ts';
import { PROVENANCE, verseIndex } from '../../../src/test-utils/fixtures.ts';
import { BOOK_CODES, importEbibleVerseLines } from './ebible-vpl.ts';

/** Builds a complete eBible-style file; `transform` may rewrite or drop (return `null`) lines. */
function createVerseLines(transform: (line: string) => string | null = (line) => line): string {
  const lines = BOOKS.flatMap((book) =>
    KJV_CHAPTER_VERSE_COUNTS[book.id].flatMap((verseCount, chapterOffset) =>
      Array.from({ length: verseCount }, (_, verseOffset) => {
        const reference = `${BOOK_CODES[book.id]} ${chapterOffset + 1}:${verseOffset + 1}`;
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

  it('drops a pilcrow, which is only a paragraph mark', () => {
    const file = importEbibleVerseLines(
      createVerseLines((line) =>
        line.startsWith('GEN 1:1 ') ? 'GEN 1:1 ¶ In the beginning was the Word.' : line,
      ),
      'kjv',
      PROVENANCE,
    );
    expect(file.verses[0]).toBe('In the beginning was the Word.');
  });

  it('keeps the brackets around words the translators supplied', () => {
    const file = importEbibleVerseLines(
      createVerseLines((line) =>
        line.startsWith('GEN 1:1 ') ? 'GEN 1:1 ¶ In the beginning [was] the Word.' : line,
      ),
      'kjv',
      PROVENANCE,
    );
    // They mark the difference between what the source says and what English needed added, which
    // is the translators' own statement about their work and not ours to drop.
    expect(file.verses[0]).toBe('In the beginning [was] the Word.');
  });

  /**
   * Colon spacing. The Bíblia Livre sets a psalm's superscription against its first words with
   * no space, and removing the brackets around a stanza heading leaves the space on the wrong
   * side of the colon. Both read as mistakes and neither is about the wording, so the colon
   * keeps its place and only the space moves — which is a claim the attribution makes to
   * readers, and so one worth holding to.
   */
  describe('colon spacing', () => {
    const clean = (text: string) =>
      importEbibleVerseLines(
        createVerseLines((line) => (line.startsWith('GEN 1:1 ') ? `GEN 1:1 ${text}` : line)),
        'kjv',
        PROVENANCE,
      ).verses[0];

    it('puts a space after a colon that runs into the next word', () => {
      expect(clean('Salmo de Davi:Ah SENHOR')).toBe('Salmo de Davi: Ah SENHOR');
    });

    it('moves a space that sits before a colon, brackets and all', () => {
      expect(clean('[Guímel] :Trata bem')).toBe('[Guímel]: Trata bem');
    });

    it('leaves a colon that is already spaced exactly as it is', () => {
      expect(clean('E disse Deus: Haja luz')).toBe('E disse Deus: Haja luz');
    });

    it('never touches a colon before a digit, so a time or a reference survives', () => {
      expect(clean('às 3:16 da tarde')).toBe('às 3:16 da tarde');
    });

    it('never touches a colon before a bracket, which the KJV uses forty times', () => {
      expect(clean('among their enemies:)')).toBe('among their enemies:)');
      expect(clean('Olha isto:(diz ele')).toBe('Olha isto:(diz ele');
    });

    it('moves spaces and nothing else: no word is added, dropped or reordered', () => {
      const source = 'Ela :Beije-me:com beijos:(assim) 1:2';
      const cleaned = clean(source) ?? '';
      const strip = (text: string) => text.replace(/\s+/g, '');
      expect(strip(cleaned)).toBe(strip(source));
    });
  });

  /**
   * The verse number the source edition gives, where it differs from the KJV number the file is
   * keyed to. eBible leaves these in the text; they are the editor's note, not the translation.
   */
  describe('the edition’s own verse numbers', () => {
    const imported = (text: string) =>
      importEbibleVerseLines(
        createVerseLines((line) => (line.startsWith('GEN 1:1 ') ? `GEN 1:1 ${text}` : line)),
        'kjv',
        PROVENANCE,
      );
    const clean = (text: string) => imported(text).verses[0];

    it('takes a chapter-and-verse marker off the front of a verse', () => {
      expect(clean('[32:2] Jakob aber zog seinen Weg.')).toBe('Jakob aber zog seinen Weg.');
    });

    it('takes one from mid-sentence, where the remapping merged two verses into one', () => {
      expect(clean('das bleibe ewiglich. [21:1] Und Jonathan machte sich auf.')).toBe(
        'das bleibe ewiglich. Und Jonathan machte sich auf.',
      );
    });

    it('takes a half-verse marker, which is how an edition splits a long verse', () => {
      expect(clean('[1b] daß dein Name kund würde.')).toBe('daß dein Name kund würde.');
    });

    /**
     * eBible writes the same thing two ways. The Riveduta's parenthesised form shipped visibly
     * once, in 228 verses, because the rule had only ever been written against the Lutherbibel's
     * square brackets — so both notations are pinned here, and anything unrecognised is refused
     * below rather than passed through.
     */
    it('takes the parenthesised form the Italian uses, Hebrew and Greek alike', () => {
      expect(clean('(H2-1) E l’Eterno fece venire un gran pesce.')).toBe(
        'E l’Eterno fece venire un gran pesce.',
      );
      expect(clean('(G13-12) Tutti i santi vi salutano.')).toBe('Tutti i santi vi salutano.');
    });

    it('takes two from one verse, which is how a merged verse is marked', () => {
      expect(clean('(G12-18) E si fermò sulla riva. (G13-1) E vidi salir dal mare.')).toBe(
        'E si fermò sulla riva. E vidi salir dal mare.',
      );
    });

    it('leaves a space behind, so a marker between two words cannot weld them', () => {
      expect(clean('Jakob[32:2]kam.')).toBe('Jakob kam.');
    });

    /**
     * Order matters and is easy to lose in a tidy-up: `cleanVerseText` puts a space after a
     * colon that runs into a letter, so running it first turns `[32:a]` into `[32: a]`, which
     * no longer looks like a number to the check below and ships.
     */
    it('looks for a leftover before the text is tidied, not after', () => {
      expect(() => clean('[32:a] Jakob aber.')).toThrow(/still carries \[32:a\]/);
      expect(() => clean('(H2:b) E l’Eterno.')).toThrow(/still carries \(H2:b\)/);
    });

    it('refuses a notation it does not recognise rather than shipping it', () => {
      // The shape that would have caught the Italian a release earlier.
      expect(() => clean('(H2-1a) E l’Eterno.')).toThrow(/still carries \(H2-1a\)/);
      expect(() => clean('[32:2a] Jakob aber.')).toThrow(/still carries \[32:2a\]/);
      expect(() => clean('and about [12] of them.')).toThrow(/still carries \[12\]/);
    });

    it('refuses a bracket left holding nothing, which is what a nested marker leaves', () => {
      // `[[32:2]]` loses its inner marker and keeps the outer brackets, and a pair holding only
      // a space is not something a translator wrote either.
      expect(() => clean('[[32:2]] Jakob aber.')).toThrow(/still carries/);
    });

    it('leaves an aside with words in it alone, numbers and all', () => {
      // The Versión Biblia Libre's one bracketed number is scripture, not an editor's note.
      expect(clean('el atrio (también de 4.500 codos de largo) tenía cortinas.')).toBe(
        'el atrio (también de 4.500 codos de largo) tenía cortinas.',
      );
    });

    it('refuses a verse that was nothing but a marker, rather than calling it omitted', () => {
      expect(() => clean('[32:2]')).toThrow(/was emptied by this import/);
    });

    it('leaves a verse emptied by anything else to the blank-verse check', () => {
      // A line that is only a pilcrow is a blank verse, and saying its text "was taken for the
      // edition's own verse number" would send the reader after a fault that is not there.
      expect(() => clean('¶')).toThrow(/is not among the blanks this translation is allowed/);
      expect(() => clean('¶')).not.toThrow(/emptied by this import/);
    });

    it('leaves a supplied word alone: the brackets that matter hold words, not numbers', () => {
      expect(clean('In the beginning [was] the Word.')).toBe('In the beginning [was] the Word.');
    });

    /**
     * Each pair weighed on its own, not as the regex happens to scan them.
     *
     * One pattern accepting either delimiter matched `(siehe [12]` here — inner text with a
     * space in it, so waved through — and swallowed the `[12]` on the way past, so the thing
     * the check exists for was never examined. Any short parenthetical in front of a marker was
     * enough to hide it.
     */
    it.each([
      'Jakob aber zog (siehe [12]) seinen Weg.',
      'und das Volk (vgl. [12] dort) ging hin.',
      'so sprach er [12] (und ging).',
    ])('refuses a marker standing behind another bracket: %s', (text) => {
      expect(() => clean(text)).toThrow(/bracketed/i);
    });

    it('still leaves a nested aside of words alone', () => {
      const text = 'el atrio (de 4.500 codos [de largo]) tenía cortinas.';
      expect(clean(text)).toBe(text);
    });

    it('names the verses it changed, so no build alters scripture without saying so', () => {
      const { notices } = imported('[32:2] Jakob aber zog seinen Weg.');
      expect(notices).toHaveLength(1);
      expect(notices[0]).toMatchObject({ level: 'info', count: 1, examples: ['Gen.1.1'] });
      expect(notices[0]?.message).toContain('numbers these verses differently');
    });

    it('reports renumbering before omissions, when a text has both', () => {
      const file = importEbibleVerseLines(
        createVerseLines((line) => {
          if (line.startsWith('GEN 1:1 ')) {
            return 'GEN 1:1 [32:2] Jakob aber zog seinen Weg.';
          }
          return line.startsWith('MAT 17:21 ') ? 'MAT 17:21' : line;
        }),
        // A critical edition, because Matt 17:21 is only a legitimate blank in one: the KJV
        // prints the verse, so blanking it there is now the upstream fault it looks like.
        'bsb',
        PROVENANCE,
      );
      expect(file.notices.map((notice) => notice.examples)).toEqual([['Gen.1.1'], ['Matt.17.21']]);
    });

    it('says nothing about a text that carries none', () => {
      expect(imported('In the beginning was the Word.').notices).toEqual([]);
    });
  });

  /**
   * Defects in the upstream file, listed verse by verse in `source-defects.ts` because two
   * attempts at matching them by shape both missed the next one.
   */
  describe('corrections to the source', () => {
    const lutherWith = (judges1125: string) =>
      createVerseLines((line) =>
        line.startsWith('JDG 11:25 ') ? `JDG 11:25 ${judges1125}` : line,
      );

    it('takes out what the list names, and nothing else', () => {
      const file = importEbibleVerseLines(
        lutherWith('Hat derselbe auch je gerechtet 518heeft oder gestritten wider Israel?'),
        'luther1912',
        PROVENANCE,
      );
      expect(file.verses[verseIndex('Judg', 11, 25)]).toBe(
        'Hat derselbe auch je gerechtet oder gestritten wider Israel?',
      );
    });

    it('says which verses it corrected, so the build does not do it quietly', () => {
      const file = importEbibleVerseLines(
        lutherWith('Hat derselbe auch je gerechtet 518heeft oder gestritten wider Israel?'),
        'luther1912',
        PROVENANCE,
      );
      expect(file.notices[0]).toMatchObject({ count: 1, examples: ['Judg.11.25'] });
      expect(file.notices[0]?.message).toContain('source-defects.ts');
    });

    it('refuses to build once a correction matches nothing', () => {
      // Two causes, one symptom: the upstream file has been fixed and the entry should go, or
      // the text to remove was mistyped when the entry was written and the defect is shipping
      // while the list reads as though it had been handled. Neither should pass quietly.
      const fixed = 'Hat derselbe auch je gerechtet oder gestritten wider Israel?';
      expect(() => importEbibleVerseLines(lutherWith(fixed), 'luther1912', PROVENANCE)).toThrow(
        /1 correction\(s\) in source-defects\.ts matched nothing \(Judg\.11\.25\)/,
      );
    });

    it('leaves a translation with no corrections exactly as it is', () => {
      const file = importEbibleVerseLines(createVerseLines(), 'kjv', PROVENANCE);
      expect(file.verses[verseIndex('Judg', 11, 25)]).toBe('Text of JDG 11:25.');
    });
  });

  /**
   * The blank-verse guard, through the importer rather than on its own. It is the check that
   * would have stopped the Reina Valera 1909, and `omittedVerseNotices` being covered proves
   * only that the function works — not that anything calls it.
   */
  it('refuses a blank verse the manuscripts do not explain', () => {
    expect(() =>
      importEbibleVerseLines(
        createVerseLines((line) => (line.startsWith('GEN 32:1 ') ? 'GEN 32:1' : line)),
        'kjv',
        PROVENANCE,
      ),
    ).toThrow(/Gen\.32\.1/);
  });

  it('keeps omitted verses as empty text and reports them', () => {
    const file = importEbibleVerseLines(
      createVerseLines((line) => (line.startsWith('MAT 17:21 ') ? 'MAT 17:21' : line)),
      // `bsb`, not `kjv`: the allowance is per translation, and the KJV prints this verse.
      'bsb',
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

describe('BOOK_CODES', () => {
  it('gives every book a code of its own', () => {
    const codes = Object.values(BOOK_CODES);
    expect(codes).toHaveLength(BOOKS.length);
    expect(new Set(codes).size).toBe(BOOKS.length);
  });

  /**
   * Written out by hand, which nothing else in this file is.
   *
   * Every other test here builds its fixture *from* `BOOK_CODES`, so the table is its own
   * oracle and two entries trading places would look identical. Against a real archive that is
   * mostly harmless — the importer checks each book's chapter and verse counts, so a code on
   * the wrong book is caught the moment the shapes differ. It is only invisible between two
   * books of exactly the same shape, because then no count anywhere can tell them apart.
   *
   * There is one such pair in the canon, and the next test is what keeps this list honest: if
   * the versification ever grows another, it fails until the pair is pinned here too. The codes
   * themselves come from the archives, where `JDG` is Judges and `JUD` is Jude — a pair worth
   * reading twice — and `PHI` is Philippians against Philemon's `PHM`.
   */
  const PINNED: Readonly<Record<string, string>> = {
    Phlm: 'PHM',
    Jude: 'JUD',
    // Not ambiguous by shape, but easy to mistype into one that is.
    Judg: 'JDG',
    Phil: 'PHI',
  };

  it.each(Object.entries(PINNED))('calls %s %s', (book, code) => {
    expect(BOOK_CODES[book as keyof typeof BOOK_CODES]).toBe(code);
  });

  it('pins every book that no count can tell apart from another', () => {
    const byShape = new Map<string, string[]>();
    for (const book of BOOKS) {
      const shape = JSON.stringify(KJV_CHAPTER_VERSE_COUNTS[book.id]);
      byShape.set(shape, [...(byShape.get(shape) ?? []), book.id]);
    }
    const ambiguous = [...byShape.values()].filter((books) => books.length > 1).flat();

    expect(ambiguous.length).toBeGreaterThan(0);
    for (const book of ambiguous) {
      expect(Object.keys(PINNED), `${book} shares its shape with another book`).toContain(book);
    }
  });
});
