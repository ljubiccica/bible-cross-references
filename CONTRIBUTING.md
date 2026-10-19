# Contributing

Thank you for looking. This is a small, deliberately plain project: a static site with no runtime
dependencies beyond React and Three.js, and data built from pinned upstream sources.

## What a pull request has to pass

Both of these run in CI on every pull request, and both have to be green before anything can be
merged or deployed.

```sh
npm run check      # types, lint, formatting, unit tests, coverage thresholds
npm run test:e2e   # the reader's flows, in a real browser against the built site
```

`npm run check` is the same command CI runs, so if it passes locally it passes there. It fails on:

- a TypeScript error (the config is strict, including `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`; there is no `any` and no `!`, and `as` appears only where
  `Object.fromEntries` loses a key type — `npm run typecoverage` holds the line);
- an ESLint error (type-aware rules, so a floating promise or an unsafe value fails the build);
- a file Prettier would reformat — run `npm run format`;
- a failing unit test;
- **coverage below 98%** of statements, lines and functions.

That last one means new code needs tests in the same pull request. If a change genuinely cannot
be unit-tested — GPU drawing, touch gestures, a page entry point — cover it in `tests/e2e/`
instead and say so in the pull request; the exclusion list in `vite.config.ts` explains the three
categories that are already treated this way.

The end-to-end suite needs the browser once: `npx playwright install --with-deps chromium`.

## Conventions

- **Comments explain why, never what.** The code says what it does; a comment is for the reason,
  the constraint or the thing that would otherwise look like a mistake.
- **Tests read as sentences about behaviour**, not about implementation: `it('opens the first
verse of a chapter given without one')`, not `it('calls indexOf')`.
- **Visualizations never import each other.** `src/app/views.ts` lists them and the app connects
  them; a repository test enforces it.
- **Data is pinned.** Upstream files are fetched against a SHA-256 in `data/sources.json` and the
  build refuses a file that does not match. Changing a source means re-pinning deliberately, with
  `npm run data:fetch -- --update`, and saying in the pull request what changed upstream.

## Translations

Two different jobs, and they are independent:

- **A language for the interface** — `src/i18n/`. Add the tag to `LOCALE_IDS` and the compiler
  names every property that needs a value: an entry in `registry.ts`, and four new files under
  `books/`, `genres/`, `install/` and `messages/`. The first three are complete or they do not
  compile — all 66 books, all 10 genres, all three install platforms.

  Messages are the exception: the type is `Partial`, so a missing one falls back to English and
  the compiler says nothing. A test does, though, and it **fails** rather than reporting — a
  language the app offers should not be half in another one. To land a translation in stages,
  put the tag in `WORK_IN_PROGRESS` in `src/i18n/i18n.test.ts` and take it out when the
  catalogue is complete.

  Four more things the compiler cannot ask for: a wrap threshold in
  `VizPage.module.css` and `controls.module.css` if the language runs longer than English (the
  two must agree), a case in `tests/e2e/languages.spec.ts`, and the language's row in this file
  and in the README.

- **A Bible text** — a pinned source, a manifest and an importer entry. The one hard requirement
  is verse numbering: the app indexes every verse by its position in the KJV's 31,102, so a
  translation that numbers verses differently needs a mapping before it can be added. The
  importer refuses a file that does not line up rather than silently showing the wrong verse, so
  this fails loudly at build time, not quietly in front of a reader.

A new language should come with its layout checked, not only its words: translated text is often
longer than English, and the header and footer are tight at 320px. `npm run test:e2e` walks twelve
widths and insists the footer stays on one line with a font a tenth wider than the one it is
measured on.

## Data and licences

The datasets are built from CC BY sources (OpenBible.info and STEP Bible / Tyndale House under
CC BY 4.0, Bíblia Livre under CC BY 3.0 BR) and public-domain texts. Every dataset carries its own
licence and attribution fields, because each is served on its own and kept on readers' devices by
the offline cache; the app shows them in the footer, in the translation picker and beside the
words. A credit under a licence names that licence, with a link to it, wherever the text is
shown — a public-domain one may give way on a narrow screen, a licensed one may not. If you add a source, it has to carry the same, and
columns whose licence does not permit redistribution must not be read — `scripts/data/importers/`
has a worked example, with a test that guards it.

See the [README](README.md#development) for the project layout and how the data pipeline works.
