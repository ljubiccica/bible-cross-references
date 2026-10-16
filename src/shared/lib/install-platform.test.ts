import { describe, expect, it } from 'vitest';
import { installPlatformFor } from './install-platform.ts';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IPAD =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';
const WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

describe('installPlatformFor', () => {
  it('recognizes an iPhone', () => {
    expect(installPlatformFor(IPHONE, 5)).toBe('ios');
  });

  it('recognizes an iPad behind its Macintosh user agent, by its touch screen', () => {
    expect(installPlatformFor(IPAD, 5)).toBe('ios');
  });

  it('does not take a Mac for an iPad', () => {
    expect(installPlatformFor(MAC, 0)).toBe('desktop');
    // A Mac with a drawing tablet attached still reports no touch points for the screen.
    expect(installPlatformFor(MAC, 1)).toBe('desktop');
  });

  it('recognizes Android', () => {
    expect(installPlatformFor(ANDROID, 5)).toBe('android');
  });

  it('falls back to the desktop steps', () => {
    expect(installPlatformFor(WINDOWS, 0)).toBe('desktop');
    expect(installPlatformFor('', 0)).toBe('desktop');
  });
});
