import { TRANSLATION_IDS } from '../core/datasets/ids.ts';
import { DEFAULT_TRANSLATION_ID, getTranslationManifest } from './registry.ts';

/** Query selection survives reloads and leaves the default English edition available. */
export function selectedTranslation(
  search = (globalThis as { location?: { search: string } }).location?.search ?? '',
) {
  const requested = new URLSearchParams(search).get('translation');
  const id = TRANSLATION_IDS.find((id) => id === requested) ?? DEFAULT_TRANSLATION_ID;
  return getTranslationManifest(id);
}
