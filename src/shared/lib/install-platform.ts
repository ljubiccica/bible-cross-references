/** The devices the install guide has steps for; each has its own way of adding a web app. */
/** The devices the install guide has steps for. A list, so every one of them can be walked. */
export const INSTALL_PLATFORMS = ['ios', 'android', 'desktop'] as const;

export type InstallPlatform = (typeof INSTALL_PLATFORMS)[number];

/**
 * Which set of steps to show first. It only picks a starting point — the guide lets the reader
 * switch — so it errs towards the desktop steps, which also say what to do on a Mac.
 */
export function installPlatformFor(userAgent: string, maxTouchPoints: number): InstallPlatform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return 'ios';
  }
  // An iPad calls itself a Macintosh; its touch screen is what gives it away.
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) {
    return 'ios';
  }
  if (/Android/i.test(userAgent)) {
    return 'android';
  }
  return 'desktop';
}

/** The platform of the device the app is running on. */
export function currentInstallPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') {
    return 'desktop';
  }
  return installPlatformFor(navigator.userAgent, navigator.maxTouchPoints);
}
