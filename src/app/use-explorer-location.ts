import { useCallback, useEffect, useState } from 'react';
import type { Versification } from '../core/bible/versification.ts';
import type { TranslationId } from '../core/datasets/ids.ts';
import type { LocaleId } from '../i18n/locale-id.ts';
import {
  explorerUrl,
  parseExplorerUrl,
  plainTranslationFor,
  type ExplorerLocation,
  type ViewRoute,
} from './explorer-location.ts';

/** How a location change enters the browser history. */
export interface NavigateOptions {
  /** Replace the current entry instead of adding one (e.g. for filter changes). */
  readonly replace?: boolean;
}

/**
 * The active view, the focused passage and the link filter, kept in the URL. A new passage or view
 * is a browser history entry, so the back button (or gesture) returns to the previous one.
 */
export function useExplorerLocation<Id extends string>(
  routes: readonly [ViewRoute<Id>, ...ViewRoute<Id>[]],
  versification: Versification,
  defaultTranslation: TranslationId,
  defaultLocale: LocaleId,
): readonly [
  ExplorerLocation<Id>,
  (next: ExplorerLocation<Id>, options?: NavigateOptions) => void,
] {
  const read = useCallback(
    () =>
      parseExplorerUrl(
        new URL(window.location.href),
        import.meta.env.BASE_URL,
        routes,
        versification,
        defaultTranslation,
        defaultLocale,
      ),
    [routes, versification, defaultTranslation, defaultLocale],
  );
  const [location, setLocation] = useState(read);

  useEffect(() => {
    const syncFromUrl = () => {
      setLocation(read());
    };
    window.addEventListener('popstate', syncFromUrl);
    return () => {
      window.removeEventListener('popstate', syncFromUrl);
    };
  }, [read]);

  const navigate = useCallback(
    (next: ExplorerLocation<Id>, { replace = false }: NavigateOptions = {}) => {
      setLocation(next);
      const route = routes.find((candidate) => candidate.id === next.view) ?? routes[0];
      const url = explorerUrl(
        route,
        next,
        import.meta.env.BASE_URL,
        versification,
        plainTranslationFor(defaultTranslation),
      );
      if (url !== `${window.location.pathname}${window.location.search}`) {
        if (replace) {
          window.history.replaceState(null, '', url);
        } else {
          window.history.pushState(null, '', url);
        }
      }
    },
    [routes, versification, defaultTranslation],
  );

  return [location, navigate];
}
