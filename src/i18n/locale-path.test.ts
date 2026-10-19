import { describe, expect, it } from 'vitest';
import { localeFromPath, localePathSegment, splitLocalePath } from './locale-path.ts';

const BASE = '/bible-cross-references/';

describe('localePathSegment', () => {
  it('gives the default language no segment of its own', () => {
    expect(localePathSegment('en')).toBe('');
  });

  it('gives every other language one', () => {
    expect(localePathSegment('pt')).toBe('pt/');
  });
});

describe('splitLocalePath', () => {
  it.each([
    ['/bible-cross-references/', null, ''],
    ['/bible-cross-references/threads/', null, 'threads/'],
    ['/bible-cross-references/pt/', 'pt', ''],
    ['/bible-cross-references/pt', 'pt', ''],
    ['/bible-cross-references/pt/threads/', 'pt', 'threads/'],
    ['/bible-cross-references/pt/index.html', 'pt', 'index.html'],
    // `/en/` is not a language path: English is served from the bare base and no such file is
    // written, so this is just an unknown path.
    ['/bible-cross-references/en/', null, 'en/'],
    // A language the app does not have.
    ['/bible-cross-references/fr/', null, 'fr/'],
    // Outside the base entirely, e.g. another deployment.
    ['/somewhere-else/pt/', null, ''],
  ])('%s', (pathname, locale, rest) => {
    expect(splitLocalePath(pathname, BASE)).toEqual({ locale, rest });
  });

  it('is not fooled by a path that merely starts with the letters of a language', () => {
    expect(splitLocalePath('/bible-cross-references/ptolemy/', BASE)).toEqual({
      locale: null,
      rest: 'ptolemy/',
    });
  });
});

describe('localeFromPath', () => {
  it('names the language a path is in', () => {
    expect(localeFromPath('/bible-cross-references/pt/', BASE)).toBe('pt');
    expect(localeFromPath('/bible-cross-references/pt/threads/', BASE)).toBe('pt');
  });

  it('is null where the path names none', () => {
    expect(localeFromPath('/bible-cross-references/', BASE)).toBeNull();
    expect(localeFromPath('/bible-cross-references/threads/', BASE)).toBeNull();
    expect(localeFromPath('/elsewhere/', BASE)).toBeNull();
  });
});
