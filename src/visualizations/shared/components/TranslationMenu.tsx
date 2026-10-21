import { useId } from 'react';
import type { TranslationId } from '../../../core/datasets/ids.ts';
import { isLocaleId, type LocaleId } from '../../../i18n/locale-id.ts';
import { LOCALE_LIST } from '../../../i18n/registry.ts';
import { useLocalization } from '../../../i18n/use-locale.tsx';
import { TRANSLATION_MANIFESTS } from '../../../translations/registry.ts';
import type { TranslationManifest } from '../../../translations/translation-manifest.ts';
import styles from './controls.module.css';
import { MenuButton } from './MenuButton.tsx';

interface TranslationMenuProps {
  readonly current: TranslationManifest;
  readonly onChange: (id: TranslationId) => void;
  /** True while the chosen text is still downloading. */
  readonly pending?: boolean;
  /** Why the last choice did not take effect, if it did not. */
  readonly error?: string | null;
  /** The interface language, chosen in the same menu rather than a sixth header button. */
  readonly localeId: LocaleId;
  readonly onLocaleChange: (id: LocaleId) => void;
}

/**
 * A language's own name for itself, which is what its readers recognise. Built once per
 * language and kept: `Intl.DisplayNames` is expensive to construct, and this runs once per
 * group heading and once per radio every time the menu opens.
 */
const endonyms = new Map<string, string>();

function endonymOf(language: string): string {
  const existing = endonyms.get(language);
  if (existing !== undefined) {
    return existing;
  }
  const base = language.toLowerCase().split('-')[0] ?? language;
  const name = new Intl.DisplayNames([language], { type: 'language' }).of(base) ?? base;
  const endonym = name.charAt(0).toLocaleUpperCase(language) + name.slice(1);
  endonyms.set(language, endonym);
  return endonym;
}

/**
 * The translations grouped under their language: the interface's own language first, then any
 * language the reader's browser asks for, then the rest in the order the registry lists them.
 *
 * The middle rank is what makes a Bible findable in a language the interface does not speak. A
 * reader whose browser is German gets English menus, because there are none in German — and
 * without this their Bible sits third, behind two languages they never asked for, under a button
 * that says only "BSB". A reader who asks for nothing but the interface's own language sees no
 * change at all; one who asks for a second (`en-US, es-MX`, common enough in the United States)
 * finds that second language lifted too, which is the point rather than a side effect.
 */
export function groupByLanguage(
  preferred: string,
  accepted: readonly string[] | null | undefined = [],
): readonly { readonly language: string; readonly items: readonly TranslationManifest[] }[] {
  const baseOf = (tag: string) => tag.toLowerCase().split('-')[0] ?? tag;
  const groups = new Map<string, TranslationManifest[]>();
  for (const translation of TRANSLATION_MANIFESTS) {
    const base = baseOf(translation.language);
    const existing = groups.get(base);
    if (existing) {
      existing.push(translation);
    } else {
      groups.set(base, [translation]);
    }
  }
  const base = baseOf(preferred);
  const asked = new Set((accepted ?? []).map(baseOf));
  return [...groups.entries()]
    .map(([language, items]) => ({ language, items }))
    .sort((a, b) => {
      // Sorting is stable, so everything inside a rank keeps the registry's order.
      const rank = (language: string) => (language === base ? 0 : asked.has(language) ? 1 : 2);
      return rank(a.language) - rank(b.language);
    });
}

/**
 * Chooses the translation the verses are shown in, and the language the app speaks.
 *
 * Both live behind one button because the header has no room for a sixth, and because the
 * common case needs neither: a reader whose browser asks for Portuguese arrives with a
 * Portuguese interface and a Portuguese Bible already chosen. They are separate settings all the
 * same — a Turkish reader may want Turkish words around an English text, and someone comparing
 * translations should not have the interface change language under them.
 *
 * The button wears the abbreviation rather than the word "Translation": it is shorter, it is
 * what a reader looks for, and it says at a glance which text is on screen.
 */
export function TranslationMenu({
  current,
  onChange,
  pending = false,
  error = null,
  localeId,
  onLocaleChange,
}: TranslationMenuProps) {
  const { t, locale } = useLocalization();
  // Both visualizations stay mounted, so each one's radios need a group name of their own.
  const group = useId();
  const languageId = useId();
  // Passed rather than read inside, so the ranking can be tested without a browser. Some
  // embedded browsers leave `navigator.languages` empty, undefined or null whatever the DOM
  // types promise, and `groupByLanguage` takes all three: the cost is the ordering, not a menu
  // that throws while rendering.
  const groups = groupByLanguage(locale.tag, navigator.languages);

  return (
    <MenuButton label={t('menu.translation')} value={current.abbreviation} busy={pending}>
      <div className={styles.field} role="radiogroup" aria-label={t('menu.translation')}>
        {groups.map(({ language, items }) => (
          <div key={language} className={styles.group} lang={language}>
            {groups.length > 1 && <p className={styles.groupLabel}>{endonymOf(language)}</p>}
            {items.map((translation) => (
              <label key={translation.id} className={styles.choice}>
                <input
                  type="radio"
                  name={group}
                  value={translation.id}
                  checked={translation.id === current.id}
                  // The group heading is not part of a radio's accessible name, so each one
                  // carries its language, and the abbreviation the header button wears:
                  // "Bíblia Livre (BLIVRE), Português".
                  aria-label={`${translation.name} (${translation.abbreviation}), ${endonymOf(language)}`}
                  onChange={() => {
                    onChange(translation.id);
                  }}
                />
                {translation.name}
                <span className={styles.choiceAbbreviation}>{translation.abbreviation}</span>
              </label>
            ))}
          </div>
        ))}
      </div>
      {error !== null && (
        <p role="alert" className={styles.menuError}>
          {t('menu.translation.error')(error)}
        </p>
      )}
      {LOCALE_LIST.length > 1 && (
        <label className={styles.languageRow} htmlFor={languageId}>
          {t('menu.language')}
          <select
            id={languageId}
            className={styles.select}
            value={localeId}
            onChange={(event) => {
              // Every option comes from `LOCALE_LIST`, so this only ever rejects a value some
              // extension or autofill put there — but a `select` is still the page talking.
              if (isLocaleId(event.target.value)) {
                onLocaleChange(event.target.value);
              }
            }}
          >
            {LOCALE_LIST.map((option) => (
              <option key={option.id} value={option.id}>
                {option.endonym}
              </option>
            ))}
          </select>
        </label>
      )}
      {/* The credit last: it is the longest thing here and the least often read, and a setting
          should not sit underneath a paragraph somebody has to scroll past to find it. The
          licence has to travel with every copy of the text, and on a phone this menu is where a
          reader finds it — the footer has room for the credit but not for the link. */}
      <p className={styles.hint}>
        {t(`attribution.${current.id}`)}{' '}
        <a href={current.license.url} target="_blank" rel="noreferrer">
          {current.license.publicDomain === true ? t('license.publicDomain') : current.license.name}
        </a>
      </p>
    </MenuButton>
  );
}
