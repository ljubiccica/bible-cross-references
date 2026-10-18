import type { en } from './en.ts';

/**
 * A message with something to emphasise, as alternating plain and strong pieces. The numbers in
 * the summary line carry the meaning and the words around them are context, so the numbers are
 * set apart — but which words and in what order is the translation's business, not the
 * component's, so the message returns the pieces rather than a sentence to be cut up.
 */
export type Emphasized = readonly (string | { readonly strong: string })[];

/**
 * English is written `as const`, which makes every value its own literal type — useful for
 * keeping the keys honest, useless for another language, which would then be allowed to say only
 * the English words. This widens a plain string back to `string` while leaving a function's
 * signature exactly as it is, so a translator is free in the words and checked in the arguments.
 */
type Translatable<T> = T extends (...args: infer Args) => infer Result
  ? (...args: Args) => Result
  : string;

/**
 * The shape every locale is measured against. A locale may leave a key out — the English word is
 * used instead, so a half-finished translation still ships something useful — but a key it does
 * give has to exist and have the right shape.
 */
export type Messages = { readonly [K in keyof typeof en]: Translatable<(typeof en)[K]> };
export type MessageKey = keyof Messages;
export type LocaleMessages = Partial<Messages>;
