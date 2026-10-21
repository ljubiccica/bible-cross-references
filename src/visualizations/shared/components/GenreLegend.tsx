import { useState } from 'react';
import { useLocalization } from '../../../i18n/use-locale.tsx';
import { CloseIcon, GenresIcon } from '../../../shared/ui/icons.tsx';
import styles from './GenreLegend.module.css';
import { GenreToggles, type GenreTogglesProps } from './GenreToggles.tsx';

/**
 * The genre legend as an overlay in the stage's top-left corner. On phones it collapses to an
 * icon button, like the icon-only header menus there.
 */
export function GenreLegend(toggles: GenreTogglesProps) {
  const { t } = useLocalization();
  const [open, setOpen] = useState(false);
  return (
    <section className={styles.legend} data-open={open} aria-label={t('genres.label')}>
      <button
        type="button"
        className={styles.toggle}
        aria-label={open ? t('genres.hide') : t('genres.show')}
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        {open ? <CloseIcon /> : <GenresIcon />}
      </button>
      <GenreToggles {...toggles} />
    </section>
  );
}
