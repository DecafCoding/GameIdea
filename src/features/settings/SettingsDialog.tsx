/**
 * SettingsDialog: the Settings dialog (design 9.11) on the shared Dialog. Mode, Theme Color
 * and Snap To Grid apply and save at once, so there is no Cancel; Done, × and Esc only
 * close. The Keyboard list is read-only. The footer shows the app version. When this
 * browser does not save settings, a one-line note says so.
 */
import type { ReactNode } from 'react';
import { ACCENTS, MODES, type Accent, type Mode } from '@/shared/model';
import { Button, Dialog } from '@/shared/ui';
import { FOOTER_TEXT } from './keys';
import { KeyboardList } from './KeyboardList';
import { Segmented, type SegmentedOption } from './Segmented';
import styles from './Settings.module.css';
import { changeSettings, useCanSaveSettings, useSettings } from './settingsStore';
import { Switch } from './Switch';

export const SETTINGS_CAPTION =
  'These settings apply to every board in this browser. A change applies at once.';
export const SETTINGS_BLOCKED_TEXT =
  'This browser does not save settings. They reset when the page reloads.';

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

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
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

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const settings = useSettings();
  const canSave = useCanSaveSettings();

  return (
    <Dialog
      open={open}
      size="settings"
      showClose
      title="Settings"
      caption={SETTINGS_CAPTION}
      footerNote={FOOTER_TEXT}
      onClose={onClose}
      actions={
        <Button variant="primary" data-autofocus onClick={onClose}>
          Done
        </Button>
      }
    >
      {!canSave && <p className={styles.blocked}>{SETTINGS_BLOCKED_TEXT}</p>}
      <section className={styles.section} aria-labelledby="settings-appearance">
        <h3 id="settings-appearance" className={styles.sectionTitle}>
          Appearance
        </h3>
        <Row name="Mode" help="Dark or light screens. The cards look the same in both.">
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
    </Dialog>
  );
}
