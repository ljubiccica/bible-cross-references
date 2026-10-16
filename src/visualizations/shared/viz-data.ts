import { CANONICAL_VERSIFICATION, type Versification } from '../../core/bible/versification.ts';
import type { TranslationId } from '../../core/datasets/ids.ts';
import {
  loadCrossReferences,
  type CrossReferenceDataset,
} from '../../cross-references/load-cross-references.ts';
import { createCachedLoader, type CachedLoader } from '../../shared/lib/cached-loader.ts';
import { loadTranslation } from '../../translations/load-translation.ts';
import { getTranslationManifest } from '../../translations/registry.ts';
import type { Translation } from '../../translations/translation.ts';
import { computeVerseGenres } from './verse-genres.ts';
import { vizCrossReferenceSource } from './viz-datasets.ts';

/** What every visualization needs whichever translation is being read. */
export interface VizCore {
  readonly versification: Versification;
  readonly crossReferences: CrossReferenceDataset;
  /** Genre ordinal of every verse. */
  readonly verseGenres: Uint8Array;
}

/** The core data with the text the reader has chosen. */
export interface VizData extends VizCore {
  readonly translation: Translation;
}

/**
 * The links: by far the larger download, and the same for every translation, so it is loaded once
 * and kept while the reader switches between texts.
 */
export const vizCoreLoader = createCachedLoader(async (): Promise<VizCore> => {
  const { dataset } = await loadCrossReferences(vizCrossReferenceSource());
  return {
    versification: CANONICAL_VERSIFICATION,
    crossReferences: dataset,
    verseGenres: computeVerseGenres(CANONICAL_VERSIFICATION),
  };
});

const translationLoaders = new Map<TranslationId, CachedLoader<Translation>>();

/**
 * The text of one translation. Each is downloaded the first time it is shown and then kept, so
 * switching back and forth costs nothing. Loading starts as early as the app knows which
 * translation to show (see `src/app/main.tsx`), alongside the links rather than after them.
 */
export function translationLoader(id: TranslationId): CachedLoader<Translation> {
  const existing = translationLoaders.get(id);
  if (existing) {
    return existing;
  }
  const loader = createCachedLoader(async () => {
    const { translation } = await loadTranslation(getTranslationManifest(id));
    return translation;
  });
  translationLoaders.set(id, loader);
  return loader;
}

/** Forgets a text, so a failed download can be tried again. */
export function resetTranslation(id: TranslationId): void {
  translationLoaders.delete(id);
}

/** Forgets every loaded text, so a failed download can be retried. */
export function resetTranslations(): void {
  translationLoaders.clear();
}
