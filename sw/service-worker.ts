/**
 * The offline cache. It makes repeat visits load from the device and lets the app work offline.
 *
 * The site lives under a path of a shared origin (trekhleb.dev/bible-cross-references/), so:
 * - the worker's scope is that path (browsers allow no wider scope for a worker served there), and
 *   it only ever handles requests under it;
 * - every cache it creates starts with `PREFIX`, and it only ever reads or deletes its own caches,
 *   never those of other sites on the origin.
 *
 * Strategies: the app's code and pages are cached per version and served from the cache
 * (pages network-first, so a new version shows up at once); the datasets are served from the cache
 * and refreshed in the background (stale-while-revalidate).
 */

declare const self: ServiceWorkerGlobalScope;

// Injected by the build (`offline()` in vite/offline.ts): paths relative to the worker's scope.
/** The app's pages. Without them there is no app offline, so they have to be stored. */
declare const PAGES: readonly string[];
/** This version's code, styles and icons. */
declare const FILES: readonly string[];
/** The datasets a first visit needs, cached across versions. */
declare const DATASETS: readonly string[];
/** Where all datasets live, so the ones loaded later (another translation) are cached too. */
declare const DATA_DIRECTORY: string;
/** Where the bundler's output lives — the one place whose file names carry their own content. */
declare const ASSETS_DIRECTORY: string;
/** A hash of this version's files; a new version gets new caches. */
declare const VERSION: string;
/** The dataset format's version, which the data cache is keyed on. */
declare const SCHEMA_VERSION: number;

const PREFIX = 'bible-cross-references';
const SHELL_CACHE = `${PREFIX}-shell-${VERSION}`;
// Keyed on the dataset format, not on the build: datasets are large and their URLs carry no
// content hash, so keeping them across releases is the point, and a bump only renames them —
// `activate` copies the previous cache's contents across and `dataset` looks in older ones on
// a miss, so nothing has to be downloaded again.
//
// Which means a bump does NOT discard datasets written in the old format: it carries them over
// under the new name, where `readDataset` rejects them. Online that heals — `loadDataset`
// evicts the entry and fetches again — but an offline reader has nothing to fetch, so bumping
// this is a thing to do in a release readers meet online. Carrying them over is still the right
// default: the alternative is re-downloading nine megabytes on every format change.
const DATA_CACHE = `${PREFIX}-data-v${String(SCHEMA_VERSION)}`;

const scope = new URL(self.registration.scope);
// Cached files are the same whatever the request's headers (they are named by their content, or
// are datasets), so lookups ignore `Vary`: some hosts vary on `Origin`, which module scripts send
// and the worker's own requests don't.
const LOOKUP: CacheQueryOptions = { ignoreVary: true };
const toUrl = (path: string) => new URL(path, scope).href;
const datasetUrls = new Set(DATASETS.map(toUrl));
const shellUrls = new Set(FILES.map(toUrl));
const dataPath = new URL(`${DATA_DIRECTORY}/`, scope).pathname;
const assetsPath = new URL(`${ASSETS_DIRECTORY}/`, scope).pathname;

/**
 * Whether the browser's HTTP cache is certainly holding the right copy of this URL.
 *
 * Only the bundler's output is: `assets/main-<hash>.js` names its own content, so whatever is
 * in the HTTP cache under that URL is what this build wants. Everything else here — the pages,
 * the manifests, the icons — keeps its name from one deploy to the next, and the host (GitHub
 * Pages, whose headers this project cannot set) may still be holding the previous deploy's copy.
 */
function selfVersioned(url: string): boolean {
  return new URL(url).pathname.startsWith(assetsPath);
}

/**
 * Fetches a file and stores it.
 *
 * `cache: 'reload'` goes past the HTTP cache to the network, and precaching a page needs it.
 * `cache.add` would take the HTTP cache's copy, which between a deploy and the end of its TTL is
 * the *previous* build's HTML — naming assets this build no longer has. `activate` then deletes
 * the shell that did have them. The result is an installed app that is complete, internally
 * consistent and broken until the next deploy, which is exactly the stuck-forever state a
 * service worker has to be written to avoid.
 */
async function put(cache: Cache, url: string, freshness?: RequestCache): Promise<void> {
  const response = await fetch(url, {
    cache: freshness ?? (selfVersioned(url) ? 'default' : 'reload'),
  });
  if (!response.ok) {
    throw new Error(`${url} answered ${String(response.status)}`);
  }
  await cache.put(url, response);
}

/** Stores what it can, and says what it could not: one missing file is not worth an app that
 * never works offline. */
async function store(
  cache: Cache,
  urls: readonly string[],
  freshness?: RequestCache,
): Promise<void> {
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      if (!(await cache.match(url, LOOKUP))) {
        await put(cache, url, freshness);
      }
    }),
  );
  const failed = results.filter((result) => result.status === 'rejected').length;
  if (failed > 0) {
    console.warn(`Offline cache: ${String(failed)} of ${String(urls.length)} files were skipped.`);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL_CACHE);
      // The pages first and on their own: everything else can be fetched again, they cannot.
      // All of them or none — a half-cached app is worse than one that is not installed.
      await Promise.all(PAGES.map(toUrl).map((url) => put(shell, url)));
      await store(shell, FILES.map(toUrl));
      // The datasets are the one thing taken from the HTTP cache on purpose: the page has just
      // downloaded them, they are megabytes, and a stale one repairs itself (`loadDataset`
      // evicts and refetches what it cannot read). They are not under `assets/`, so this has to
      // be said here: left to `selfVersioned` they would be re-fetched over the network.
      await store(await caches.open(DATA_CACHE), [...datasetUrls], 'default');
      await self.skipWaiting();
    })(),
  );
});

