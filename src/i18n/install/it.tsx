import {
  AddToHomeScreenIcon,
  AddressBarInstallIcon,
  BrowserMenuIcon,
  DoneIcon,
  ShareIcon,
} from '../../shared/ui/icons.tsx';
import type { InstallGuides } from './types.ts';

/**
 * The install steps in Italian.
 *
 * The bold words are what those buttons are called in an Italian-language browser: Safari says
 * «Aggiungi a Home», Chrome on Android says «Installa app», and a reader following these is
 * looking at their own phone rather than at a translation of the English.
 */
export const itInstall: InstallGuides = {
  ios: {
    label: 'iPhone',
    steps: [
      { icon: ShareIcon, text: <>Tocca il pulsante «Condividi» nella barra di Safari.</> },
      {
        icon: AddToHomeScreenIcon,
        text: (
          <>
            Scorri in basso e scegli <b>Aggiungi a Home</b>.
          </>
        ),
      },
      {
        icon: DoneIcon,
        text: (
          <>
            Tocca <b>Aggiungi</b>. L’app si affianca alle altre nella schermata Home.
          </>
        ),
      },
    ],
    note: (
      <>
        Safari lo propone sempre. Su iPhone e iPad, Chrome, Edge e Firefox usano lo stesso menu e lo
        propongono dove lo supportano.
      </>
    ),
  },
  android: {
    label: 'Android',
    steps: [
      { icon: BrowserMenuIcon, text: <>Apri il menu nella barra di Chrome.</> },
      {
        icon: AddToHomeScreenIcon,
        text: (
          <>
            Scegli <b>Installa app</b> oppure <b>Aggiungi a schermata Home</b>.
          </>
        ),
      },
      {
        icon: DoneIcon,
        text: (
          <>
            Conferma con <b>Installa</b>.
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
          <>
            In Chrome o Edge, fai clic sull’icona di installazione in fondo alla barra degli
            indirizzi.
          </>
        ),
      },
      {
        icon: DoneIcon,
        text: (
          <>
            Scegli <b>Installa</b>. L’app si apre in una finestra tutta sua.
          </>
        ),
      },
    ],
    note: (
      <>
        Safari su Mac installa da <b>Condividi → Aggiungi al Dock</b>. Firefox non installa
        applicazioni web, ma anche lì il sito funziona offline una volta che l’hai aperto.
      </>
    ),
  },
};
