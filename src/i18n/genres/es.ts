import type { GenreId } from '../../core/bible/genres.ts';

/** The ten genres in Spanish. */
export const esGenres: Readonly<Record<GenreId, string>> = {
  law: 'Ley',
  history: 'Libros históricos',
  poetry: 'Poesía y sabiduría',
  'major-prophets': 'Profetas mayores',
  'minor-prophets': 'Profetas menores',
  gospels: 'Evangelios',
  acts: 'Hechos',
  'pauline-epistles': 'Epístolas paulinas',
  'general-epistles': 'Epístolas generales',
  revelation: 'Apocalipsis',
};
