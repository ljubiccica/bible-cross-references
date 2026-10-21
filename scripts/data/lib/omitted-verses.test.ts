import { describe, expect, it } from 'vitest';
import { parseOsisId } from '../../../src/core/bible/verse-ref.ts';
import { CANONICAL_VERSIFICATION } from '../../../src/core/bible/versification.ts';
import { CRITICAL_TEXT_OMISSIONS, omittedVerseNotices } from './omitted-verses.ts';

describe('omittedVerseNotices', () => {
  it('says nothing about a translation with no blank verses', () => {
    expect(omittedVerseNotices('kjv', [])).toEqual([]);
  });

  it('reports the blanks the earliest manuscripts explain', () => {
    const [notice] = omittedVerseNotices('bsb', ['Matt.17.21', 'Acts.8.37']);
    expect(notice).toMatchObject({
      level: 'info',
      count: 2,
      examples: ['Matt.17.21', 'Acts.8.37'],
    });
  });

  /**
   * The check that would have caught the Reina Valera 1909. eBible's edition of it imports as
   * 31,102 verses with nothing missing, nothing repeated and nothing outside the canon, and its
   * words are nonetheless one verse out across six chapters. The blanks are the only symptom.
   */
  it('refuses a blank verse the manuscripts do not explain', () => {
    expect(() => omittedVerseNotices('kjv', ['Jonah.1.17'])).toThrow(/Jonah\.1\.17/);
  });

  it('says what a blank verse usually means, so the next person knows where to look', () => {
    expect(() => omittedVerseNotices('kjv', ['Num.12.16'])).toThrow(
      /numbered differently from the KJV/,
    );
  });

  it('refuses the whole set even when most of it is explained', () => {
    expect(() => omittedVerseNotices('kjv', ['Matt.17.21', '1Sam.23.29'])).toThrow(/1Sam\.23\.29/);
  });

  it('names at most five examples, so the message stays readable', () => {
    const blanks = ['Gen.1.2', 'Gen.1.3', 'Gen.1.4', 'Gen.1.5', 'Gen.1.6', 'Gen.1.7'];
    const run = () => omittedVerseNotices('kjv', blanks);
    expect(run).toThrow(/6 verses have no text/);
    // Thrown, and the sixth example left out of the message — not merely "did not throw".
    expect(run).toThrow(/Gen\.1\.6/);
    expect(run).not.toThrow(/Gen\.1\.7/);
  });

  it('counts in words a person would use, for the single-verse case', () => {
    expect(() => omittedVerseNotices('kjv', ['Jonah.1.17'])).toThrow(
      /1 verse has no text and is not among the blanks this translation is allowed/,
    );
  });

  it('says where to record a translation that really does omit a passage', () => {
    // And does not claim the manuscripts have the longer ending of Mark, which they do not —
    // it is left out of the list so that dropping it is somebody's decision, not a default.
    expect(() => omittedVerseNotices('kjv', ['Mark.16.9'])).toThrow(/OMISSIONS_ALLOWED/);
    expect(() => omittedVerseNotices('kjv', ['Mark.16.9'])).not.toThrow(
      /not among those the earliest manuscripts omit/,
    );
  });

  /**
   * A typo in the allow-list that is still a real verse would wave a genuine blank through
   * forever, and nothing else here would notice.
   */
  it('lists only verses that exist', () => {
    for (const osisId of CRITICAL_TEXT_OMISSIONS) {
      const ref = parseOsisId(osisId);
      expect(ref, osisId).toBeDefined();
      expect(ref && CANONICAL_VERSIFICATION.indexOf(ref), osisId).toBeDefined();
    }
  });

  /**
   * The sixteen are a property of a *critical* edition, not of this project.
   *
   * The KJV, the Bíblia Livre, the Lutherbibel and the Riveduta print all sixteen, so a blank
   * at one of them is an upstream regression — the exact thing this function exists to catch,
   * and the thing it used to wave through because the allowance was one shared list. Checked
   * here as a property of each shipped translation rather than as a list, so the question is
   * asked again of whatever is added next.
   */
  describe('the allowance each translation gets', () => {
    it.each(['kjv', 'blivre', 'luther1912', 'riveduta1927'] as const)(
      'refuses a critical-text blank in %s, which prints all sixteen',
      (id) => {
        expect(() => omittedVerseNotices(id, ['Matt.17.21'])).toThrow(/Matt\.17\.21/);
      },
    );

    it.each(['bsb', 'vbl'] as const)('allows it in %s, which leaves them out', (id) => {
      const notices = omittedVerseNotices(id, ['Matt.17.21']);
      expect(notices).toHaveLength(1);
      expect(notices[0]?.message).toMatch(/earliest manuscripts/);
    });
  });
});
