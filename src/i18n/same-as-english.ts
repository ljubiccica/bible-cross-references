import type { LocaleId } from './locale-id.ts';

/**
 * The few things a language says exactly as English says them, with the reason for each.
 *
 * `completeness.ts` treats a value left identical to English as untranslated, because that is
 * nearly always what it is: a stub nobody came back to. A handful of words really are the same
 * in both languages, so each one is written down here with why — an entry a reviewer cannot
 * explain is a bug, not an exemption.
 *
 * Keys are `<where>.<key>`, as the problems report them.
 */
export const SAME_AS_ENGLISH: Readonly<Record<LocaleId, Readonly<Record<string, string>>>> = {
  // English is not compared against itself.
  en: {},
  pt: {
    'messages.footer.sourceLabel': 'GitHub is a proper noun and is not translated.',
    'messages.menu.filters.votes.atLeast':
      'A mathematical symbol and a number (“≥ 4”), which read the same in both languages.',
    'install.ios.label': 'iPhone is a product name and is not translated.',
    'install.android.label': 'Android is a product name and is not translated.',
    'books.Dan.name': 'Daniel is spelled identically in Portuguese.',
    'books.Joel.name': 'Joel is spelled identically in Portuguese.',
    'books.1Sam.name': '1 Samuel is spelled identically in Portuguese.',
    'books.2Sam.name': '2 Samuel is spelled identically in Portuguese.',
  },
};
