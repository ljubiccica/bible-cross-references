import type {
  CrossReferencesFile,
  OriginalWordsFile,
  TranslationTextFile,
} from '../../../src/core/datasets/formats.ts';
import { sha256Hex } from './files.ts';

export type DatasetFile = TranslationTextFile | CrossReferencesFile | OriginalWordsFile;

/**
 * What a generated dataset contains, in numbers small enough to read in a diff.
 *
 * The digest alone would be enough to *detect* a change, and almost useless for judging one: a
 * reviewer sees one hex string replaced by another and learns nothing about whether four verses
 * moved or forty thousand. The counts beside it are the point. They are chosen so that the
 * changes this pipeline can actually make to scripture show up as a number:
 *
 * - `characters` moves when wording or spacing changes anywhere;
 * - `supplied` counts verses carrying the brackets that mark words the translators added, which
 *   is the single edit that has silently rewritten most of this Bible — twice;
 * - `empty` moves when a verse stops having text at all.
 */
export interface DatasetFingerprint {
  readonly sha256: string;
  readonly bytes: number;
  readonly shape: Readonly<Record<string, number>>;
}

/** The whole manifest, keyed by the dataset's path under the site root. */
export type DatasetManifest = Readonly<Record<string, DatasetFingerprint>>;

function shapeOf(dataset: DatasetFile): Readonly<Record<string, number>> {
  switch (dataset.format) {
    case 'translation-text':
      return {
        verses: dataset.verses.length,
        empty: dataset.verses.filter((verse) => verse === '').length,
        characters: dataset.verses.reduce((total, verse) => total + verse.length, 0),
        supplied: dataset.verses.filter((verse) => verse.includes('[')).length,
      };
    case 'cross-references':
      return {
        links: dataset.links.votes.length,
        sourceRows: dataset.sourceRowCount,
      };
    case 'original-words':
      return {
        words: dataset.words.strongs.length,
        verseEntries: dataset.words.verses.length,
        maxVerses: dataset.maxVerses,
      };
  }
}

export function fingerprintDataset(dataset: DatasetFile, json: string): DatasetFingerprint {
  return {
    sha256: sha256Hex(Buffer.from(json, 'utf8')),
    bytes: Buffer.byteLength(json, 'utf8'),
    shape: shapeOf(dataset),
  };
}

/** The manifest as it is written to disk: sorted, so the file is stable between builds. */
export function formatManifest(manifest: DatasetManifest): string {
  const sorted = Object.fromEntries(
    Object.entries(manifest)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, fingerprint]) => [
        path,
        {
          sha256: fingerprint.sha256,
          bytes: fingerprint.bytes,
          shape: Object.fromEntries(
            Object.entries(fingerprint.shape).sort(([a], [b]) => a.localeCompare(b)),
          ),
        },
      ]),
  );
  return `${JSON.stringify(sorted, null, 2)}\n`;
}

/**
 * Where the two disagree, in words a reviewer can act on.
 *
 * Empty means the build reproduced exactly what is committed.
 */
export function describeManifestDrift(
  committed: DatasetManifest,
  built: DatasetManifest,
): string[] {
  const drift: string[] = [];
  for (const path of [...new Set([...Object.keys(committed), ...Object.keys(built)])].sort()) {
    const before = committed[path];
    const after = built[path];
    if (before === undefined) {
      drift.push(`${path}: new dataset, not in the manifest`);
      continue;
    }
    if (after === undefined) {
      drift.push(`${path}: in the manifest but no longer built`);
      continue;
    }
    if (before.sha256 === after.sha256) {
      continue;
    }
    const changes = [...new Set([...Object.keys(before.shape), ...Object.keys(after.shape)])]
      .sort()
      .flatMap((key) => {
        const from = before.shape[key];
        const to = after.shape[key];
        return from === to ? [] : [`${key} ${String(from ?? 0)} → ${String(to ?? 0)}`];
      });
    drift.push(
      changes.length > 0
        ? `${path}: ${changes.join(', ')}`
        : `${path}: the bytes changed but every count is the same`,
    );
  }
  return drift;
}
