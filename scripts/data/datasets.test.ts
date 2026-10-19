import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { CANONICAL_VERSIFICATION } from '../../src/core/bible/versification.ts';
import { toOsisId } from '../../src/core/bible/verse-ref.ts';
import type { TranslationId } from '../../src/core/datasets/ids.ts';
import { defectsFor } from './lib/source-defects.ts';
import { DATASET_BUILDERS, type RawSourceContent } from './datasets.ts';
import { BOOK_CODES as KJV_CODES } from './importers/ebible-vpl.ts';
import { expectMember, findSource, readSources, type RawSource } from './lib/sources.ts';

/** The archive entry each zipped source pins, mirroring `data/sources.json`. */
const MEMBERS: Readonly<Record<string, string>> = {
  kjv: 'eng-kjv2006_vpl.txt',
  luther1912: 'deu1912_vpl.txt',
  riveduta1927: 'ita1927_vpl.txt',
  vbl: 'spavbl_vpl.txt',
};

function source(id: string): RawSource {
  const member = MEMBERS[id];
  return {
    id,
    description: id,
    url: `https://example.org/${id}`,
    fileName: `${id}.txt`,
    sha256: 'a'.repeat(64),
    ...(member === undefined ? {} : { member }),
    retrievedAt: '2026-01-01',
    license: 'CC BY 4.0',
    homepage: 'https://example.org/',
  };
}

/** One line per verse of the whole canon, which is what every importer insists on. */
function everyVerse(render: (index: number) => string): string {
  return Array.from({ length: CANONICAL_VERSIFICATION.verseCount }, (_, index) =>
    render(index),
  ).join('\n');
}

/**
 * Every fixture text says which translation it is, in every verse.
 *
 * A builder that reaches for the wrong archive — the wrong source id, the wrong entry inside it —
 * produces a perfectly valid dataset of somebody else's scripture under this translation's name,
 * licence and credit. Nothing about its shape is wrong, so only the words can give it away.
 */
const BSB = everyVerse((index) => {
  const ref = CANONICAL_VERSIFICATION.refAt(index);
  const book = CANONICAL_VERSIFICATION.bookAt(index);
  return `${book.name} ${String(ref.chapter)}:${String(ref.verse)}\tbsb ${String(index)}.`;
});

/**
 * An eBible verse-per-line text that names itself in every verse, and carries whatever
 * `source-defects.ts` says this translation's upstream file carries.
 *
 * The defects are read from the list rather than written out here. The importer refuses to
 * build when a correction matches nothing, which is what catches a mistyped `remove` against
 * the real archive — and a fixture with the defects hand-written in would have to be edited
 * every time the list changes, which is the kind of coupling that gets a check deleted.
 */
function verseLines(id: TranslationId): string {
  const defects = defectsFor(id);
  return everyVerse((index) => {
    const ref = CANONICAL_VERSIFICATION.refAt(index);
    const code = KJV_CODES[CANONICAL_VERSIFICATION.bookAt(index).id];
    const defect = defects.get(toOsisId(ref));
    return (
      `${code} ${String(ref.chapter)}:${String(ref.verse)} ${id} ${String(index)}.` +
      (defect === undefined ? '' : defect.remove)
    );
  });
}

const CONTENT: Readonly<Record<string, string | Uint8Array>> = {
  bsb: `The Holy Bible, Berean Standard Bible\nVerse\tBerean Standard Bible\n${BSB}`,
  kjv: zipSync({ 'eng-kjv2006_vpl.txt': strToU8(verseLines('kjv')) }),
  blivre: zipSync({ 'bliv-tr_vpl.txt': strToU8(verseLines('blivre')) }),
  luther1912: zipSync({ 'deu1912_vpl.txt': strToU8(verseLines('luther1912')) }),
  riveduta1927: zipSync({ 'ita1927_vpl.txt': strToU8(verseLines('riveduta1927')) }),
  vbl: zipSync({ 'spavbl_vpl.txt': strToU8(verseLines('vbl')) }),
  openbible: zipSync({
    'cross_references.txt': strToU8(
      'From Verse\tTo Verse\tVotes\t# CC-BY 2026-01-01\nGen.1.1\tJohn.1.1\t5',
    ),
  }),
  'stepbible-tagnt-mat-jhn': 'Mat.1.1#01=NKO\tx\ty\tG0976=N-NSF\tz',
  'stepbible-tagnt-act-rev': '',
  'stepbible-tahot-gen-deu': 'Gen.1.1#01=L\tx\ty\tz\t{H7225G}\tHNcfsa',
  'stepbible-tahot-jos-est': '',
  'stepbible-tahot-job-sng': '',
  'stepbible-tahot-isa-mal': '',
  'stepbible-tbesg': ['G0976', 'G0976 =', 'G0976', 'βίβλος', 'biblos', 'G:N-F', 'book', ''].join(
    '\t',
  ),
  'stepbible-tbesh': [
    'H7225',
    'H7225G =',
    'H7225G',
    'רֵאשִׁית',
    're.Shit',
    'N:N-F',
    'beginning',
    '',
  ].join('\t'),
};

