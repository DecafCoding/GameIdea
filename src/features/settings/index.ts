/**
 * Settings feature: the settings store, the Settings dialog, its Keyboard list and the
 * segmented control (also used by the New Board dialog). Other
 * features and app/ reach settings only through this file.
 */
export {
  changeSettings,
  getSettings,
  initSettings,
  startSettingsSync,
  subscribeSettings,
  useCanSaveSettings,
  useSettings,
  type SettingsPatch,
} from './settingsStore';
export {
  MODE_HELP_TEXT,
  SettingsDialog,
  SETTINGS_BLOCKED_TEXT,
  SETTINGS_CAPTION,
  type GenresTabSlot,
} from './SettingsDialog';
export { GENRES_DISABLED_TEXT } from './SettingsTabs';
export { Segmented, type SegmentedOption } from './Segmented';
export { APP_VERSION, FOOTER_TEXT, KEYBOARD_SHORTCUTS } from './keys';
