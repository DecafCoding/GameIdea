/**
 * Start-up: loads the vendored fonts, the design tokens and the global styles, reads the
 * Settings and applies the mode and theme color (synchronous, before the first render),
 * saves the browser-test fixture board to storage once if it is missing, starts autosave
 * (before React, so StrictMode cannot start it twice), then mounts the app into #root.
 */
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-600.css';
import '@fontsource/space-grotesk/latin-700.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@/shared/ui/tokens.css';
import './app/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { loadBoard, saveBoard, startAutosave } from '@/shared/storage';
import { App } from './app/App';
import { startTheme } from './app/theme';

// Load the card cue weights now, so the first draw does not wait on a font fetch and relayout.
// A failed load only means the fallback font shows; nothing to report.
void Promise.all([
  document.fonts.load('600 15px "Space Grotesk"'),
  document.fonts.load('700 15px "Space Grotesk"'),
]).catch(() => undefined);

/** Browser tests only: saves the fixture board once, so a reload keeps its saved changes. */
async function seedTestBoard(): Promise<void> {
  const fixture = window.__GAMEIDEA_E2E_BOARD__;
  if (!fixture) return;
  try {
    if ((await loadBoard(fixture.id)) === null) await saveBoard(fixture);
  } catch {
    // The board route sends a missing board to the list; the test then fails on its own.
  }
}

async function start(): Promise<void> {
  startTheme();
  await seedTestBoard();
  startAutosave();

  const root = document.getElementById('root');
  if (!root) {
    throw new Error('The page has no #root element to mount the app into.');
  }

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
