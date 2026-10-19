import type { LocaleId } from '../locale-id.ts';

/**
 * What a reader of each language types into the search box, and what it must find.
 *
 * A language's book names pass every other check in `completeness.ts` without anybody having
 * read them: nothing is blank, no two books claim one spelling, every name is there. None of
 * that says whether `Jo` means John or Job — and in Portuguese it is the whole question, because
 * `Jo` is how a Brazilian writes João and `Jó` is Job, one accent apart.
 *
 * `bookNameCollisions` cannot answer it either: it proves two books never claim the same
 * spelling, not which of them a reader reaches. `Jo` finds João only because João's abbreviation
 * claims that exact spelling first; change João's abbreviation and `Jo` would quietly become Job,
 * with every check still green and every Brazilian typing `Jo 3:16` landing in Job.
 *
 * So each language carries the cases a native speaker signed off on, and they are run through
 * the real parser. The Portuguese rows below are the ones a Brazilian reader checked by hand.
 * `completeness.ts` requires a row for every spelling that folding makes ambiguous
 * (`contestedSpellings`), and names the missing ones, so a new language is told exactly which
 * cases it has to pin rather than being left to guess.
 */
export interface AcceptanceCase {
  /** Exactly what is typed, accents and all. */
  readonly typed: string;
  /**
   * What must come back:
   *
   * - `Book.chapter` or `Book.chapter.verse` — an OSIS reference, e.g. `John.3.16`, `Ps.23`;
   * - `ambiguous:A,B,C` — the reader is asked which book they meant, and these are the choices;
   * - `unknown` — no book of that name.
   */
  readonly expect: string;
  /** Why this row is here. A reviewer should be able to tell without reading the parser. */
  readonly note: string;
}

