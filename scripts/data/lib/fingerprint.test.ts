import { describe, expect, it } from 'vitest';
import {
  describeManifestDrift,
  fingerprintDataset,
  formatManifest,
  type DatasetFile,
  type DatasetManifest,
} from './fingerprint.ts';

function translation(verses: readonly string[]): DatasetFile {
  return {
    format: 'translation-text',
    schemaVersion: 1,
    versification: 'kjv',
    provenance: {
      url: 'https://example.org/t',
      sha256: 'a'.repeat(64),
      retrievedAt: '2026-01-01',
      snapshotDate: null,
    },
    notices: [],
    translationId: 'kjv',
    verses,
  };
}

const fingerprint = (verses: readonly string[]) => {
  const dataset = translation(verses);
  return fingerprintDataset(dataset, JSON.stringify(dataset));
};

describe('fingerprintDataset', () => {
  it('counts the verses that carry the translators’ brackets', () => {
    // The number that would have made the change visible: removing two lines from an importer
    // rewrote 19,000 verses, and the only thing a reviewer saw was the two lines.
    const { shape } = fingerprint(['In the beginning [was] the Word.', 'Jesus wept.', '']);
    expect(shape['supplied']).toBe(1);
  });

  it('counts verses, empty verses and characters', () => {
    const { shape } = fingerprint(['one', '', 'three']);
    expect(shape).toEqual({ verses: 3, empty: 1, characters: 8, supplied: 0 });
  });

  it('moves when a single character of scripture changes', () => {
    const before = fingerprint(['In the beginning [was] the Word.']);
    const after = fingerprint(['In the beginning was the Word.']);
    expect(after.sha256).not.toBe(before.sha256);
    expect(after.shape['supplied']).toBe(0);
  });

  it('describes the links in a cross-reference file', () => {
    const dataset: DatasetFile = {
      format: 'cross-references',
      schemaVersion: 1,
      versification: 'kjv',
      provenance: {
        url: 'https://example.org/x',
        sha256: 'b'.repeat(64),
        retrievedAt: '2026-01-01',
        snapshotDate: null,
      },
      notices: [],
      sourceId: 'openbible',
      sourceRowCount: 9,
      links: { offsets: [0, 2], targetStart: [1, 2], targetEnd: [1, 2], votes: [5, 6] },
    };
    expect(fingerprintDataset(dataset, JSON.stringify(dataset)).shape).toEqual({
      links: 2,
      sourceRows: 9,
    });
  });

  it('describes the words in an original-words file', () => {
    const dataset: DatasetFile = {
      format: 'original-words',
      schemaVersion: 1,
      versification: 'kjv',
      provenance: {
        url: 'https://example.org/w',
        sha256: 'c'.repeat(64),
        retrievedAt: '2026-01-01',
        snapshotDate: null,
      },
      notices: [],
      sourceId: 'stepbible',
      license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
      attribution: 'Words: STEP Bible.',
      maxVerses: 100,
      words: {
        strongs: ['G1', 'G2'],
        lemma: ['α', 'β'],
        transliteration: ['a', 'b'],
        gloss: ['first', 'second'],
        offsets: [0, 1],
        verses: [3, 4, 5],
      },
    };
    expect(fingerprintDataset(dataset, JSON.stringify(dataset)).shape).toEqual({
      words: 2,
      verseEntries: 3,
      maxVerses: 100,
    });
  });
});

describe('formatManifest', () => {
  it('sorts paths and counts, so a rebuild does not reorder the file', () => {
    const written = formatManifest({
      'b.json': { sha256: 'b', bytes: 2, shape: { zebra: 1, apple: 2 } },
      'a.json': { sha256: 'a', bytes: 1, shape: {} },
    });
    expect(written.indexOf('a.json')).toBeLessThan(written.indexOf('b.json'));
    expect(written.indexOf('apple')).toBeLessThan(written.indexOf('zebra'));
    expect(written.endsWith('\n')).toBe(true);
  });
});

describe('describeManifestDrift', () => {
  const base: DatasetManifest = {
    'data/translations/kjv.json': {
      sha256: 'before',
      bytes: 10,
      shape: { verses: 31102, supplied: 14241 },
    },
  };

  it('says nothing when the build reproduced what is committed', () => {
    expect(describeManifestDrift(base, base)).toEqual([]);
  });

  it('names the counts that moved, not just the digest', () => {
    expect(
      describeManifestDrift(base, {
        'data/translations/kjv.json': {
          sha256: 'after',
          bytes: 9,
          shape: { verses: 31102, supplied: 0 },
        },
      }),
    ).toEqual(['data/translations/kjv.json: supplied 14241 → 0']);
  });

  it('says so when the bytes moved but no count did, which is the case worth a closer look', () => {
    expect(
      describeManifestDrift(base, {
        'data/translations/kjv.json': {
          sha256: 'after',
          bytes: 10,
          shape: base['data/translations/kjv.json']?.shape ?? {},
        },
      }),
    ).toEqual(['data/translations/kjv.json: the bytes changed but every count is the same']);
  });

  it('reports a dataset that is new, and one that stopped being built', () => {
    expect(describeManifestDrift({}, base)).toEqual([
      'data/translations/kjv.json: new dataset, not in the manifest',
    ]);
    expect(describeManifestDrift(base, {})).toEqual([
      'data/translations/kjv.json: in the manifest but no longer built',
    ]);
  });
});
