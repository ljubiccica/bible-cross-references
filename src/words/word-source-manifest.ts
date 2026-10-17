import type { VersificationId } from '../core/bible/versification.ts';
import type { WordSourceId } from '../core/datasets/ids.ts';
import type { LicenseInfo } from '../core/datasets/metadata.ts';

/** Describes a source of original-language word tagging. */
export interface WordSourceManifest {
  readonly id: WordSourceId;
  readonly name: string;
  readonly description: string;
  readonly license: LicenseInfo;
  /** Credit line to display wherever the data is used. */
  readonly attribution: string;
  readonly homepage: string;
  readonly versification: VersificationId;
}
