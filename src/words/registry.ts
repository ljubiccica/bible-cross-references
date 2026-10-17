import type { WordSourceId } from '../core/datasets/ids.ts';
import type { WordSourceManifest } from './word-source-manifest.ts';

const WORD_SOURCES: Readonly<Record<WordSourceId, WordSourceManifest>> = {
  stepbible: {
    id: 'stepbible',
    name: 'STEPBible Translators Amalgamated Hebrew OT and Greek NT',
    description:
      'Every word of the Hebrew Old Testament and the Greek New Testament tagged with its ' +
      'dictionary form, from Tyndale House, Cambridge. Only the dictionary forms and the ' +
      'verses they occur in are used here, never the text of a verse.',
    license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
    attribution:
      'Original-language words: STEP Bible (CC BY 4.0), based on work at Tyndale House, ' +
      'Cambridge. Modified: reduced to the dictionary forms used in each verse, keyed to KJV ' +
      'verse numbering, with psalm superscriptions left out.',
    homepage: 'https://www.STEPBible.org',
    versification: 'kjv',
  },
};

export const WORD_SOURCE_MANIFESTS: readonly WordSourceManifest[] = Object.values(WORD_SOURCES);

export function getWordSourceManifest(id: WordSourceId): WordSourceManifest {
  return WORD_SOURCES[id];
}
