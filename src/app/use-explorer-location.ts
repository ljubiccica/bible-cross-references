import { useCallback, useEffect, useState } from 'react';
import type { Versification } from '../core/bible/versification.ts';
import type { TranslationId } from '../core/datasets/ids.ts';
import type { LocaleId } from '../i18n/locale-id.ts';
import {
  explorerUrl,
  localeUpgradeUrl,
  parseExplorerUrl,
  plainLocaleFor,
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
  defaultTranslation: (locale: LocaleId) => TranslationId,
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

  // A link shared before the language paths existed says `?lang=pt`. It still opens in
  // Portuguese — `parseExplorerUrl` reads the parameter exactly as it always has — and this
  // moves the language into the path afterwards, without a navigation and without touching
  // anything else the address carries, so that the link the reader goes on to copy or bookmark
  // is the one that previews in Portuguese. Replace, never push: pressing Back must leave the
  // app, not undo a rewrite the reader never asked for.
  useEffect(() => {
    const upgraded = localeUpgradeUrl(
      new URL(window.location.href),
      import.meta.env.BASE_URL,
      routes,
    );
    if (upgraded !== null) {
      window.history.replaceState(null, '', upgraded);
    }
    // Once, on arrival. `routes` is a module constant, so this does not re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        // What this reader would land on without a `?t=`: their own preference, read at their
        // own language rather than at whatever language the address happens to name.
        plainTranslationFor(defaultTranslation(defaultLocale)),
        plainLocaleFor(defaultLocale),
      );
      if (url !== `${window.location.pathname}${window.location.search}`) {
        if (replace) {
          window.history.replaceState(null, '', url);
        } else {
          window.history.pushState(null, '', url);
        }
      }
    },
    [routes, versification, defaultTranslation, defaultLocale],
  );

  return [location, navigate];
}