/**
 * The page tells the worker which datasets it is actually using, which is how a translation other
 * than the default one gets stored: on the visit it was chosen, the page had already fetched it
 * before this worker existed, so nothing else would ever put it here.
 */
self.addEventListener('message', (event) => {
  const message: unknown = event.data;
  if (
    typeof message !== 'object' ||
    message === null ||
    !('type' in message) ||
    message.type !== 'cache-datasets' ||
    !('paths' in message) ||
    !Array.isArray(message.paths)
  ) {
    return;
  }
  // `Array.isArray` narrows only to `any[]`, so the elements arrive untyped even here. This
  // is a message from the page, which is the one input the worker does not control.
  const paths: readonly unknown[] = message.paths;
  const dataDirectory = new URL(`${DATA_DIRECTORY}/`, scope).href;
  const urls = paths
    .filter((path): path is string => typeof path === 'string')
    .map(toUrl)
    // Under the data directory, and with no query. `store` keys on the whole URL, so
    // `bsb.json?1`, `?2`, … would each be a separate four-megabyte entry: anything that can
    // reach this worker could fill the reader's storage and push their offline copy out of it.
    .filter((url) => url.startsWith(dataDirectory) && !url.includes('?') && !url.includes('#'));
  event.waitUntil(
    (async () => {
      await store(await caches.open(DATA_CACHE), urls);
    })(),
  );
});

/** Moves everything a previous release cached under another name into this release's cache. */
async function adoptDatasets(from: string): Promise<void> {
  const previous = await caches.open(from);
  const current = await caches.open(DATA_CACHE);
  for (const request of await previous.keys()) {
    if ((await current.match(request, LOOKUP)) !== undefined) {
      continue;
    }
    const response = await previous.match(request, LOOKUP);
    if (response !== undefined) {
      await current.put(request, response);
    }
  }
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      const oldShells = names.filter(
        (name) => name.startsWith(`${PREFIX}-shell-`) && name !== SHELL_CACHE,
      );
      await Promise.all(oldShells.map((name) => caches.delete(name)));

      // Datasets a previous release stored are carried across, not dropped.
      //
      // The reader chose that Bible and it is already on their device; making them fetch four
      // megabytes again — over mobile data, or not at all because they are now on a plane — is
      // the worst thing an upgrade can do to them. Deleting the old cache and hoping the new one
      // refills is what breaks that, and it breaks hardest for exactly the reader who went
      // offline right after upgrading.
      await Promise.all(
        names
          .filter((name) => name.startsWith(`${PREFIX}-data`) && name !== DATA_CACHE)
          .map(async (name) => {
            await adoptDatasets(name);
            await caches.delete(name);
          }),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    url.origin !== scope.origin ||
    !url.pathname.startsWith(scope.pathname)
  ) {
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(page(request));
  } else if (url.pathname.startsWith(dataPath)) {
    event.respondWith(dataset(event, request));
  } else {
    event.respondWith(file(request));
  }
});

/** Pages: the network first, so a new version shows at once; this version's copy offline. */
async function page(request: Request): Promise<Response> {
  try {
    return await fetch(request);
  } catch {
    const shell = await caches.open(SHELL_CACHE);
    // `?ref=…` only selects a passage: every passage of a page is the same file.
    const cached = await shell.match(request, { ...LOOKUP, ignoreSearch: true });
    return cached ?? Response.error();
  }
}

/**
 * A copy a previous release left behind, promoted into this release's cache.
 *
 * `activate` moves them all across, but the release being replaced keeps running until the page
 * reloads and can write one more file under its own name afterwards — the reader switching
 * translation during the upgrade is exactly when that happens. Looking here on a miss means that
 * copy is found rather than re-downloaded, whenever it was written.
 */
async function adoptedCopy(current: Cache, request: Request): Promise<Response | undefined> {
  const names = (await caches.keys()).filter(
    (name) => name.startsWith(`${PREFIX}-data`) && name !== DATA_CACHE,
  );
  for (const name of names) {
    const response = await (await caches.open(name)).match(request, LOOKUP);
    if (response !== undefined) {
      await current.put(request, response.clone());
      return response;
    }
  }
  return undefined;
}

/** Datasets: the cached copy at once, refreshed in the background for the next visit. */
async function dataset(event: FetchEvent, request: Request): Promise<Response> {
  const cache = await caches.open(DATA_CACHE);
  const cached = (await cache.match(request, LOOKUP)) ?? (await adoptedCopy(cache, request));
  const refresh = fetch(request).then(async (response) => {
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  });
  if (cached) {
    event.waitUntil(refresh.catch(() => undefined));
    return cached;
  }
  return refresh;
}

/**
 * The app's files: named by their content, so the cached copy is always right. One that is
 * missing — a download that failed while this version was installing — is stored as it is
 * fetched, instead of being absent offline until the next release.
 *
 * Only the ones this version listed are stored, which is what makes the sentence above true.
 * Other things live under the scope and are served by this handler — the share pictures, the
 * screenshots, `robots.txt`, `sitemap.xml` — and none of them carries a hash in its name or
 * counts towards `VERSION`. Keeping those here would hand a reader the old copy out of the
 * shell every visit, until some unrelated change happened to rename the cache: a stale file
 * with no way for the reader to clear it, which is the one thing this worker must not create.
 * They are fetched and passed through instead.
 */
async function file(request: Request): Promise<Response> {
  const shell = await caches.open(SHELL_CACHE);
  const cached = await shell.match(request, LOOKUP);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (response.ok && shellUrls.has(new URL(request.url).href)) {
    await shell.put(request, response.clone());
  }
  return response;
}
