/**
 * Chromium browsers (Android and desktop) offer to install the app through an event instead of a
 * method: it fires once, early, and can be replayed later from a button of our own. Listening for
 * it has to happen before anything renders, which is why this module is imported for its side
 * effect and keeps the event itself.
 *
 * Every other browser installs the app from its own menus, which is what the guide describes.
 */

/** What Chromium fires. It is not in the DOM types, being no standard. */
interface InstallPromptEvent extends Event {
  readonly prompt: () => Promise<unknown>;
}

function isInstallPromptEvent(event: Event): event is InstallPromptEvent {
  return 'prompt' in event && typeof event.prompt === 'function';
}

let pending: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function changed(): void {
  for (const listener of listeners) {
    listener();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Without this the browser shows an install bar of its own. The app is a reading surface
    // first; the invitation belongs in the footer, where the reader can ask for it.
    event.preventDefault();
    if (isInstallPromptEvent(event)) {
      pending = event;
      changed();
    }
  });
  window.addEventListener('appinstalled', () => {
    pending = null;
    changed();
  });
}

/** Subscribes to the offer appearing or being used up (for `useSyncExternalStore`). */
export function subscribeToInstallPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Whether this browser can install the app itself, without the reader going through its menus. */
export function canPromptToInstall(): boolean {
  return pending !== null;
}

/** Asks the browser to install the app. The offer is good once; Chromium makes a new one later. */
export async function promptToInstall(): Promise<void> {
  const event = pending;
  if (!event) {
    return;
  }
  try {
    await event.prompt();
  } catch (error) {
    // It can refuse (an offer already spent, a gesture it did not count). The steps below the
    // button are the way through, and they are already on screen.
    console.warn('The browser did not offer to install the app:', error);
  } finally {
    // Spent either way: a new offer arrives as its own event.
    pending = null;
    changed();
  }
}
