import { crossReferencesDatasetPath, translationDatasetPath } from '../../core/datasets/paths.ts';
import { CROSS_REFERENCE_SOURCE_MANIFESTS } from '../../cross-references/registry.ts';
import type { CrossReferenceSourceManifest } from '../../cross-references/source-manifest.ts';
import { DEFAULT_TRANSLATION_ID } from '../../translations/registry.ts';

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
 * The files a first visit needs, relative to the site's base: the links, and the text of the
 * default translation. The HTML preloads them (see vite/site-head.ts), so they download while the
 * scripts do, instead of after. A reader who has chosen another translation downloads that one
 * when the app starts (see `translationLoader`); only the default can be preloaded, because the
 * HTML is the same for everyone.
 */
export function vizDatasetPaths(): readonly string[] {
  return [
    translationDatasetPath(DEFAULT_TRANSLATION_ID),
    crossReferencesDatasetPath(vizCrossReferenceSource().id),
  ];
}
