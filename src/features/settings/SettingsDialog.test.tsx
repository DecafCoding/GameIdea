/**
 * Tests for the Settings dialog: its rows, a change applies at once, the blocked-storage
 * note, the footer version, the Keyboard list, Done and no Cancel, and the Appearance and
 * Genres tabs (design 9.10, 9.11).
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@/shared/model';
import { APP_VERSION } from './keys';
import {
  MODE_HELP_TEXT,
  SETTINGS_BLOCKED_TEXT,
  SETTINGS_CAPTION,
  SettingsDialog,
} from './SettingsDialog';
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

  const genresTab = {
    caption: 'Genres scope line.',
    footerNote: 'Each deck keeps at least 1 genre.',
    content: <p>Genres content</p>,
  };

  it('settingsDialog_open_showsAppearanceTabSelected', () => {
    renderDialog();
    expect(screen.getByRole('tab', { name: 'Appearance' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByRole('tabpanel').textContent).toContain('Mode');
  });

  it('settingsDialog_tabs_haveTabRolesAndAriaSelected', () => {
    render(<SettingsDialog open onClose={() => undefined} genresTab={genresTab} />);
    const tablist = screen.getByRole('tablist', { name: 'Settings' });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Appearance', 'Genres']);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false']);
    const panel = screen.getByRole('tabpanel');
    expect(tabs[0]!.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(tabs[0]!.id);
  });

  it('settingsDialog_genresTabClick_showsGenresContentCaptionAndFooter', () => {
    render(<SettingsDialog open onClose={() => undefined} genresTab={genresTab} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Genres' }));
    const genres = screen.getByRole('tab', { name: 'Genres' });
    expect(genres.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').textContent).toBe('Genres content');
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(genres.id);
    expect(screen.getByText('Genres scope line.')).toBeTruthy();
    expect(screen.getByText('Each deck keeps at least 1 genre.')).toBeTruthy();
    expect(screen.queryByText(SETTINGS_CAPTION)).toBeNull();
    expect(screen.queryByText(`GameIdea ${APP_VERSION}`, { exact: false })).toBeNull();
  });

  it('settingsDialog_noGenresTab_genresTabAriaDisabledWithTooltip', () => {
    renderDialog();
    const genres = screen.getByRole('tab', { name: 'Genres' });
    expect(genres.getAttribute('aria-disabled')).toBe('true');
    expect(genres.getAttribute('title')).toBe('Open a board to change its genres.');
    fireEvent.click(genres);
    expect(screen.getByRole('tab', { name: 'Appearance' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByRole('tabpanel').textContent).toContain('Mode');
  });

  it('settingsDialog_reopen_returnsToAppearance', () => {
    const { rerender } = render(
      <SettingsDialog open onClose={() => undefined} genresTab={genresTab} />,
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Genres' }));
    rerender(<SettingsDialog open={false} onClose={() => undefined} genresTab={genresTab} />);
    rerender(<SettingsDialog open onClose={() => undefined} genresTab={genresTab} />);
    expect(screen.getByRole('tab', { name: 'Appearance' }).getAttribute('aria-selected')).toBe(
      'true',
    );
  });

  it('settingsDialog_modeHelp_isNewText', () => {
    renderDialog();
    expect(MODE_HELP_TEXT).toBe(
      'Dark or light screens. Cards are dark in dark mode and cream in light mode.',
    );
    expect(screen.getByText(MODE_HELP_TEXT)).toBeTruthy();
  });
});
