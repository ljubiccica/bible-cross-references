import { GENRES, type GenreId } from '../../core/bible/genres.ts';

/** The genres in English, taken from the canon rather than written out again. */
export const enGenres: Readonly<Record<GenreId, string>> = Object.fromEntries(
  GENRES.map((genre) => [genre.id, genre.name]),
) as Readonly<Record<GenreId, string>>;
