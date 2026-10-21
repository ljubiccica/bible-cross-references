import {
  AddToHomeScreenIcon,
  AddressBarInstallIcon,
  BrowserMenuIcon,
  DoneIcon,
  ShareIcon,
} from '../../shared/ui/icons.tsx';
import type { InstallGuides } from './types.ts';

/**
 * The install steps in Spanish.
 *
 * The bold words are what those buttons are called in a Spanish-language browser: Safari says
 * «Añadir a pantalla de inicio», Chrome on Android says «Instalar aplicación», and a reader
 * following these is looking at their own phone rather than at a translation of the English.
 */
export const esInstall: InstallGuides = {
  ios: {
    label: 'iPhone',
    steps: [
      { icon: ShareIcon, text: <>Toque el botón «Compartir» en la barra de Safari.</> },
      {
        icon: AddToHomeScreenIcon,
        text: (
          <>
            Baje y elija <b>Añadir a pantalla de inicio</b>.
          </>
        ),
      },
      {
        icon: DoneIcon,
        text: (
          <>
            Toque <b>Añadir</b>. La aplicación se suma a las demás en su pantalla de inicio.
          </>
        ),
      },
    ],
    note: (
      <>
        Safari siempre lo ofrece. En iPhone y iPad, Chrome, Edge y Firefox usan el mismo menú y lo
        ofrecen allí donde lo admiten.
      </>
    ),
  },
  android: {
    label: 'Android',
    steps: [
      { icon: BrowserMenuIcon, text: <>Abra el menú en la barra de Chrome.</> },
      {
        icon: AddToHomeScreenIcon,
        text: (
          <>
            Elija <b>Instalar aplicación</b> o <b>Añadir a pantalla principal</b>.
          </>
        ),
      },
      {
        icon: DoneIcon,
        text: (
          <>
            Confirme con <b>Instalar</b>.
          </>
        ),
      },
    ],
  },
  desktop: {
    label: 'Ordenador',
    steps: [
      {
        icon: AddressBarInstallIcon,
        text: (
          <>
            En Chrome o Edge, haga clic en el icono de instalación al final de la barra de
            direcciones.
          </>
        ),
      },
      {
        icon: DoneIcon,
        text: (
          <>
            Elija <b>Instalar</b>. La aplicación se abre en una ventana propia.
          </>
        ),
      },
    ],
    note: (
      <>
        Safari en Mac instala desde <b>Compartir → Añadir al Dock</b>. Firefox no instala
        aplicaciones web, pero el sitio también funciona allí sin conexión una vez que lo ha
        abierto.
      </>
    ),
  },
};
