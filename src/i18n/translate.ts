import { en } from './messages/en.ts';
import type { MessageKey, Messages } from './messages/types.ts';
import type { Locale } from './registry.ts';

/**
 * Reads one message in a locale, falling back to English for anything that locale has not
 * translated yet. The return type follows the key, so a plain message is a string and one that
 * takes arguments is the function that builds it:
 *
 *     message(locale, 'panel.close')               // 'Close'
 *     message(locale, 'stats.verses')('31,102')    // '31,102 verses'
 */
export function message<K extends MessageKey>(locale: Locale, key: K): Messages[K] {
  return locale.messages[key] ?? en[key];
}

/** A `message` already bound to one locale, which is what components are given. */
export type Translator = <K extends MessageKey>(key: K) => Messages[K];

export function createTranslator(locale: Locale): Translator {
  return (key) => message(locale, key);
}
