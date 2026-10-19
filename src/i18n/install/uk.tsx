import {
  AddToHomeScreenIcon,
  AddressBarInstallIcon,
  BrowserMenuIcon,
  DoneIcon,
  ShareIcon,
} from '../../shared/ui/icons.tsx';
import type { InstallGuides } from './types.ts';

/**
 * The install steps in Ukrainian.
 *
 * The bold words are the names those buttons wear in a Ukrainian-language browser, not
 * translations of the English ones. Apple's Ukrainian calls the home screen «початковий екран»
 * («Додому» is the Russian label in Ukrainian letters), and Google's Ukrainian Chrome says
 * «Установити», not «Встановити» — so those are what a reader following these will see.
 */
export const ukInstall: InstallGuides = {
  ios: {
    label: 'iPhone',
    steps: [
      { icon: ShareIcon, text: <>Натисніть кнопку «Поділитися» на панелі Safari.</> },
      {
        icon: AddToHomeScreenIcon,
        text: (
          <>
            Прокрутіть униз і виберіть <b>На початковий екран</b>.
          </>
        ),
      },
      {
        icon: DoneIcon,
        text: (
          <>
            Натисніть <b>Додати</b>. Застосунок стане поруч з іншими на головному екрані.
          </>
        ),
      },
    ],
    note: (
      <>
        Safari пропонує це завжди. Chrome, Edge і Firefox на iPhone чи iPad користуються тим самим
        меню й пропонують це там, де підтримують.
      </>
    ),
  },
  android: {
    label: 'Android',
    steps: [
      { icon: BrowserMenuIcon, text: <>Відкрийте меню на панелі Chrome.</> },
      {
        icon: AddToHomeScreenIcon,
        text: (
          <>
            Виберіть <b>Установити й створити ярлик</b> або <b>Додати на головний екран</b>.
          </>
        ),
      },
      {
        icon: DoneIcon,
        text: (
          <>
            Підтвердьте <b>Установити</b>.
          </>
        ),
      },
    ],
  },
  desktop: {
    label: 'Комп’ютер',
    steps: [
      {
        icon: AddressBarInstallIcon,
        text: <>У Chrome або Edge натисніть кнопку встановлення в кінці адресного рядка.</>,
      },
      {
        icon: DoneIcon,
        text: (
          <>
            Виберіть <b>Установити</b>. Застосунок відкриється в окремому вікні.
          </>
        ),
      },
    ],
    note: (
      <>
        Safari на Mac встановлює через <b>Поділитися → Додати в Dock</b>. Firefox не встановлює
        вебзастосунків, але сайт і там працює офлайн, щойно ви його відкрили.
      </>
    ),
  },
};
