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
 * One width from each band the stylesheets actually distinguish, in every language.
 *
 * Not every width, and never by resizing. Two shapes were tried and neither survives a 60s
 * budget once the app speaks six languages: looping the languages inside a per-width test loads
 * the app six times, and looping the widths inside a per-language test resizes a live WebGL
 * canvas twelve times — which on CI's software renderer re-draws 344k arcs each time, stops
 * answering, and takes the page down with it (`waiting for locator('div[data-active="true"]
 * footer')`, then `Target page, context or browser has been closed`). One load at one size,
 * measured once, is the only shape that fits, so that is the shape.
 *
 * Six widths rather than twelve, chosen one per breakpoint band rather than by taste. The
 * stylesheets change behaviour at 22.49rem, 23.99rem, 47.99rem, 79.99rem and 85.99rem; these sit
 * inside the six bands those cut, so every rule is exercised and nothing is tested twice. The
 * full twelve still run in English above, where the promise is stricter.
 */
const BAND_WIDTHS = [320, 360, 390, 768, 1366, 1920];

test.describe('the chrome holds in every language', () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'desktop', 'Widths are driven directly here.');
  });

  for (const language of LOCALE_IDS) {
    for (const width of BAND_WIDTHS) {
      test(`${language} at ${String(width)}px: nothing runs off the edge`, async ({ page }) => {
        // The viewport first, then the page: the app renders once, at the size being measured.
        await page.setViewportSize({ width, height: 800 });
        await page.goto(`./?lang=${language}&ref=2Cor.11`);
        await waitForApp(page);
        await openPanel(page);

        const where = `${language} at ${String(width)}px`;
        await expectFooterFits(page, width, where);
        await expectStatsFit(page, width, where);
        await expectPanelDoesNotScroll(page, where);
        if (width >= 1024) {
          await expectHeaderFits(page, width, where);
        }
      });
    }
  }
});

/**
 * The footer, which carries the CC BY credit.
 *
 * English is held to one line further up; a translation cannot be, because the clause that
 * pushes it over is the licence condition itself and not something to drop on a narrow screen.
 * Two lines, and never off the edge.
 */
async function expectFooterFits(page: Page, width: number, where: string): Promise<void> {
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

  expect(measured.rows, `${where}: footer rows`).toBeLessThanOrEqual(2);
  // Two lines of the same 24px row, with a little room for the gap between them.
  expect(measured.height, `${where}: footer height`).toBeLessThan(64);
  expect(measured.right, `${where}: footer box`).toBeLessThanOrEqual(width);
  expect(measured.widest, `${where}: footer contents`).toBeLessThanOrEqual(width);
}

/**
 * The corner summary over the canvas.
 *
 * Two signals, because one alone missed this. A line that does not wrap paints past its own box
 * without the box growing, so the container's rect stays inside the window and only its
 * scrollable width gives it away; and the rows are spans holding other elements, so measuring
 * leaf nodes — the first attempt — measures the bits that sit safely inside and never the row
 * that sticks out. The picture could not carry this either: the shots containing it also contain
 * the arcs, so they allow 2% of the pixels, and three languages ran a line off the edge for less.
 */
async function expectStatsFit(page: Page, width: number, where: string): Promise<void> {
  const measured = await page
    .locator(`${ACTIVE} [class*="stats"]`)
    .first()
    .evaluate((stats) => ({
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

  expect(measured.overflow, `${where}: the stats scroll sideways`).toBe(0);
  expect(measured.widest, `${where}: a row of the stats`).toBeLessThanOrEqual(width);
}

/**
 * The details panel.
 *
 * The band at the top of each section bleeds past the panel's padding on purpose, so it is wider
 * than its own parent. That is fine until a grid item refuses to shrink below it: then the track
 * grows, and the whole panel scrolls sideways with the counts pushed off the right edge.
 */
async function expectPanelDoesNotScroll(page: Page, where: string): Promise<void> {
  const measured = await page.locator(`${ACTIVE} aside`).evaluate((aside) => {
    const scroller = aside.querySelector('[class*="scroll"]') ?? aside;
    const bands = [...aside.querySelectorAll('h3 button')];
    const right = scroller.getBoundingClientRect().right;
    return {
      overflow: scroller.scrollWidth - scroller.clientWidth,
      // Every count has to stay on screen: it is the one thing a returning reader is looking
      // for, and it sits at the end of the row.
      countsOffscreen: bands.filter((band) => {
        const count = band.querySelector('[class*="count"]');
        return count !== null && count.getBoundingClientRect().right > right + 1;
      }).length,
    };
  });

  expect(measured.overflow, `${where}: the panel scrolls sideways`).toBe(0);
  expect(measured.countsOffscreen, `${where}: a count is off the edge`).toBe(0);
}

/**
 * The header, where the masthead rule lives.
 *
 * `VizPage.module.css` and `controls.module.css` each carry a rule keyed on the literal language
 * — the only two in the app — because the header's width depends on how long the words are.
 * Nothing else can enforce that, so the promise is made here: whatever the language, the
 * header's contents stay inside the window and both menus stay on screen.
 */
async function expectHeaderFits(page: Page, width: number, where: string): Promise<void> {
  const measured = await page
    .locator(`${ACTIVE} header`)
    .first()
    .evaluate((element) => {
      const parts = [...element.querySelectorAll('*')].filter(
        (child) => child.childElementCount === 0 && child.getBoundingClientRect().width > 0,
      );
      return {
        right: Math.round(element.getBoundingClientRect().right),
        widest: Math.round(Math.max(...parts.map((part) => part.getBoundingClientRect().right))),
        bottom: Math.round(element.getBoundingClientRect().bottom),
      };
    });

  expect(measured.right, `${where}: header`).toBeLessThanOrEqual(width);
  expect(measured.widest, `${where}: header contents`).toBeLessThanOrEqual(width);
  // Three rows of controls would mean the masthead rule is not applying: the header is meant to
  // settle at one row, or two once the masthead takes its own.
  expect(measured.bottom, `${where}: header height`).toBeLessThan(140);
  // Both menus found by their shape rather than their names: a regex of every language's word
  // for "Filters" had already fallen behind by three languages.
  const menus = page.locator(`${ACTIVE} header button[aria-expanded]`);
  await expect(menus, `${where}: both menus`).toHaveCount(2);
  await expect(menus.first(), where).toBeVisible();
  await expect(menus.last(), where).toBeVisible();
}
