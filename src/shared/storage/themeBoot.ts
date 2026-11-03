/**
 * The theme boot script: part of the storage module. vite.config.ts inlines this string as
 * a classic script at the top of <head>, so it runs before the stylesheet paints and a
 * Light setting is on the page root before the first frame. It mirrors parseSettings for
 * the 2 theme fields: data-mode only to dark or light, data-theme only to orange, blue or
 * green; anything else (no record, bad JSON, blocked storage) leaves the index.html
 * defaults. Plain ES5 with no imports, because the config loads this file directly.
 */
export const THEME_BOOT_SCRIPT = `(function () {
  try {
    var raw = window.localStorage.getItem('gameidea.settings');
    if (!raw) return;
    var s = JSON.parse(raw);
    if (!s || typeof s !== 'object') return;
    var root = document.documentElement;
    if (s.mode === 'dark' || s.mode === 'light') root.setAttribute('data-mode', s.mode);
    if (s.accent === 'orange' || s.accent === 'blue' || s.accent === 'green') {
      root.setAttribute('data-theme', s.accent);
    }
  } catch (e) {
    // Blocked storage or bad JSON: keep the defaults on <html>.
  }
})();`;
