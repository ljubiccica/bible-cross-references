import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cacheDatasets, registerOfflineCache } from './register-offline-cache.ts';

/** A registration that records what the page asked of it. */
function createServiceWorker() {
  const postMessage = vi.fn();
  const update = vi.fn(() => Promise.resolve());
  const register = vi.fn<(url: string | URL, options?: { scope: string }) => Promise<unknown>>(() =>
    Promise.resolve({ update }),
  );
  return {
    postMessage,
    update,
    register,
    api: {
      register,
      ready: Promise.resolve({ active: { postMessage } }),
    },
  };
}

function useServiceWorker(worker: ReturnType<typeof createServiceWorker>) {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: worker.api,
    configurable: true,
    writable: true,
  });
}

/** Lets the registration's promise chain run to the end. */
const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('registerOfflineCache', () => {
  beforeEach(() => {
    vi.stubEnv('PROD', true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Reflect.deleteProperty(navigator, 'serviceWorker');
    vi.restoreAllMocks();
  });

  it('registers the worker at the site’s own base path, and no wider', async () => {
    const worker = createServiceWorker();
    useServiceWorker(worker);
    registerOfflineCache();
    await settled();
    const [url, options] = worker.register.mock.calls[0] ?? [];
    expect(String(url)).toContain('sw.js');
    expect(options).toEqual({ scope: import.meta.env.BASE_URL });
  });

  it('asks for the newest worker on every visit, so no reader is left on an old release', async () => {
    const worker = createServiceWorker();
    useServiceWorker(worker);
    registerOfflineCache();
    await settled();
    expect(worker.update).toHaveBeenCalled();
  });

  it('tells the worker which datasets this visit loaded', async () => {
    const worker = createServiceWorker();
    useServiceWorker(worker);
    registerOfflineCache(['data/translations/kjv.json']);
    await settled();
    expect(worker.postMessage).toHaveBeenCalledWith({
      type: 'cache-datasets',
      paths: ['data/translations/kjv.json'],
    });
  });

  it('says nothing to the worker when there is nothing extra to keep', async () => {
    const worker = createServiceWorker();
    useServiceWorker(worker);
    registerOfflineCache();
    await settled();
    expect(worker.postMessage).not.toHaveBeenCalled();
  });

  it('carries on without a cache when registration is refused', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const worker = createServiceWorker();
    worker.register.mockRejectedValueOnce(new Error('insecure context'));
    useServiceWorker(worker);
    registerOfflineCache();
    await settled();
    expect(warn).toHaveBeenCalledWith('The offline cache is unavailable:', expect.any(Error));
  });

  it('carries on when the update check fails, since the cache still works', async () => {
    const worker = createServiceWorker();
    worker.update.mockRejectedValueOnce(new Error('offline'));
    useServiceWorker(worker);
    registerOfflineCache(['data/x.json']);
    await settled();
    expect(worker.postMessage).toHaveBeenCalled();
  });

  it('registers nothing in a development build', async () => {
    vi.stubEnv('PROD', false);
    const worker = createServiceWorker();
    useServiceWorker(worker);
    registerOfflineCache();
    await settled();
    expect(worker.register).not.toHaveBeenCalled();
  });

  it('registers nothing in a browser without service workers', async () => {
    const worker = createServiceWorker();
    registerOfflineCache();
    await settled();
    expect(worker.register).not.toHaveBeenCalled();
  });
});

describe('cacheDatasets', () => {
  beforeEach(() => {
    vi.stubEnv('PROD', true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });

  it('asks the worker to keep a dataset this visit has not loaded', async () => {
    // Switching language can change which Bible the app will open with, and the installed app
    // starts at a URL with no query — so the new one has to be stored while there is a network.
    const worker = createServiceWorker();
    useServiceWorker(worker);
    cacheDatasets(['data/translations/blivre.json']);
    await settled();
    expect(worker.postMessage).toHaveBeenCalledWith({
      type: 'cache-datasets',
      paths: ['data/translations/blivre.json'],
    });
  });

  it('says nothing when there is nothing to keep', async () => {
    const worker = createServiceWorker();
    useServiceWorker(worker);
    cacheDatasets([]);
    await settled();
    expect(worker.postMessage).not.toHaveBeenCalled();
  });

  it('does nothing outside a production build, where no worker is registered', async () => {
    vi.stubEnv('PROD', false);
    const worker = createServiceWorker();
    useServiceWorker(worker);
    cacheDatasets(['data/translations/blivre.json']);
    await settled();
    expect(worker.postMessage).not.toHaveBeenCalled();
  });

  it('does nothing in a browser with no service worker at all', () => {
    Reflect.deleteProperty(navigator, 'serviceWorker');
    expect(() => {
      cacheDatasets(['data/translations/blivre.json']);
    }).not.toThrow();
  });

  it('stays quiet when the worker never becomes ready', async () => {
    const worker = createServiceWorker();
    const failing = Promise.reject(new Error('no worker'));
    // The rejection is handled inside `cacheDatasets`; this keeps Node from seeing it first.
    failing.catch(() => undefined);
    useServiceWorker({
      ...worker,
      api: { register: worker.register, ready: failing },
    });
    expect(() => {
      cacheDatasets(['data/translations/blivre.json']);
    }).not.toThrow();
    await settled();
  });
});