const readSource = (id: string): Promise<RawSourceContent> => {
  const content = CONTENT[id];
  if (content === undefined) {
    throw new Error(`The test has no content for "${id}".`);
  }
  return Promise.resolve({
    source: source(id),
    content: Buffer.from(typeof content === 'string' ? strToU8(content) : content),
  });
};

describe('DATASET_BUILDERS', () => {
  it('has one builder per dataset the app loads', () => {
    expect(DATASET_BUILDERS.map((builder) => builder.outputPath)).toEqual([
      'data/translations/bsb.json',
      'data/translations/kjv.json',
      'data/translations/blivre.json',
      'data/translations/luther1912.json',
      'data/translations/riveduta1927.json',
      'data/translations/vbl.json',
      'data/cross-references/openbible.json',
      'data/words/stepbible.json',
    ]);
  });

  it('writes every dataset under public/data', () => {
    for (const builder of DATASET_BUILDERS) {
      expect(builder.outputPath.startsWith('data/')).toBe(true);
      expect(builder.outputPath.endsWith('.json')).toBe(true);
    }
  });

  it.each(DATASET_BUILDERS.map((b) => [b.outputPath, b] as const))(
    'builds %s from its pinned sources',
    async (_path, builder) => {
      const dataset = await builder.build(readSource);
      expect(dataset.versification).toBe('kjv');
      expect(dataset.schemaVersion).toBe(1);
      expect(dataset.provenance.sha256).toHaveLength(64);
      expect(dataset.provenance.url).toContain('https://example.org/');
      expect(Array.isArray(dataset.notices)).toBe(true);
      if (dataset.format === 'translation-text') {
        // The words have to be this translation's own. Everything above passes just as happily
        // when a builder has been wired to another translation's archive.
        expect(dataset.verses[0], `${dataset.translationId} read another text`).toContain(
          dataset.translationId,
        );
      }
    },
  );

  it('passes the words builder its licence and credit, from one place', async () => {
    const words = DATASET_BUILDERS.find((b) => b.outputPath.includes('words'));
    const dataset = await words?.build(readSource);
    if (dataset?.format !== 'original-words') {
      throw new Error('Expected the words dataset.');
    }
    expect(dataset.license).toEqual({
      name: 'CC BY 4.0',
      url: 'https://creativecommons.org/licenses/by/4.0/',
    });
    expect(dataset.attribution).toContain('STEP Bible');
  });
});

describe('the pins and the importers', () => {
  it('agree on which entry of an archive is read', async () => {
    // A pin covers one file. If a builder reaches for a different entry than the pin names, the
    // scripture it ships is never checked against anything — and nothing would say so.
    const sources = await readSources();
    for (const source of sources) {
      if (source.member === undefined) {
        continue;
      }
      expect(expectMember(source), source.id).toBe(source.member);
      expect(source.fileName.endsWith('.zip'), `${source.id} pins an entry of a ZIP`).toBe(true);
    }
  });

  it('reads the same archive entries the real sources pin', async () => {
    // Asserting `MEMBERS` against its own literal would only restate it. These are the names the
    // builders are exercised against above, so if they drift from `data/sources.json` the suite
    // is testing a shape the build does not have.
    const sources = await readSources();
    for (const [id, member] of Object.entries(MEMBERS)) {
      expect(findSource(sources, id).member, id).toBe(member);
    }
    expect(Object.keys(MEMBERS).toSorted()).toEqual(
      sources
        .filter((source) => source.member !== undefined)
        .map((source) => source.id)
        .toSorted(),
    );
  });

  it('pins every eBible archive by its entry rather than by the archive', async () => {
    // eBible rebuilds its archives on a schedule. The files inside do not change, but a ZIP
    // stores each entry's timestamp, so a pin on the archive fails on an ordinary day for a
    // reason that has nothing to do with scripture. Every source read from one names its entry.
    const sources = await readSources();
    for (const source of sources.filter(({ url }) => url.includes('ebible.org'))) {
      expect(source.member, `${source.id} pins an entry`).toBeDefined();
    }
  });
});
