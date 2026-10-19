import { expect, test, type Page } from '@playwright/test';
import { ACTIVE, PANEL, collectErrors, openPanel, waitForApp } from './helpers.ts';
import { LOCALE_IDS } from '../../src/i18n/locale-id.ts';

/** Every width the layout has to survive, from the oldest phone to a wide desktop. */
const WIDTHS = [320, 360, 375, 390, 412, 430, 768, 834, 1024, 1280, 1440, 1920];

test.describe('the layout holds at every width', () => {
  test.beforeEach(() => {
    // The phone project does not run this file at all (see playwright.config.ts): these tests
    // set the viewport themselves, so a second project would only repeat them.
    test.skip(test.info().project.name !== 'desktop', 'Widths are driven directly here.');
  });

  for (const width of WIDTHS) {
    test(`${String(width)}px: the footer is one line and nothing runs off the edge`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('./');
      await waitForApp(page);

      const measured = await page.locator(`${ACTIVE} footer`).evaluate((footer) => {
        const rect = footer.getBoundingClientRect();
        const [owner, credits] = [...footer.children].map((child) => child.getBoundingClientRect());
        return {
          height: Math.round(rect.height),
          right: Math.round(rect.right),
          ownerTop: Math.round(owner?.top ?? 0),
          creditsTop: Math.round(credits?.top ?? owner?.top ?? 0),
          creditsRight: Math.round(credits?.right ?? owner?.right ?? 0),
        };
      });

      // One line, two ways: the two halves share a top, and the whole thing is one row tall.
      expect(Math.abs(measured.creditsTop - measured.ownerTop)).toBeLessThan(4);
      expect(measured.height).toBeLessThan(34);
      // Nothing runs past the right edge — and the credit in particular, which is a licence
      // condition, has to be readable rather than clipped.
      expect(measured.right).toBeLessThanOrEqual(width);
      expect(measured.creditsRight).toBeLessThanOrEqual(width);
    });
  }

  /**
   * Every width, in every language the app speaks.
   *
   * English is held to one line, above: it is the language the layout is designed around and the
   * one most readers see. A translation cannot be held to that — Portuguese runs about a fifth
   * longer, and the clause that pushes it over is the CC BY credit, which is a licence condition
   * and not something to drop on a narrow screen. So the promise here is weaker and still worth
   * keeping: never more than two lines, and never off the edge.
   *
   * One test per language, resizing between measurements, rather than one per width reloading
   * the app in each language. The app was loaded 72 times that way, and when the sixth language
   * arrived the tests stopped fitting in their timeout and the suite went red on the clock
   * rather than on the layout. Nothing is lost by resizing: these are CSS media queries, and a
   * reflow is exactly what a reader turning their phone gets.
   */
  for (const language of LOCALE_IDS) {
    test(`${language}: the footer fits at every width`, async ({ page }) => {
      await page.goto(`./?lang=${language}`);
      await waitForApp(page);
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 800 });
        await expectFooterFits(page, width, language);
      }
    });
  }

  async function expectFooterFits(page: Page, width: number, language: string): Promise<void> {
    const measured = await page.locator(`${ACTIVE} footer`).evaluate((footer) => {
      const rect = footer.getBoundingClientRect();
      const children = [...footer.children].map((child) => child.getBoundingClientRect());
      return {
        height: Math.round(rect.height),
        right: Math.round(rect.right),
        rows: new Set(children.map((child) => Math.round(child.top))).size,
        widest: Math.round(Math.max(...children.map((child) => child.right))),
      };
    });

    const where = `${language} at ${String(width)}px`;
    expect(measured.rows, where).toBeLessThanOrEqual(2);
    // Two lines of the same 24px row, with a little room for the gap between them.
    expect(measured.height, where).toBeLessThan(64);
    expect(measured.right, where).toBeLessThanOrEqual(width);
    expect(measured.widest, where).toBeLessThanOrEqual(width);
  }

  /**
   * The details panel, in every language, at every width.
   *
   * The band at the top of each section bleeds past the panel's padding on purpose, so it is
   * wider than its own parent. That is fine until a grid item refuses to shrink below it: then
   * the track grows, and the whole panel scrolls sideways with the counts pushed off the right
   * edge. A longer language is what makes it visible, which is why this runs in all of them.
   */
  for (const language of LOCALE_IDS) {
    test(`${language}: the panel does not scroll sideways at any width`, async ({ page }) => {
      await page.goto(`./?lang=${language}&ref=2Cor.11`);
      await waitForApp(page);
      await openPanel(page);

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 800 });

        const measured = await page.locator(`${ACTIVE} aside`).evaluate((aside) => {
          const scroller = aside.querySelector('[class*="scroll"]') ?? aside;
          const bands = [...aside.querySelectorAll('h3 button')];
          const right = scroller.getBoundingClientRect().right;
          return {
            overflow: scroller.scrollWidth - scroller.clientWidth,
            // Every count has to stay on screen: it is the one thing a returning reader is
            // looking for, and it sits at the end of the row.
            countsOffscreen: bands.filter((band) => {
              const count = band.querySelector('[class*="count"]');
              return count !== null && count.getBoundingClientRect().right > right + 1;
            }).length,
          };
        });

        expect(measured.overflow, `${language} at ${String(width)}px scrolls sideways`).toBe(0);
        expect(
          measured.countsOffscreen,
          `${language} at ${String(width)}px pushes a count off the edge`,
        ).toBe(0);
      }
    });
  }

  /**
   * The line is set in whatever UI font the reader's system has, and the narrowest and widest of
   * those differ by roughly a tenth: a layout that fits exactly on the machine that drew it can
   * wrap on somebody's phone, which is how a two-line footer at 320px once reached CI.
   *
   * A tenth is the whole budget, not a safety factor on top of one. Asking for more would mean
   * something different on every machine — on a narrow-font system it reads as "survive a wide
   * font", but on a system that already has the widest font it reads as "survive a font that
   * does not exist", which is a test no honest layout can pass.
   */
  for (const width of [320, 360, 375]) {
    test(`${String(width)}px: the footer still holds with a tenth wider font`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('./');
      await waitForApp(page);
      const rows = await page.locator(`${ACTIVE} footer`).evaluate((footer) => {
        const element = footer as HTMLElement;
        const base = Number.parseFloat(getComputedStyle(element).fontSize);
        element.style.fontSize = `${String(base * 1.1)}px`;
        const tops = [...footer.children].map((child) =>
          Math.round(child.getBoundingClientRect().top),
        );
        element.style.fontSize = '';
        return new Set(tops).size;
      });
      expect(rows).toBe(1);
    });
  }

  test('the details panel is a side column on a desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('./?ref=John.3.16');
    await waitForApp(page);
    const box = await page.locator(PANEL).boundingBox();
    expect(box?.x).toBeGreaterThan(700);
    expect(box?.height).toBeGreaterThan(500);
  });

  test('the details panel is a sheet at the bottom on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./?ref=John.3.16');
    await waitForApp(page);
    const box = await page.locator(PANEL).boundingBox();
    expect(Math.round(box?.x ?? -1)).toBe(0);
    expect(Math.round(box?.width ?? 0)).toBe(390);
    // It starts part-way up, leaving the visualization in view above it.
    expect(box?.y).toBeGreaterThan(200);
  });

  test('the sheet opens to full height when its handle is used', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./?ref=John.3.16');
    await waitForApp(page);
    const before = await page.locator(PANEL).boundingBox();
    await page
      .locator(PANEL)
      .getByRole('button', { name: /Expand details/ })
      .click();
    await expect
      .poll(async () => Math.round((await page.locator(PANEL).boundingBox())?.y ?? 0))
      .toBeLessThan(Math.round(before?.y ?? 0));
  });

  /**
   * The band between a phone and a wide desktop, in every language the app offers.
   *
   * `VizPage.module.css` and `controls.module.css` each carry a rule keyed on the literal
   * language — the only two in the app — because the header's width depends on how long the
   * words are, and a language whose name for the site runs twenty characters against English's
   * sixteen needs the masthead on a row of its own. Nothing else can enforce that, so the
   * promise is made here instead: whatever the language, the header's contents stay inside the
   * window and the controls stay on screen. A fourth language that is not added to those rules
   * fails this rather than shipping a cramped header nobody happens to open at this width.
   */
  for (const language of LOCALE_IDS) {
    test(`${language}: the header fits between a small laptop and a wide one`, async ({ page }) => {
      await page.goto(`./?lang=${language}`);
      await waitForApp(page);

      for (const width of [1024, 1280, 1366]) {
        await page.setViewportSize({ width, height: 800 });

        const header = page.locator(`${ACTIVE} header`).first();
        const measured = await header.evaluate((element) => {
          const parts = [...element.querySelectorAll('*')].filter(
            (child) => child.childElementCount === 0 && child.getBoundingClientRect().width > 0,
          );
          return {
            right: Math.round(element.getBoundingClientRect().right),
            widest: Math.round(
              Math.max(...parts.map((part) => part.getBoundingClientRect().right)),
            ),
            bottom: Math.round(element.getBoundingClientRect().bottom),
          };
        });

        const where = `${language} at ${String(width)}px`;
        expect(measured.right, `${where}: header`).toBeLessThanOrEqual(width);
        expect(measured.widest, `${where}: header contents`).toBeLessThanOrEqual(width);
        // Three rows of controls would mean the masthead rule is not applying: the header is
        // meant to settle at one row, or two once the masthead takes its own.
        expect(measured.bottom, `${where}: header height`).toBeLessThan(140);
        // Both menus still on screen. Found by their shape — a header button that opens a
        // popover — rather than by their names: a regex of every language's word for "Filters"
        // had already fallen behind by three languages, and a name that matches nothing makes
        // this assertion fail for a reason that has nothing to do with the layout.
        const menus = page.locator(`${ACTIVE} header button[aria-expanded]`);
        await expect(menus, `${where}: both menus`).toHaveCount(2);
        await expect(menus.first(), where).toBeVisible();
        await expect(menus.last(), where).toBeVisible();
      }
    });
  }

  test('the header keeps its controls reachable on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./');
    await waitForApp(page);
    for (const control of [/Filters/, /Translation/]) {
      await expect(page.locator(ACTIVE).getByRole('button', { name: control })).toBeVisible();
    }
    await expect(page.locator(ACTIVE).getByRole('searchbox')).toBeVisible();
  });
});

