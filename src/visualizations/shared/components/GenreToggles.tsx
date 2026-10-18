import type { Testament } from '../../../core/bible/books.ts';
import { GENRES, type GenreId } from '../../../core/bible/genres.ts';
import { useLocalization } from '../../../i18n/use-locale.tsx';
import { GENRE_COLORS } from '../palette.ts';
import styles from './GenreLegend.module.css';

export interface GenreTogglesProps {
  readonly hiddenGenres: ReadonlySet<GenreId>;
  readonly onToggle: (genre: GenreId) => void;
}

const TESTAMENTS: readonly Testament[] = ['OT', 'NT'];

/** The genre color keys, grouped by testament; each also toggles its genre's links. */
export function GenreToggles({ hiddenGenres, onToggle }: GenreTogglesProps) {
  const { t, genreName } = useLocalization();
  return (
    <div className={styles.columns}>
      {TESTAMENTS.map((testament) => (
        <div key={testament} className={styles.testament}>
          <p className={styles.heading}>{t(`testament.${testament}`)}</p>
          {GENRES.filter((genre) => genre.testament === testament).map((genre) => (
            <button
              key={genre.id}
              type="button"
              className={styles.item}
              aria-pressed={!hiddenGenres.has(genre.id)}
              title={
                hiddenGenres.has(genre.id)
                  ? t('genres.showOne')(genreName(genre.id))
                  : t('genres.hideOne')(genreName(genre.id))
              }
              onClick={() => {
                onToggle(genre.id);
              }}
            >
              <span className={styles.key} style={{ background: GENRE_COLORS[genre.id] }} />
              {genreName(genre.id)}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Toggles a genre in an immutable set. */
export function toggleGenre(hidden: ReadonlySet<GenreId>, genre: GenreId): ReadonlySet<GenreId> {
  const next = new Set(hidden);
  if (!next.delete(genre)) {
    next.add(genre);
  }
  return next;
}
