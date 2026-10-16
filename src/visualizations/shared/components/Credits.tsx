import { t } from '../../../locales/ui.ts';
import { selectedTranslation } from '../../../translations/selection.ts';
import styles from './Credits.module.css';

interface CreditsProps {
  /** The work that inspired the visualization, credited by name with a link. */
  readonly inspiration?: { readonly title: string; readonly author: string; readonly url: string };
}

/**
 * Data attribution (required by CC BY 4.0) plus the visualization's inspiration. Phones show the
 * essential attribution only; the details appear on wider screens.
 */
export function Credits({ inspiration }: CreditsProps) {
  const translation = selectedTranslation();
  return (
    <>
      <span className={styles.detail}>{t('Links:')} </span>
      <a href="https://www.openbible.info/labs/cross-references/" target="_blank" rel="noreferrer">
        OpenBible.info
      </a>{' '}
      (CC BY 4.0
      <span className={styles.detail}>{t(', from the Treasury of Scripture Knowledge')}</span>
      {t(') · Text:')} {translation.abbreviation}
      <span className={styles.detail}> ({t(translation.license.name)})</span>
      {inspiration && (
        <span className={styles.detail}>
          {' '}
          {t('· Inspired by')}{' '}
          <a href={inspiration.url} target="_blank" rel="noreferrer">
            {inspiration.title}
          </a>{' '}
          {t('by')} {inspiration.author}
        </span>
      )}
    </>
  );
}
