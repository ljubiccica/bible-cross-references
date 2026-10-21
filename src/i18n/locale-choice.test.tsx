import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { describeReferenceError } from './describe-reference-error.ts';
import {
  initialPreferredLocale,
  initialLocaleId,
  localeFromParams,
  readPreferredLocale,
  useLocalePreference,
  usePreferredLocale,
  setActiveLocale,
  setPreferredLocale,
} from './locale-choice.ts';
import { localizationFor, useLocalization } from './use-locale.tsx';

/** The app runs in a browser; this gives it just enough of one to store a preference. */
function withStoredLocale(value: string | null): void {
  const store = new Map(value === null ? [] : [['bible-cross-references:locale', value]]);
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, next: string) => store.set(key, next),
    },
  });
}

const url = (search: string) => new URL(`https://example.org/${search}`);

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage');
});

describe('localeFromParams', () => {
  it('reads the language a link names', () => {
    expect(localeFromParams(url('?lang=pt').searchParams)).toBe('pt');
  });

  it('ignores a language the app does not have, and an absent one', () => {
    expect(localeFromParams(url('?lang=klingon').searchParams)).toBeNull();
    expect(localeFromParams(url('').searchParams)).toBeNull();
  });
});

describe('initialLocaleId', () => {
  it('prefers the address over everything else', () => {
    withStoredLocale('en');
    expect(initialLocaleId(url('?lang=pt'), ['en-US'])).toBe('pt');
  });

  it('falls back to the reader’s stored choice', () => {
    withStoredLocale('pt');
    expect(initialLocaleId(url(''), ['en-US'])).toBe('pt');
  });

  it('then to whatever their browser asks for', () => {
    withStoredLocale(null);
    expect(initialLocaleId(url(''), ['pt-BR', 'en'])).toBe('pt');
  });

  it('and finally to English', () => {
    withStoredLocale(null);
    expect(initialLocaleId(url(''), ['ja'])).toBe('en');
    expect(initialPreferredLocale(['ja'])).toBe('en');
  });

  it('ignores a stored value it no longer recognises', () => {
    withStoredLocale('nonesuch');
    expect(readPreferredLocale()).toBeNull();
  });

  it('does not record a language the reader only followed a link to', () => {
    withStoredLocale(null);
    setActiveLocale('pt');
    expect(readPreferredLocale()).toBeNull();
  });
});

describe('useLocalePreference', () => {
  function Choice() {
    const [locale, choose] = useLocalePreference();
    const { t } = useLocalization();
    return (
      <button
        type="button"
        onClick={() => {
          choose('pt');
        }}
      >
        {locale}: {t('panel.close')}
      </button>
    );
  }

  it('starts in English and follows a choice, words and all', async () => {
    withStoredLocale(null);
    setActiveLocale('en');
    render(<Choice />);
    expect(screen.getByRole('button').textContent).toBe('en: Close');
    await act(async () => {
      await userEvent.click(screen.getByRole('button'));
    });
    expect(screen.getByRole('button').textContent).toBe('pt: Fechar');
  });
});

describe('describeReferenceError', () => {
  const english = localizationFor('en');
  const portuguese = localizationFor('pt');

  it('says a reference could not be read, in either language', () => {
    expect(describeReferenceError({ kind: 'unreadable' }, english)).toContain('John 3:16');
    expect(describeReferenceError({ kind: 'unreadable' }, portuguese)).toContain('João 3:16');
  });

  it('names an unknown book back to the reader', () => {
    expect(describeReferenceError({ kind: 'unknown-book', query: 'Hezekiah' }, english)).toContain(
      'Hezekiah',
    );
  });

  it('lists the books an ambiguous query could mean, joined in the reader’s language', () => {
    const error = {
      kind: 'ambiguous-book',
      query: 'jo',
      candidates: ['Josh', 'Job', 'John'],
    } as const;
    expect(describeReferenceError(error, english)).toBe('“jo” could be Joshua, Job or John.');
    expect(describeReferenceError(error, portuguese)).toBe('“jo” pode ser Josué, Jó ou João.');
  });

  it('names a single candidate without a joining word', () => {
    const error = { kind: 'ambiguous-book', query: 'x', candidates: ['Job'] } as const;
    expect(describeReferenceError(error, english)).toBe('“x” could be Job.');
  });

  it('counts a book’s chapters and a chapter’s verses in the reader’s notation', () => {
    expect(
      describeReferenceError({ kind: 'no-such-chapter', book: 'Gen', chapters: 50 }, english),
    ).toBe('Genesis has 50 chapters.');
    expect(
      describeReferenceError(
        { kind: 'no-such-verse', book: 'Ps', chapter: 23, verses: 6 },
        portuguese,
      ),
    ).toBe('Salmo 23 tem 6 versículos.');
  });
});

describe('choosing versus following a link', () => {
  it('records a language the reader chose, so the next visit keeps it', async () => {
    withStoredLocale(null);
    setActiveLocale('en');
    function Choice() {
      const [, choose] = useLocalePreference();
      return (
        <button
          type="button"
          onClick={() => {
            choose('pt');
          }}
        >
          choose
        </button>
      );
    }
    render(<Choice />);
    await act(async () => {
      await userEvent.click(screen.getByRole('button'));
    });
    expect(readPreferredLocale()).toBe('pt');
  });
});

describe("the reader's own language, apart from the address", () => {
  afterEach(() => {
    setPreferredLocale('en');
    setActiveLocale('en');
  });

  it('is what a URL naming no language falls back to', () => {
    setPreferredLocale('pt');
    function Shown() {
      return <span>{usePreferredLocale()}</span>;
    }
    render(<Shown />);
    expect(screen.getByText('pt')).toBeDefined();
  });

  it('is not moved by the address, which is what makes Forward work', () => {
    // Going Back to a link that names Portuguese sets the *active* language. Going Forward again
    // lands on an entry naming none, and that entry has to mean the reader's own language — if
    // the address had moved this, it would mean "whatever the last address said" instead.
    setPreferredLocale('en');
    setActiveLocale('pt');
    function Shown() {
      return <span>{usePreferredLocale()}</span>;
    }
    render(<Shown />);
    expect(screen.getByText('en')).toBeDefined();
  });

  it('is moved by an explicit choice, which is the one thing that should move it', async () => {
    withStoredLocale(null);
    function Choice() {
      const [, choose] = useLocalePreference();
      return (
        <>
          <span data-testid="preferred">{usePreferredLocale()}</span>
          <button
            type="button"
            onClick={() => {
              choose('pt');
            }}
          >
            choose
          </button>
        </>
      );
    }
    render(<Choice />);
    expect(screen.getByTestId('preferred').textContent).toBe('en');
    await act(async () => {
      await userEvent.click(screen.getByRole('button'));
    });
    expect(screen.getByTestId('preferred').textContent).toBe('pt');
  });

  it('ignores a repeat of the language it already holds', () => {
    setPreferredLocale('pt');
    setPreferredLocale('pt');
    function Shown() {
      return <span>{usePreferredLocale()}</span>;
    }
    render(<Shown />);
    expect(screen.getByText('pt')).toBeDefined();
  });

  it('starts from the stored choice, over anything the browser asks for', () => {
    // The browser-and-default branches are covered where `initialLocaleId` is, above: they have
    // to run before any test writes a preference, because `preferences.ts` keeps what was
    // written in module memory and consults that ahead of storage.
    withStoredLocale('pt');
    expect(initialPreferredLocale(['en-US'])).toBe('pt');
  });
});
