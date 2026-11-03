/**
 * Tests for the Settings dialog: its rows, a change applies at once, the blocked-storage
 * note, the footer version, the Keyboard list, Done and no Cancel.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@/shared/model';
import { APP_VERSION } from './keys';
import { SETTINGS_BLOCKED_TEXT, SettingsDialog } from './SettingsDialog';
import { useSettingsStore } from './settingsStore';

beforeEach(() => {
  localStorage.clear();
  useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS }, canSave: true });
});

function renderDialog(onClose = vi.fn()) {
  render(<SettingsDialog open onClose={onClose} />);
  return { dialog: screen.getByRole('dialog', { name: 'Settings' }), onClose };
}

describe('SettingsDialog', () => {
  it('settingsDialog_rows_showModeThemeSnap', () => {
    const { dialog } = renderDialog();
    expect(within(dialog).getByRole('radiogroup', { name: 'Mode' })).toBeTruthy();
    expect(within(dialog).getByRole('radiogroup', { name: 'Theme Color' })).toBeTruthy();
    expect(within(dialog).getByRole('switch', { name: 'Snap To Grid' })).toBeTruthy();
    expect(dialog.textContent).toContain(
      'These settings apply to every board in this browser. A change applies at once.',
    );
  });

  it('settingsDialog_clickLight_changesSettingAtOnce', () => {
    renderDialog();
    const light = screen.getByRole('radio', { name: 'Light' });
    fireEvent.click(light);
    expect(useSettingsStore.getState().settings.mode).toBe('light');
    expect(light.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(screen.getByRole('radio', { name: 'Green' }));
    expect(useSettingsStore.getState().settings.accent).toBe('green');
  });

  it('settingsDialog_arrowKey_movesChoice', () => {
    renderDialog();
    const group = screen.getByRole('radiogroup', { name: 'Theme Color' });
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(useSettingsStore.getState().settings.accent).toBe('blue');
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(useSettingsStore.getState().settings.accent).toBe('green');
  });

  it('settingsDialog_switch_togglesSnap', () => {
    renderDialog();
    const snap = screen.getByRole('switch', { name: 'Snap To Grid' });
    expect(snap.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(snap);
    expect(useSettingsStore.getState().settings.snap).toBe(false);
    expect(snap.getAttribute('aria-checked')).toBe('false');
  });

  it('settingsDialog_cannotSave_showsNote', () => {
    useSettingsStore.setState({ canSave: false });
    renderDialog();
    expect(screen.getByText(SETTINGS_BLOCKED_TEXT)).toBeTruthy();
  });

  it('settingsDialog_canSave_noNote', () => {
    renderDialog();
    expect(screen.queryByText(SETTINGS_BLOCKED_TEXT)).toBeNull();
  });

  it('settingsDialog_footer_showsVersion', () => {
    const { dialog } = renderDialog();
    expect(dialog.textContent).toContain(
      `GameIdea ${APP_VERSION} · No account. No data leaves this computer.`,
    );
  });

  it('settingsDialog_keyboardList_fourKeys', () => {
    renderDialog();
    const list = screen.getAllByRole('definition')[0]!.closest('dl')!;
    const keys = within(list)
      .getAllByRole('term')
      .map((dt) => dt.textContent);
    expect(keys).toEqual(['R', 'Shift+R', 'Ctrl+Z', 'Ctrl+Shift+Z']);
    expect(list.textContent).toContain('Turn the outer ring, or the only ring, one step');
    expect(list.textContent).toContain('Turn the inner ring of a combined card');
  });

  it('settingsDialog_done_callsOnClose', () => {
    const { onClose } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('settingsDialog_noCancelButton', () => {
    renderDialog();
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
  });
});
