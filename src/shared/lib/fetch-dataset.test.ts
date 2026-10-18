import { afterEach, describe, expect, it, vi } from 'vitest';
import { DatasetUnavailableError, fetchDataset, loadDataset, measure } from './fetch-dataset.ts';

function respondWith(body: string, init: ResponseInit = {}): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(body, { status: 200, ...init }))),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchDataset', () => {
  it('returns the parsed JSON and a report of the download', async () => {
    respondWith('{"hello":"world"}');
    const { json, report } = await fetchDataset('data/thing.json');
    expect(json).toEqual({ hello: 'world' });
    expect(report.path).toBe('data/thing.json');
    expect(report.url).toBe(`${import.meta.env.BASE_URL}data/thing.json`);
    expect(report.bytes).toBe(17);
    expect(report.downloadMs).toBeGreaterThanOrEqual(0);
    expect(report.parseMs).toBeGreaterThanOrEqual(0);
  });

  it('explains how to generate the datasets when the file is not there', async () => {
    respondWith('not found', { status: 404 });
    await expect(fetchDataset('data/missing.json')).rejects.toBeInstanceOf(DatasetUnavailableError);
    await expect(fetchDataset('data/missing.json')).rejects.toThrow(/HTTP 404/);
    await expect(fetchDataset('data/missing.json')).rejects.toThrow(/npm run data/);
  });

  it('reports a network failure rather than letting it through raw', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('connection refused'))),
    );
    await expect(fetchDataset('data/x.json')).rejects.toThrow(/connection refused/);
  });

  it('reports a rejection that is not an Error', async () => {
    // Something that is not an Error: the loader has to describe it rather than crash on it.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new (class extends Object {})() as Error)),
    );
    await expect(fetchDataset('data/x.json')).rejects.toThrow(/network error/);
  });

  it('reports a body that is not JSON', async () => {
    respondWith('<html>a proxy error page</html>');
    await expect(fetchDataset('data/x.json')).rejects.toThrow(/not valid JSON/);
  });

  it('keeps the path on the error, so a caller can say which file', async () => {
    respondWith('', { status: 500 });
    await expect(fetchDataset('data/named.json')).rejects.toMatchObject({
      name: 'DatasetUnavailableError',
      path: 'data/named.json',
    });
  });
});

describe('measure', () => {
  it('returns the value and how long it took', () => {
    const { value, ms } = measure(() => 6 * 7);
    expect(value).toBe(42);
    expect(ms).toBeGreaterThanOrEqual(0);
  });

  it('lets a failure through', () => {
    expect(() =>
      measure(() => {
        throw new Error('inner');
      }),
    ).toThrow('inner');
  });
});

describe('loadDataset', () => {
  /** A cache store that records what was deleted, standing in for the offline cache. */
  function stubCaches(): { readonly deleted: string[] } {
    const deleted: string[] = [];
    vi.stubGlobal('caches', {
      keys: () => Promise.resolve(['bible-cross-references-data-v1']),
      open: () =>
        Promise.resolve({
          delete: (url: string) => {
            deleted.push(url);
            return Promise.resolve(true);
          },
        }),
    });
    return { deleted };
  }

  it('returns the parsed value and the time spent on it', async () => {
    respondWith('{"n":1}');
    const { value, report } = await loadDataset('data/thing.json', (json) => json);
    expect(value).toEqual({ n: 1 });
    expect(report.processMs).toBeGreaterThanOrEqual(0);
  });

  it('drops a cached file this release cannot read, and reads the one it fetches instead', async () => {
    // The shape of a deployment: the offline cache still holds the previous release's file, and
    // the network has the new one. Without the retry this is a broken load for every reader who
    // has the app installed.
    const { deleted } = stubCaches();
    const bodies = ['{"old":true}', '{"new":true}'];
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(bodies.shift() ?? '{}', { status: 200 }))),
    );

    const { value } = await loadDataset('data/thing.json', (json) => {
      if (!(typeof json === 'object' && json !== null && 'new' in json)) {
        throw new Error('this release needs the new shape');
      }
      return json;
    });

    expect(value).toEqual({ new: true });
    expect(deleted).toEqual([`${import.meta.env.BASE_URL}data/thing.json`]);
  });

  it('gives up when the fetched file is wrong too, rather than looping', async () => {
    stubCaches();
    respondWith('{"old":true}');
    await expect(
      loadDataset('data/thing.json', () => {
        throw new Error('still unreadable');
      }),
    ).rejects.toThrow('still unreadable');
  });

  it('does not retry a download that failed, which would only fail again', async () => {
    stubCaches();
    const fetchMock = vi.fn(() => Promise.resolve(new Response('', { status: 404 })));
    vi.stubGlobal('fetch', fetchMock);
    await expect(loadDataset('data/thing.json', (json) => json)).rejects.toBeInstanceOf(
      DatasetUnavailableError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('still retries where the cache cannot be reached at all', async () => {
    // Private browsing, or a browser with storage disabled: there is nothing to evict, and the
    // refetch has to happen anyway.
    vi.stubGlobal('caches', {
      keys: () => Promise.reject(new Error('storage is disabled')),
      open: () => Promise.reject(new Error('storage is disabled')),
    });
    const bodies = ['{"old":true}', '{"new":true}'];
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(bodies.shift() ?? '{}', { status: 200 }))),
    );
    const { value } = await loadDataset('data/thing.json', (json) => {
      if (!(typeof json === 'object' && json !== null && 'new' in json)) {
        throw new Error('needs the new shape');
      }
      return json;
    });
    expect(value).toEqual({ new: true });
  });
});
