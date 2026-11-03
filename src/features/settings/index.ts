/**
 * Settings feature: the settings store, the Settings dialog and its Keyboard list. Other
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
export { SettingsDialog, SETTINGS_BLOCKED_TEXT, SETTINGS_CAPTION } from './SettingsDialog';
export { APP_VERSION, FOOTER_TEXT, KEYBOARD_SHORTCUTS } from './keys';
