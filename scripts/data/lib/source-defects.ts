import type { TranslationId } from '../../../src/core/datasets/ids.ts';

/**
 * Text in an upstream file that is not part of the translation, named one verse at a time.
 *
 * Twice now a pattern has been written against the shape of a defect that had already been
 * found, and twice the next defect has been a different shape and gone straight through: the
 * Riveduta's parenthesised verse numbers escaped a rule written for the Lutherbibel's square
 * brackets, and these chapter headings escaped the rule written for both. A third pattern would
 * fail the same way, because the thing being matched is "material an editor left behind", which
 * has no shape.
 *
 * So these are listed rather than matched. The cost is that each one had to be found by reading
 * the text; the gain is that the list cannot reach a verse it does not name, and a reviewer can
 * see exactly what was taken out of which verse and judge it.
 *
 * Two things keep the list from rotting. The importer refuses to build when an entry matches
 * nothing, which catches both a `remove` string that was mistyped when it was written and an
 * upstream file that has since been fixed — in the second case the entry has done its job and
 * should go. And `data/sources.json` pins the SHA-256 of the exact archive entry each of these
 * was read out of, so the text cannot change under the list without somebody running
 * `npm run data:fetch -- --update` on purpose and looking at the diff.
 */
/**
 * The translations this list can speak for: the ones imported from an eBible VPL file.
 *
 * `defectsFor` is consulted by that importer alone, and so is the guard that refuses an entry
 * matching nothing. An entry naming the BSB, which has an importer of its own, would therefore
 * be removed from nothing and reported by nothing — a correction that looks applied and is not.
 * Narrowed here so the compiler asks the question instead of a reader noticing.
 */
export type DefectiveTranslationId = Exclude<TranslationId, 'bsb'>;

export interface SourceDefect {
  readonly translationId: DefectiveTranslationId;
  /** OSIS id of the verse, e.g. `Matt.5.48`. */
  readonly verse: string;
  /** The exact text to take out, as it stands in the source. */
  readonly remove: string;
  /** Why it is not the translation's words. For a reviewer; the code never reads it. */
  readonly because: string;
}

const RUNNING_HEAD =
  'A running head — "Matthew Chapter 4" — that eBible’s conversion welded onto the end of the ' +
  'last verse of the chapter before it. The three are the only ones in the Riveduta, and the ' +
  'only verses in it that contain a digit besides Psalm 60:1 and Revelation 13:18.';

export const SOURCE_DEFECTS: readonly SourceDefect[] = [
  {
    translationId: 'riveduta1927',
    verse: '2Sam.20.26',
    // One character, so the whole string is the character: `remove` is deleted, not replaced,
    // and `òe` has to become `e`. The verse holds no other `ò`.
    remove: 'ò',
    because:
      'A stray character left where eBible split the edition’s 20:25 to fit the KJV’s 26 — the ' +
      'marker (H20-25) on the same line records the split. The Riveduta reads “…erano ' +
      'sacerdoti; e anche Ira di Jair era ministro di stato di Davide.”, and this is the only ' +
      'word-initial “ò” in the edition: every other non-final accent in it is a stress mark ' +
      '(lèvati, ròcca, mèsse). It carries no digit and no bracket, which is why nothing ' +
      'automatic saw it and reading did.',
  },
  {
    translationId: 'riveduta1927',
    verse: 'Matt.3.17',
    remove: ' Matteo Capitolo 4',
    because: RUNNING_HEAD,
  },
  {
    translationId: 'riveduta1927',
    verse: 'Matt.5.48',
    remove: ' Matteo Capitolo 6',
    because: RUNNING_HEAD,
  },
  {
    translationId: 'riveduta1927',
    verse: 'Matt.20.34',
    remove: ' Matteo Capitolo 21',
    because: RUNNING_HEAD,
  },
  {
    translationId: 'luther1912',
    verse: 'Judg.11.25',
    remove: ' 518heeft',
    because:
      'A Strong’s number welded to the Dutch word "heeft", mid-sentence in a German text. The ' +
      'Lutherbibel has two places where a digit touches a letter and the other is the `[1b]` ' +
      'half-verse marker at Isaiah 64:2, so this is the only one that is not an editor’s note. ' +
      'Taking it out leaves the reading the edition has: "Hat derselbe auch je gerechtet oder ' +
      'gestritten wider Israel?"',
  },
];

/** The defects recorded against one translation, by the verse each belongs to. */
export function defectsFor(translationId: TranslationId): ReadonlyMap<string, SourceDefect> {
  return new Map(
    SOURCE_DEFECTS.filter((defect) => defect.translationId === translationId).map((defect) => [
      defect.verse,
      defect,
    ]),
  );
}