test.describe('every page loads cleanly', () => {
  for (const [name, path, ready] of [
    ['the arcs', './', `${ACTIVE} footer`],
    ['the reading threads', './threads/', `${ACTIVE} footer`],
    ['the debug page', './debug/', 'table'],
  ] as const) {
    test(`${name} renders with no errors in the console`, async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(path);
      await page.locator(ready).first().waitFor({ timeout: 45_000 });
      expect(errors).toEqual([]);
    });
  }
});

/**
 * The corner summary over the canvas, in every language, at every width — on a desktop and on
 * a phone, because the two do not show the same words.
 *
 * Its own block, outside the one above, so that the phone project runs it too. `.touchHint` and
 * `.pointerHint` swap on `(hover: none) and (pointer: coarse)`, which is a property of the
 * browser context and not of the viewport: resizing a desktop page to 412px still shows the
 * mouse wording. The hint that overflowed — "gedrückt halten für die Vorschau · zum Auswählen ·
 * zum Zoomen" — is the touch one, so a check that only ever ran on the desktop project could
 * not see it however narrow it made the window. Measured in both, it is seen in the one where
 * it happens.
 *
 * Measured rather than looked at, too. The shots that contain this also contain the arcs, which
 * a software renderer draws differently run to run, so they carry a 2% pixel budget — about
 * 7,500 pixels on a phone. A line of text running off the right edge in three languages cost
 * fewer than that, so the snapshots compared equal while the app was visibly wrong, and the
 * images on disk went on showing a layout that no longer existed. A number has no tolerance.
 */
