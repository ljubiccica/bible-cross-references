import { Fragment, type ReactNode } from 'react';
import type { Emphasized } from '../../../i18n/messages/types.ts';
import { useLocalization } from '../../../i18n/use-locale.tsx';
import type { LinkSummary } from '../link-summary.ts';
import styles from './LinkStats.module.css';

interface LinkStatsProps {
  readonly summary: LinkSummary;
  /**
   * How to interact, shown under the numbers: with a mouse (on wide screens), or on a touch
   * screen (phones included, since touch gestures are harder to guess).
   */
  readonly hint?: { readonly pointer: ReactNode; readonly touch: ReactNode };
}

/** Renders a message's pieces, setting its numbers apart from the words around them. */
function Line({ parts }: { readonly parts: Emphasized }) {
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {typeof part === 'string' ? part : <strong>{part.strong}</strong>}
        </Fragment>
      ))}
    </>
  );
}

/** A quiet corner summary of what is on screen; context, not the main event. */
export function LinkStats({ summary, hint }: LinkStatsProps) {
  const { t, n, share } = useLocalization();
  const { verseCount, shownLinks, totalLinks, connectedVerses, crossTestamentLinks } = summary;
  return (
    <div className={styles.stats} aria-label={t('stats.label')}>
      <span>
        <Line parts={t('stats.verses')(n(verseCount))} /> ·{' '}
        <Line
          parts={t('stats.links')(n(shownLinks), shownLinks < totalLinks ? n(totalLinks) : null)}
        />
      </span>
      <span className={styles.secondary}>
        <Line parts={t('stats.connected')(share(connectedVerses, verseCount))} /> ·{' '}
        <Line parts={t('stats.crossTestament')(n(crossTestamentLinks))} />
      </span>
      {hint !== undefined && (
        <>
          <span className={`${styles.hint} ${styles.pointerHint}`}>{hint.pointer}</span>
          <span className={`${styles.hint} ${styles.touchHint}`}>{hint.touch}</span>
        </>
      )}
    </div>
  );
}
