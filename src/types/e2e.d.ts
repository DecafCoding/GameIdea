/**
 * The browser-test seam: Playwright sets a fixture board here with page.addInitScript
 * before the app starts. Start-up saves it to storage once, if that id is missing, before
 * the app renders. It has no effect when unset.
 */
import type { Board } from '@/shared/model';

declare global {
  interface Window {
    __GAMEIDEA_E2E_BOARD__?: Board;
  }
}

export {};