test.describe('the stats in the corner', () => {
  for (const language of LOCALE_IDS) {
    test(`${language}: stay inside the window at every width`, async ({ page }) => {
      await page.goto(`./?lang=${language}`);
      await waitForApp(page);

      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 800 });

        const measured = await page
          .locator(`${ACTIVE} [class*="stats"]`)
          .first()
          .evaluate((stats) => ({
            width: window.innerWidth,
            // Two signals, because one of them alone missed this. A line that does not wrap paints
            // past its own box without the box growing, so the *container's* own rect stays inside
            // the window and only its scrollable width gives it away; and the rows themselves are
            // spans holding other elements, so measuring leaf nodes — which was the first attempt —
            // measures the bits that sit safely inside and never the row that sticks out.
            overflow: stats.scrollWidth - stats.clientWidth,
            widest: Math.round(
              Math.max(
                stats.getBoundingClientRect().right,
                ...[...stats.children]
                  .filter((row) => row.getBoundingClientRect().width > 0)
                  .map((row) => row.getBoundingClientRect().right),
              ),
            ),
          }));
        const where = `${language} at ${String(width)}px`;
        expect(measured.overflow, `${where}: the stats scroll sideways`).toBe(0);
        expect(measured.widest, `${where}: a row of the stats`).toBeLessThanOrEqual(width);
      }
    });
  }
});
