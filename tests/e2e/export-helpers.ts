/**
 * Helpers for the export and import browser tests: the Salvage Run fixture board and an
 * Export menu download.
 */
import type { Page } from '@playwright/test';
import type { Board } from '@/shared/model';
import { combinedCard, fixtureBoard, fixtureNote, fixtureStack } from '@/test/fixtures/boards';

/** "Salvage Run": a combined Player Role with a Goal and a Conflict tucked under it. */
export function salvageRun(): Board {
  const [role, goal, conflict] = fixtureStack(200, 200);
  const combined = combinedCard('role', {
    id: role!.id,
    x: role!.x,
    y: role!.y,
    z: role!.z,
  });
  return {
    ...fixtureBoard(
      [combined, goal!, conflict!],
      [fixtureNote({ x: 600, y: 200, text: 'The fleet left without her.' })],
    ),
    id: 'salvage-run',
    name: 'Salvage Run',
  };
}

export const exportButton = (page: Page) => page.getByRole('button', { name: 'Export' });

/** Opens the Export menu, clicks a row and returns the download. */
export async function exportFile(page: Page, row: 'Text File' | 'Board File') {
  await exportButton(page).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: new RegExp(row) }).click();
  return downloading;
}
