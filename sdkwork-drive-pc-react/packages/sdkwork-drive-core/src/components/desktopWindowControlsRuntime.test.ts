import { describe, expect, it } from 'vitest';
import { shouldRenderDesktopWindowControls } from './desktopWindowControlsRuntime.ts';

describe('desktopWindowControlsRuntime', () => {
  it('shows desktop window controls when platform bridge already reports desktop', () => {
    expect(shouldRenderDesktopWindowControls('desktop')).toBe(true);
  });

  it('shows desktop window controls when the desktop host marks the document before shell render', () => {
    expect(
      shouldRenderDesktopWindowControls('web', {
        runtimeDocument: {
          documentElement: {
            getAttribute(name: string) {
              return name === 'data-app-platform' ? 'desktop' : null;
            },
          },
        } as unknown as Document,
      }),
    ).toBe(true);
  });

  it('shows desktop window controls when Tauri internals are available even if the bridge still looks like web', () => {
    expect(
      shouldRenderDesktopWindowControls('web', {
        runtimeWindow: {
          __TAURI_INTERNALS__: {},
        } as unknown as Window,
      }),
    ).toBe(true);
  });

  it('keeps desktop window controls hidden in the plain web host', () => {
    expect(
      shouldRenderDesktopWindowControls('web', {
        runtimeWindow: {} as Window,
        runtimeDocument: {
          documentElement: {
            getAttribute() {
              return null;
            },
          },
        } as unknown as Document,
      }),
    ).toBe(false);
  });
});
