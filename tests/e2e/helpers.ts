import type { Page } from '@playwright/test';

/** The panel of the view currently on screen (both views stay mounted). */
export const PANEL = 'div[data-active="true"] aside';
export const ACTIVE = 'div[data-active="true"]';

/** Waits for the app to have drawn: the data is loaded and the canvas is up. */
export async function waitForApp(page: Page): Promise<void> {
  await page.locator(`${ACTIVE} canvas`).first().waitFor({ state: 'attached' });
  await page.locator(`${ACTIVE} footer`).first().waitFor();
}

/** Collects console errors, ignoring the software renderer's performance chatter. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/ReadPixels|GPU stall|SwiftShader/i.test(message.text())) {
      errors.push(message.text());
    }
  });
  return errors;
}

/**
 * On a phone the details are a sheet that starts part-way up the screen, so its lower contents
 * are off screen until it is opened. On a desktop there is no handle and nothing to do.
 */
export async function openPanel(page: Page): Promise<void> {
  const handle = page.locator(PANEL).getByRole('button', { name: 'Expand details' });
  if (await handle.isVisible()) {
    await handle.click();
  }
}

/** Opens a passage straight from its address, with its details in full view. */
export async function openPassage(page: Page, ref: string, query = ''): Promise<void> {
  await page.goto(`./?ref=${ref}${query}`);
  await waitForApp(page);
  await openPanel(page);
}

/**
 * Waits for the page to stop changing, so a screenshot of it is the same one every time: the
 * fonts in place, the arcs drawn rather than mid-flight, and no transition still running.
 */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  // Two frames after the last layout: the arcs draw on a frame of their own.
  await page.evaluate(
    async () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve(null);
          });
        });
      }),
  );
  await page.waitForTimeout(600);

  // And then until nothing is still scrolling.
  //
  // The threads view brings the chosen verse into view with `behavior: 'smooth'`, which is a
  // scroll animation started from script: Playwright's `animations: 'disabled'` does not reach
  // it, and it has no event to wait on. A shot taken while it is still moving is offset by a
  // line of text against one taken after — 4% of the pixels, which is how this suite came by a
  // snapshot that failed about two runs in three.
  await page.evaluate(() => {
    delete (window as unknown as { __scrollSettle?: unknown }).__scrollSettle;
  });
  await page.waitForFunction(
    () => {
      const positions = [...document.querySelectorAll('*')]
        .filter((element) => element.scrollTop !== 0 || element.scrollLeft !== 0)
        .map((element) => `${String(element.scrollTop)},${String(element.scrollLeft)}`)
        .join('|');
      const store = window as unknown as { __scrollSettle?: { at: string; count: number } };
      const previous = store.__scrollSettle;
      const next =
        previous?.at === positions
          ? { at: positions, count: previous.count + 1 }
          : { at: positions, count: 0 };
      store.__scrollSettle = next;
      // Three frames with nothing moving. A smooth scroll never pauses that long mid-flight.
      return next.count >= 3;
    },
    { timeout: 10_000, polling: 'raf' },
  );
}
