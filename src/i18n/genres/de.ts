import type { GenreId } from '../../core/bible/genres.ts';

/** The ten genres in German. */
export const deGenres: Readonly<Record<GenreId, string>> = {
  law: 'Gesetz',
  history: 'Geschichtsbücher',
  poetry: 'Poesie und Weisheit',
  'major-prophets': 'Große Propheten',
  'minor-prophets': 'Kleine Propheten',
  gospels: 'Evangelien',
  acts: 'Apostelgeschichte',
  'pauline-epistles': 'Paulusbriefe',
  'general-epistles': 'Katholische Briefe',
  revelation: 'Offenbarung',
};