export const BOOK_ACCEPTANCE: Readonly<Record<LocaleId, readonly AcceptanceCase[]>> = {
  en: [
    { typed: 'John 3:16', expect: 'John.3.16', note: 'The plain case: a full name and a verse.' },
    { typed: 'Gen 1:1', expect: 'Gen.1.1', note: 'The usual abbreviation.' },
    { typed: 'Ps 23', expect: 'Ps.23', note: 'A whole chapter, with no verse.' },
    { typed: 'Job 1:1', expect: 'Job.1.1', note: 'Job is a whole name in English, not an accent.' },
    {
      typed: 'Jo 3:16',
      expect: 'ambiguous:Josh,Job,Joel,Jonah,John',
      note: 'English has no book called Jo, so the reader is asked which of the five they meant. In Portuguese this same spelling is João — see below.',
    },
    { typed: '1 Cor 13', expect: '1Cor.13', note: 'A numbered book, written with a space.' },
    { typed: '1co13', expect: '1Cor.13', note: 'The same with nothing between any of it.' },
    { typed: 'II Kings 2', expect: '2Kgs.2', note: 'A roman numeral for the number.' },
    { typed: 'Rev 22:21', expect: 'Rev.22.21', note: 'The last verse of the Bible.' },
    { typed: 'Habbakuk 1', expect: 'unknown', note: 'A misspelling is not quietly corrected.' },
  ],
  pt: [
    // The four a Brazilian reader checked by hand, and the reason this table exists.
    {
      typed: 'Jo 3:16',
      expect: 'John.3.16',
      note: 'Jo is how João is written. This is the one that matters: the same spelling is ambiguous in English and exact here.',
    },
    {
      typed: 'Jó 1:1',
      expect: 'Job.1.1',
      note: 'Jó is Job. One accent is the whole difference from the row above.',
    },
    { typed: 'Sl 23', expect: 'Ps.23', note: 'Sl is how Salmos is abbreviated.' },
    { typed: 'João 3:16', expect: 'John.3.16', note: 'The full name, written properly.' },
    { typed: 'joao 3:16', expect: 'John.3.16', note: 'The full name as it is typed on a phone.' },
    { typed: 'Gênesis 1:1', expect: 'Gen.1.1', note: 'An accented name.' },
    { typed: 'genesis 1:1', expect: 'Gen.1.1', note: 'The same without its accent.' },
    { typed: 'Josué 1:9', expect: 'Josh.1.9', note: 'Another accented name.' },
    { typed: 'josue 1:9', expect: 'Josh.1.9', note: 'And without it.' },
    { typed: 'Salmos 23', expect: 'Ps.23', note: 'A whole chapter by its full name.' },
    { typed: 'Êxodo 3:14', expect: 'Exod.3.14', note: 'An accent on the first letter.' },
    { typed: 'exodo 3:14', expect: 'Exod.3.14', note: 'And without it.' },
    { typed: '1 Coríntios 13', expect: '1Cor.13', note: 'A numbered book.' },
    {
      typed: '1º Coríntios 13',
      expect: '1Cor.13',
      note: 'With the ordinal marker Portuguese writes after the numeral.',
    },
    { typed: 'Tiago 1:1', expect: 'Jas.1.1', note: 'A name that shares nothing with the English.' },
    { typed: 'Jz 5', expect: 'Judg.5', note: 'An abbreviation of an accented name (Juízes).' },
    { typed: 'Apocalipse 22:21', expect: 'Rev.22.21', note: 'The last verse of the Bible.' },

    // Every accented name and abbreviation, typed the way a phone keyboard produces it. The
    // gate requires one of these per accented spelling: it is the only way the unaccented form
    // is pinned to a book at all, and it has to hold whether or not two books happen to
    // compete for it today.
    { typed: 'ex 1:1', expect: 'Exod.1.1', note: 'Êx, typed without its accent.' },
    { typed: 'levitico 1:1', expect: 'Lev.1.1', note: 'Levítico, typed without its accent.' },
    { typed: 'numeros 1:1', expect: 'Num.1.1', note: 'Números, typed without its accent.' },
    {
      typed: 'deuteronomio 1:1',
      expect: 'Deut.1.1',
      note: 'Deuteronômio, typed without its accent.',
    },
    { typed: 'juizes 1:1', expect: 'Judg.1.1', note: 'Juízes, typed without its accent.' },
    { typed: '1cronicas 1:1', expect: '1Chr.1.1', note: '1 Crônicas, typed without its accent.' },
    { typed: '2cronicas 1:1', expect: '2Chr.1.1', note: '2 Crônicas, typed without its accent.' },
    { typed: 'proverbios 1:1', expect: 'Prov.1.1', note: 'Provérbios, typed without its accent.' },
    { typed: 'canticos 1:1', expect: 'Song.1.1', note: 'Cânticos, typed without its accent.' },
    { typed: 'isaias 1:1', expect: 'Isa.1.1', note: 'Isaías, typed without its accent.' },
    { typed: 'lamentacoes 1:1', expect: 'Lam.1.1', note: 'Lamentações, typed without its accent.' },
    { typed: 'amos 1:1', expect: 'Amos.1.1', note: 'Amós, typed without its accent.' },
    { typed: '1corintios 1:1', expect: '1Cor.1.1', note: '1 Coríntios, typed without its accent.' },
    { typed: '2corintios 1:1', expect: '2Cor.1.1', note: '2 Coríntios, typed without its accent.' },
    { typed: 'galatas 1:1', expect: 'Gal.1.1', note: 'Gálatas, typed without its accent.' },
    { typed: 'efesios 1:1', expect: 'Eph.1.1', note: 'Efésios, typed without its accent.' },
    { typed: '1timoteo 1:1', expect: '1Tim.1.1', note: '1 Timóteo, typed without its accent.' },
    { typed: '2timoteo 1:1', expect: '2Tim.1.1', note: '2 Timóteo, typed without its accent.' },
    { typed: '1joao 1:1', expect: '1John.1.1', note: '1 João, typed without its accent.' },
    { typed: '2joao 1:1', expect: '2John.1.1', note: '2 João, typed without its accent.' },
    { typed: '3joao 1:1', expect: '3John.1.1', note: '3 João, typed without its accent.' },
  ],
};
