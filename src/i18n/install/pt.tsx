import {
  AddToHomeScreenIcon,
  AddressBarInstallIcon,
  BrowserMenuIcon,
  DoneIcon,
  ShareIcon,
} from '../../shared/ui/icons.tsx';
import type { InstallGuides } from './types.ts';

/**
 * The install steps in Portuguese. The words in bold are the ones Safari, Chrome and Edge
 * actually show in a Portuguese interface, so they are quoted rather than translated freshly.
 */
export const ptInstall: InstallGuides = {
  ios: {
    label: 'iPhone',
    steps: [
      {
        icon: ShareIcon,
        text: <>Toque no botão de compartilhamento na barra do Safari.</>,
      },
      {
        icon: AddToHomeScreenIcon,
        text: (
          <>
            Role para baixo e escolha <b>Adicionar à Tela de Início</b>.
          </>
        ),
      },
      {
        icon: DoneIcon,
        text: (
          <>
            Toque em <b>Adicionar</b>. O app aparece na sua tela inicial.
          </>
        ),
      },
    ],
    note: (
      <>
        O Safari sempre oferece isso. Chrome, Edge e Firefox no iPhone ou iPad usam o mesmo menu, e
        oferecem onde houver suporte.
      </>
    ),
  },
  android: {
    label: 'Android',
    steps: [
      { icon: BrowserMenuIcon, text: <>Abra o menu na barra do Chrome.</> },
      {
        icon: AddToHomeScreenIcon,
        text: (
          <>
            Escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.
          </>
        ),
      },
      {
        icon: DoneIcon,
        text: (
          <>
            Confirme com <b>Instalar</b>.
          </>
        ),
      },
    ],
  },
  desktop: {
    label: 'Computador',
    steps: [
      {
        icon: AddressBarInstallIcon,
        text: <>No Chrome ou no Edge, clique no botão de instalar no fim da barra de endereço.</>,
      },
      {
        icon: DoneIcon,
        text: (
          <>
            Escolha <b>Instalar</b>. O aplicativo abre numa janela própria.
          </>
        ),
      },
    ],
    note: (
      <>
        O Safari no Mac instala em <b>Compartilhar → Adicionar ao Dock</b>. O Firefox não instala
        aplicativos web, mas o site continua funcionando sem conexão depois de aberto.
      </>
    ),
  },
};
