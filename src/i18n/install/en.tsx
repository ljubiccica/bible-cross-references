import {
  AddToHomeScreenIcon,
  AddressBarInstallIcon,
  BrowserMenuIcon,
  DoneIcon,
  ShareIcon,
} from '../../shared/ui/icons.tsx';
import type { InstallGuides } from './types.ts';

/** Every browser keeps this feature somewhere else; these are the three shapes of it. */
export const enInstall: InstallGuides = {
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
