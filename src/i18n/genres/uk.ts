import type { GenreId } from '../../core/bible/genres.ts';

/** The ten genres in Ukrainian. */
export const ukGenres: Readonly<Record<GenreId, string>> = {
  law: 'Закон',
  history: 'Історичні книги',
  poetry: 'Поезія і мудрість',
  'major-prophets': 'Великі пророки',
  'minor-prophets': 'Малі пророки',
  gospels: 'Євангелія',
  acts: 'Дії',
  'pauline-epistles': 'Послання Павла',
  'general-epistles': 'Соборні послання',
  revelation: 'Об’явлення',
};
