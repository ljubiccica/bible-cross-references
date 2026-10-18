import { useId, useState, type SubmitEvent } from 'react';
import { passageFromReference, type Passage } from '../../../core/bible/passage.ts';
import { parseReference } from '../../../core/bible/reference-parse.ts';
import type { Versification } from '../../../core/bible/versification.ts';
import { describeReferenceError } from '../../../i18n/describe-reference-error.ts';
import { useLocalization } from '../../../i18n/use-locale.tsx';
import { SearchIcon } from '../../../shared/ui/icons.tsx';
import styles from './controls.module.css';

interface ReferenceSearchProps {
  readonly versification: Versification;
  readonly onSelect: (passage: Passage) => void;
}

/** "Go to" box: accepts references such as `John 3:16`, `jn 3 16`, `Ps 23` or `Gen.1.1`. */
export function ReferenceSearch({ versification, onSelect }: ReferenceSearchProps) {
  const localization = useLocalization();
  const { t, books } = localization;
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const input = new FormData(form).get('reference');
    const result = parseReference(typeof input === 'string' ? input : '', versification, books);
    if (!result.ok) {
      setError(describeReferenceError(result.error, localization));
      return;
    }
    setError(null);
    form.reset();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur(); // Closes the on-screen keyboard on phones.
    }
    onSelect(passageFromReference(result.reference, versification));
  };

  return (
    <form role="search" className={styles.search} onSubmit={handleSubmit}>
      <SearchIcon className={styles.searchIcon} />
      <input
        name="reference"
        type="search"
        className={styles.input}
        placeholder={t('search.placeholder')}
        aria-label={t('search.label')}
        aria-invalid={error !== null}
        aria-describedby={error === null ? undefined : errorId}
        autoComplete="off"
        // The longest real reference is ~25 characters; this only bounds what a paste can hand
        // the parser, whose book pattern is quadratic in the length of what it is given.
        maxLength={120}
        enterKeyHint="go"
        onChange={() => {
          setError(null);
        }}
      />
      {error !== null && (
        <p id={errorId} role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </form>
  );
}
