/**
 * Builds the app's datasets from the raw source files: `data/raw/` → `public/data/`.
 *
 *   npm run data:build
 *
 * Each dataset is produced by an importer that validates the raw data against the canonical
 * versification and fails loudly on anything unexpected.
 */
import { DATASET_BUILDERS, type RawSourceReader } from './datasets.ts';
import { downloadPinnedSource } from './lib/download.ts';
import { formatBytes, readFileIfExists, writeFileAtomic } from './lib/files.ts';
import {
  describeManifestDrift,
  fingerprintDataset,
  formatManifest,
  type DatasetFingerprint,
  type DatasetManifest,
} from './lib/fingerprint.ts';
import { MANIFEST_FILE, publicFilePath, rawFilePath } from './lib/paths.ts';
import { findSource, pinnedDigest, readSources } from './lib/sources.ts';

const sources = await readSources();

const readSource: RawSourceReader = async (sourceId) => {
  const source = findSource(sources, sourceId);
  const content =
    (await readFileIfExists(rawFilePath(source.fileName))) ??
    // A source the repository does not carry (and any that went missing) is downloaded here,
    // against its pin, so a fresh clone can build.
    (await downloadPinnedSource(source));
  if (pinnedDigest(source, content) !== source.sha256) {
    throw new Error(
      `Raw file for "${sourceId}" does not match its pinned checksum. Run \`npm run data:fetch\`.`,
    );
  }
  return { source, content };
};

const manifest: Record<string, DatasetFingerprint> = {};

for (const builder of DATASET_BUILDERS) {
  const dataset = await builder.build(readSource);
  const json = JSON.stringify(dataset);
  await writeFileAtomic(publicFilePath(builder.outputPath), json);
  manifest[builder.outputPath] = fingerprintDataset(dataset, json);
  console.log(`✓ public/${builder.outputPath} (${formatBytes(Buffer.byteLength(json))})`);
  for (const notice of dataset.notices) {
    console.log(`  ${notice.level}: ${notice.message} [${notice.count}]`);
  }
}

// The datasets are not in the repository — they are rebuilt here every time — so a change to an
// importer alters scripture for every reader and shows up in review as a change to a regular
// expression. This file is the part that is committed: it records what the build produced, so
// altering the text means updating a tracked file and saying why.
const committed = await readFileIfExists(MANIFEST_FILE);
const built = formatManifest(manifest);
await writeFileAtomic(MANIFEST_FILE, built);

if (committed === undefined) {
  console.log('\n✓ data/datasets.lock.json written for the first time');
} else {
  const drift = describeManifestDrift(
    JSON.parse(committed.toString('utf8')) as DatasetManifest,
    manifest,
  );
  if (drift.length === 0) {
    console.log('\n✓ the datasets match data/datasets.lock.json');
  } else {
    console.log('\n! the datasets changed:');
    for (const line of drift) {
      console.log(`    ${line}`);
    }
    console.log('  data/datasets.lock.json has been updated — commit it with the change.');
  }
}
