import type { ReactNode } from 'react';
import type { InstallPlatform } from '../../shared/lib/install-platform.ts';
import type { IconComponent } from '../../shared/ui/icons.tsx';

export interface Step {
  /** The glyph of the button the step names, as that button wears it. */
  readonly icon: IconComponent;
  readonly text: ReactNode;
}

export interface PlatformGuide {
  /** The device's name, on the switch between the three sets of steps. */
  readonly label: string;
  readonly steps: readonly Step[];
  /** What holds for the platform but not for the steps: another browser, another menu. */
  readonly note?: ReactNode;
}

/**
 * The install steps, per device, in one language.
 *
 * These live apart from the plain messages because they are not plain: each step names a button
 * in bold, and the name has to be the one that browser actually shows in that language. A
 * translator working here is reading their own phone, not only this file.
 */
export type InstallGuides = Readonly<Record<InstallPlatform, PlatformGuide>>;
