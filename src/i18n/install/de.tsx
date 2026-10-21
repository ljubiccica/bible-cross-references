import {
  AddToHomeScreenIcon,
  AddressBarInstallIcon,
  BrowserMenuIcon,
  DoneIcon,
  ShareIcon,
} from '../../shared/ui/icons.tsx';
import type { InstallGuides } from './types.ts';

/**
 * The install steps in German.
 *
 * The bold words are what those buttons are called in a German-language browser: Safari says
 * „Zum Home-Bildschirm“, Chrome on Android says „App installieren“, and a reader following
 * these is looking at their own phone rather than at a translation of the English.
 */
export const deInstall: InstallGuides = {
  ios: {
    label: 'iPhone',
    steps: [
      { icon: ShareIcon, text: <>Tippen Sie in der Safari-Leiste auf „Teilen“.</> },
      {
        icon: AddToHomeScreenIcon,
        text: (
          <>
            Scrollen Sie nach unten und wählen Sie <b>Zum Home-Bildschirm</b>.
          </>
        ),
      },
      {
        icon: DoneIcon,
        text: (
          <>
            Tippen Sie auf <b>Hinzufügen</b>. Die App steht dann bei den anderen.
          </>
        ),
      },
    ],
    note: (
      <>
        Safari bietet das immer an. Chrome, Edge und Firefox nutzen auf iPhone und iPad dasselbe
        Menü und bieten es an, wo sie es unterstützen.
      </>
    ),
  },
  android: {
    label: 'Android',
    steps: [
      { icon: BrowserMenuIcon, text: <>Öffnen Sie das Menü in der Chrome-Leiste.</> },
      {
        icon: AddToHomeScreenIcon,
        text: (
          <>
            Wählen Sie <b>App installieren</b> oder <b>Zum Startbildschirm hinzufügen</b>.
          </>
        ),
      },
      {
        icon: DoneIcon,
        text: (
          <>
            Bestätigen Sie mit <b>Installieren</b>.
          </>
        ),
      },
    ],
  },
  desktop: {
    label: 'Computer',
    steps: [
      {
        icon: AddressBarInstallIcon,
        text: (
          <>Klicken Sie in Chrome oder Edge auf das Installationssymbol am Ende der Adressleiste.</>
        ),
      },
      {
        icon: DoneIcon,
        text: (
          <>
            Wählen Sie <b>Installieren</b>. Die App öffnet sich in einem eigenen Fenster.
          </>
        ),
      },
    ],
    note: (
      <>
        Safari auf dem Mac installiert über <b>Teilen → Zum Dock hinzufügen</b>. Firefox installiert
        keine Web-Apps, aber die Seite funktioniert auch dort offline, sobald Sie sie einmal
        geöffnet haben.
      </>
    ),
  },
};
