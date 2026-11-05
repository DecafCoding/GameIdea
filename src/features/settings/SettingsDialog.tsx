/**
 * SettingsDialog: the Settings dialog (design 9.11) on the shared Dialog, 900 wide, with 2
 * tabs. Appearance: Mode, Theme Color and Snap To Grid apply and save at once, so there is
 * no Cancel; Done, × and Esc only close. The Keyboard list is read-only. The footer shows the
 * app version. When this browser does not save settings, a one-line note says so. Genres:
 * app/ passes the tab's caption, footer note and content through genresTab, so this feature
 * never imports the genres feature (design 9.10). With no genresTab (no board open) the Genres
 * tab is disabled. The selected tab is local view state: it opens on Appearance (or on
 * Genres from a rail Edit Genres button), is never stored and is never an undo step (design 9.11, 13).
 */
import { useId, useState, type ReactNode } from 'react';
import { ACCENTS, MODES, type Accent, type Mode } from '@/shared/model';
import { Button, Dialog } from '@/shared/ui';
import { FOOTER_TEXT } from './keys';
import { KeyboardList } from './KeyboardList';
import { Segmented, type SegmentedOption } from './Segmented';
import { SettingsTabs, tabId, type SettingsTab } from './SettingsTabs';
import styles from './Settings.module.css';
import { changeSettings, useCanSaveSettings, useSettings } from './settingsStore';
import { Switch } from './Switch';

export const SETTINGS_CAPTION =
  'These settings apply to every board in this browser. A change applies at once.';
export const SETTINGS_BLOCKED_TEXT =
  'This browser does not save settings. They reset when the page reloads.';
/** The Mode help text (design 9.11, 2026-11-04). */
export const MODE_HELP_TEXT =
  'Dark or light screens. Cards are dark in dark mode and cream in light mode.';

const MODE_LABEL: Record<Mode, string> = { dark: 'Dark', light: 'Light' };
const ACCENT_LABEL: Record<Accent, string> = { orange: 'Orange', blue: 'Blue', green: 'Green' };
const DOT_CLASS: Record<Accent, string> = {
  orange: styles.dotOrange!,
  blue: styles.dotBlue!,
  green: styles.dotGreen!,
};

const MODE_OPTIONS: SegmentedOption<Mode>[] = MODES.map((value) => ({
  value,
  label: MODE_LABEL[value],
}));
const ACCENT_OPTIONS: SegmentedOption<Accent>[] = ACCENTS.map((value) => ({
  value,
  label: ACCENT_LABEL[value],
  dotClass: DOT_CLASS[value],
}));

/** The Genres tab, filled by app/ when a board is open. */
export interface GenresTabSlot {
  /** The scope line under the tab bar. */
  caption: string;
  /** The note at the left of the footer. */
  footerNote: string;
  content: ReactNode;
}

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  /** The Genres tab. Without it the Genres tab is disabled. */
  genresTab?: GenresTabSlot;
  /** The tab each open starts on: Appearance, or Genres from a rail Edit Genres button. */
  openOn?: SettingsTab;
}

/** One setting: its name and help text on the left, the control on the right. */
function Row({ name, help, children }: { name: string; help: string; children: ReactNode }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowText}>
        <span className={styles.name}>{name}</span>
        <span className={styles.help}>{help}</span>
      </div>
      {children}
    </div>
  );
}

export function SettingsDialog({
  open,
  onClose,
  genresTab,
  openOn = 'appearance',
}: SettingsDialogProps) {
  const canSave = useCanSaveSettings();
  const idPrefix = useId();
  const [tab, setTab] = useState<SettingsTab>(openOn);
  // Every open starts on openOn: Appearance (design 9.11) or Genres from an Edit Genres
  // button (user 2026-11-05). Reset while rendering the open change.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setTab(openOn);
  }
  const shown: SettingsTab = tab === 'genres' && genresTab ? 'genres' : 'appearance';

  return (
    <Dialog
      open={open}
      size="settings"
      showClose
      title="Settings"
      tabs={
        <SettingsTabs
          tab={shown}
          onSelect={setTab}
          genresEnabled={genresTab !== undefined}
          idPrefix={idPrefix}
        />
      }
      caption={shown === 'genres' ? genresTab!.caption : SETTINGS_CAPTION}
      footerNote={shown === 'genres' ? genresTab!.footerNote : FOOTER_TEXT}
      onClose={onClose}
      actions={
        <Button variant="primary" data-autofocus onClick={onClose}>
          Done
        </Button>
      }
    >
      <div role="tabpanel" id={`${idPrefix}-panel`} aria-labelledby={tabId(idPrefix, shown)}>
        {shown === 'genres' ? genresTab!.content : <AppearanceTab canSave={canSave} />}
      </div>
    </Dialog>
  );
}

/** The Appearance tab: Appearance, Canvas and Keyboard sections. */
function AppearanceTab({ canSave }: { canSave: boolean }) {
  const settings = useSettings();
  return (
    <>
      {!canSave && <p className={styles.blocked}>{SETTINGS_BLOCKED_TEXT}</p>}
      <section className={styles.section} aria-labelledby="settings-appearance">
        <h3 id="settings-appearance" className={styles.sectionTitle}>
          Appearance
        </h3>
        <Row name="Mode" help={MODE_HELP_TEXT}>
          <Segmented
            label="Mode"
            value={settings.mode}
            options={MODE_OPTIONS}
            onChange={(mode) => changeSettings({ mode })}
          />
        </Row>
        <Row
          name="Theme Color"
          help="The color of buttons, selection, the Hook Card border and the genre counts."
        >
          <Segmented
            label="Theme Color"
            value={settings.accent}
            options={ACCENT_OPTIONS}
            onChange={(accent) => changeSettings({ accent })}
          />
        </Row>
      </section>
      <section className={styles.section} aria-labelledby="settings-canvas">
        <h3 id="settings-canvas" className={styles.sectionTitle}>
          Canvas
        </h3>
        <Row
          name="Snap To Grid"
          help="Cards and notes line up with the dot grid when you drop them. Hold Alt while you drag to place freely."
        >
          <Switch
            label="Snap To Grid"
            checked={settings.snap}
            onChange={(snap) => changeSettings({ snap })}
          />
        </Row>
      </section>
      <section className={styles.section} aria-labelledby="settings-keyboard">
        <h3 id="settings-keyboard" className={styles.sectionTitle}>
          Keyboard
        </h3>
        <KeyboardList />
      </section>
    </>
  );
}
