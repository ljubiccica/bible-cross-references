import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { currentInstallPlatform, type InstallPlatform } from '../lib/install-platform.ts';
import {
  canPromptToInstall,
  promptToInstall,
  subscribeToInstallPrompt,
} from '../lib/install-prompt.ts';
import {
  AddressBarInstallIcon,
  AddToHomeScreenIcon,
  BrowserMenuIcon,
  CloseIcon,
  DoneIcon,
  InstallIcon,
  ShareIcon,
  type IconComponent,
} from './icons.tsx';
import styles from './InstallGuide.module.css';

/**
 * The guide opens by itself at this address, so a link to it can be shared with someone who asks
 * for "the app": there is no page to maintain, and the app itself is already on screen behind it.
 */
const INSTALL_HASH = '#install';

/** The device this page is being read on. It does not change while the page is open. */
const DEVICE = currentInstallPlatform();

/**
 * How the dialog opens, set by the one that is mounted. The app keeps every view mounted at once,
 * so there is more than one footer in the page and more than one link into this guide, but only
 * ever one dialog — rendered by `mount()`, outside the views, where nothing can hide it halfway
 * through a switch.
 */
let showGuide: (() => void) | null = null;

/** The footer's entry point: see `InstallGuideDialog` for what it opens. */
export function InstallLink() {
  return (
    <button
      type="button"
      className={styles.trigger}
      // Named here, not by the word beside the arrow: on phones the arrow stands on its own.
      title="Install the app"
      aria-label="Install the app"
      onClick={() => {
        showGuide?.();
      }}
    >
      <InstallIcon />
      <span className={styles.triggerLabel}>Install</span>
    </button>
  );
}

interface Step {
  /** The glyph of the button the step names, as that button wears it. */
  readonly icon: IconComponent;
  readonly text: ReactNode;
}

interface PlatformGuide {
  /** The device's name, on the switch between the three sets of steps. */
  readonly label: string;
  readonly steps: readonly Step[];
  /** What holds for the platform but not for the steps: another browser, another menu. */
  readonly note?: ReactNode;
}

/** Every browser keeps this feature somewhere else; these are the three shapes of it. */
const GUIDES: Record<InstallPlatform, PlatformGuide> = {
  ios: {
    label: 'iPhone',
    steps: [
      { icon: ShareIcon, text: <>Tap the share button in Safari&apos;s toolbar.</> },
      {
        icon: AddToHomeScreenIcon,
        text: (
          <>
            Scroll down and choose <b>Add to Home Screen</b>.
          </>
        ),
      },
      {
        icon: DoneIcon,
        text: (
          <>
            Tap <b>Add</b>. The app joins the others on your home screen.
          </>
        ),
      },
    ],
    note: (
      <>
        Safari always offers this. Chrome, Edge and Firefox on an iPhone or iPad share the same
        menu, and offer it where they support it.
      </>
    ),
  },
  android: {
    label: 'Android',
    steps: [
      { icon: BrowserMenuIcon, text: <>Open the menu in Chrome&apos;s toolbar.</> },
      {
        icon: AddToHomeScreenIcon,
        text: (
          <>
            Choose <b>Install app</b>, or <b>Add to Home screen</b>.
          </>
        ),
      },
      {
        icon: DoneIcon,
        text: (
          <>
            Confirm <b>Install</b>.
          </>
        ),
      },
    ],
  },
  desktop: {
    label: 'Desktop',
    steps: [
      {
        icon: AddressBarInstallIcon,
        text: <>In Chrome or Edge, click the install button at the end of the address bar.</>,
      },
      {
        icon: DoneIcon,
        text: (
          <>
            Choose <b>Install</b>. The app opens in a window of its own.
          </>
        ),
      },
    ],
    note: (
      <>
        Safari on a Mac installs from <b>Share → Add to Dock</b>. Firefox installs no web apps, but
        the site still works offline there once you have opened it.
      </>
    ),
  },
};

const PLATFORMS: readonly InstallPlatform[] = ['ios', 'android', 'desktop'];

/**
 * How to keep the app on a home screen and read it with no connection. It opens from the footer's
 * quietest link, which hides itself once the app is installed (the stylesheet asks the browser how
 * the page is being displayed), and from the address this page ends in `#install`.
 */
export function InstallGuideDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [platform, setPlatform] = useState<InstallPlatform>(DEVICE);
  // Chromium can do the whole thing itself where it has offered to; everywhere else the steps are
  // all there is. The offer can arrive after this has rendered, and is spent once it is taken.
  const canPrompt = useSyncExternalStore(subscribeToInstallPrompt, canPromptToInstall, () => false);
  const guide = GUIDES[platform];

  useEffect(() => {
    const open = () => {
      const dialog = dialogRef.current;
      if (dialog && !dialog.open) {
        dialog.showModal();
      }
    };
    const openFromAddress = () => {
      if (window.location.hash === INSTALL_HASH) {
        open();
      }
    };
    showGuide = open;
    openFromAddress();
    window.addEventListener('hashchange', openFromAddress);
    return () => {
      showGuide = null;
      window.removeEventListener('hashchange', openFromAddress);
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="install-guide-title"
      // A modal dialog is handed the clicks that land beside it, which is how it closes: a tap
      // outside is how every sheet on a phone is dismissed. Two things are not that tap. Its own
      // scrollbar belongs to the dialog, so the point is measured against the card's own edges;
      // and the second half of a double-click on the link that opened it lands on the backdrop
      // that has just appeared under the pointer, which would shut the dialog before it is read.
      onClick={(event) => {
        const dialog = dialogRef.current;
        if (!dialog || event.target !== dialog || event.detail > 1) {
          return;
        }
        const { top, right, bottom, left } = dialog.getBoundingClientRect();
        const { clientX, clientY } = event;
        if (clientX < left || clientX > right || clientY < top || clientY > bottom) {
          dialog.close();
        }
      }}
      onClose={() => {
        // The address can be shared; it should not stay behind in the reader's own.
        if (window.location.hash === INSTALL_HASH) {
          window.history.replaceState(
            null,
            '',
            `${window.location.pathname}${window.location.search}`,
          );
        }
      }}
    >
      <div className={styles.card}>
        <div className={styles.head}>
          <h2 id="install-guide-title" className={styles.title}>
            Install the app
          </h2>
          <button
            type="button"
            className={styles.close}
            aria-label="Close"
            onClick={() => {
              dialogRef.current?.close();
            }}
          >
            <CloseIcon />
          </button>
        </div>
        <p className={styles.lede}>
          Keep it on your home screen and read it with no connection. No app store, no account.
        </p>
        {canPrompt && (
          <button
            type="button"
            className={styles.action}
            onClick={() => {
              void promptToInstall();
            }}
          >
            <InstallIcon />
            Install now
          </button>
        )}
        <div className={styles.tabs} role="group" aria-label="Device">
          {PLATFORMS.map((option) => (
            <button
              key={option}
              type="button"
              className={styles.tab}
              aria-pressed={option === platform}
              onClick={() => {
                setPlatform(option);
              }}
            >
              {GUIDES[option].label}
            </button>
          ))}
        </div>
        <ol className={styles.steps}>
          {guide.steps.map((step, index) => (
            <li key={index} className={styles.step}>
              <span className={styles.stepIcon}>
                <step.icon />
              </span>
              <span>{step.text}</span>
            </li>
          ))}
        </ol>
        {guide.note !== undefined && <p className={styles.note}>{guide.note}</p>}
        <p className={styles.note}>
          Open the app once while you are online: that is when it stores the Bible text and the
          cross-references on your device.
        </p>
      </div>
    </dialog>
  );
}
