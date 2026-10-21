/**
 * Registers the offline cache (sw/service-worker.ts), in production builds only. Its scope is the
 * site's base path, the widest a worker served from there may have, so it never touches the other
 * sites of the origin.
 *
 * `datasets` are the files this visit has loaded, relative to that base. The worker keeps the
 * ones a first visit always needs by itself; these are the rest — the translation this reader
 * chose, which they will expect to have offline too.
 */
export function registerOfflineCache(datasets: readonly string[] = []): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return;
  }
  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
    .then(async (registration) => {
      // Every visit asks for the newest worker, rather than leaving it to the browser's own
      // check, which it may put off. A release that readers never receive is the one way a
      // cache like this can hold a whole audience on an old version — and the same request is
      // what withdraws the worker entirely if it ever has to be: a `sw.js` that has been taken
      // off the server unregisters it, and the site goes back to a plain one.
      await registration.update().catch(() => undefined);
      if (datasets.length === 0) {
        return;
      }
      const ready = await navigator.serviceWorker.ready;
      ready.active?.postMessage({ type: 'cache-datasets', paths: datasets });
    })
    .catch((error: unknown) => {
      console.warn('The offline cache is unavailable:', error);
    });
}

/**
 * Asks the worker to keep these datasets, for a reader who will want them offline later.
 *
 * Changing the interface language can change which Bible the app shows, and the installed app
 * opens at `start_url` with no query — so a reader who switches language online, then opens the
 * app offline, would arrive at a translation nothing had ever downloaded. This is what stops
 * that being a dead screen.
 */
export function cacheDatasets(paths: readonly string[]): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator) || paths.length === 0) {
    return;
  }
  navigator.serviceWorker.ready
    .then((ready) => {
      ready.active?.postMessage({ type: 'cache-datasets', paths });
    })
    .catch(() => undefined);
}
