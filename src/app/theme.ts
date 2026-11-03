/**
 * Keeps the page root in sync with the Settings: data-mode and data-theme on <html> select
 * the chrome and accent tokens. The inline boot script set them before the first paint;
 * startTheme reads the Settings into the store before the first render, applies them once,
 * then follows every change, in this tab or another.
 */
import {
  getSettings,
  initSettings,
  startSettingsSync,
  subscribeSettings,
} from '@/features/settings';
import type { Settings } from '@/shared/model';

/** Sets the mode and theme color attributes on the page root. */
export function applyTheme(
  settings: Pick<Settings, 'mode' | 'accent'>,
  root: HTMLElement = document.documentElement,
): void {
  root.dataset.mode = settings.mode;
  root.dataset.theme = settings.accent;
}

/** Start-up: reads the Settings, applies them and follows changes. Returns the stop. */
export function startTheme(): () => void {
  initSettings();
  applyTheme(getSettings());
  const unsubscribe = subscribeSettings((settings) => applyTheme(settings));
  const stopSync = startSettingsSync();
  return () => {
    unsubscribe();
    stopSync();
  };
}
