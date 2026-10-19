import { crossReferencesDatasetPath } from '../../core/datasets/paths.ts';
import { CROSS_REFERENCE_SOURCE_MANIFESTS } from '../../cross-references/registry.ts';
import type { CrossReferenceSourceManifest } from '../../cross-references/source-manifest.ts';

/** The cross-reference source the visualizations draw. */
export function vizCrossReferenceSource(): CrossReferenceSourceManifest {
  const manifest = CROSS_REFERENCE_SOURCE_MANIFESTS.find(
    ({ enabledByDefault }) => enabledByDefault,
  );
  if (!manifest) {
    throw new Error('No cross-reference source is enabled by default.');
  }
  return manifest;
}

/**
 * The datasets worth storing for every reader, whatever language they installed.
 *
 * The cross-references, and not the text. There is one service worker for all six languages —
 * it cannot know at install which translation the reader in front of it uses — so precaching the
 * default means a German reader downloads the English Bible (3.9 MB) they will never open, on
 * top of the Lutherbibel they will. The page is the thing that knows: it posts `cache-datasets`
 * with the translation it actually loaded (`main.tsx`), and switching translation does the same.
 */
export function sharedDatasetPaths(): readonly string[] {
  return [crossReferencesDatasetPath(vizCrossReferenceSource().id)];
}
