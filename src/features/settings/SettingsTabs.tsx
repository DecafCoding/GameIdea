/**
 * SettingsTabs: the tab bar of the Settings dialog (design 9.11): Appearance and Genres, with
 * role="tablist" and role="tab". With no board open the Genres tab is aria-disabled, keeps
 * focus for its tooltip and ignores clicks (design 9.10). Tabs are plain buttons activated
 * by click, Enter or Space; no arrow-key roving focus (design §12 leaves it unspecified).
 */
import styles from './Settings.module.css';

export type SettingsTab = 'appearance' | 'genres';

export const GENRES_DISABLED_TEXT = 'Open a board to change its genres.';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'appearance', label: 'Appearance' },
  { id: 'genres', label: 'Genres' },
];

interface SettingsTabsProps {
  tab: SettingsTab;
  onSelect: (tab: SettingsTab) => void;
  /** False when no board is open: the Genres tab is disabled. */
  genresEnabled: boolean;
  /** The id prefix shared by the tabs and the tab panel. */
  idPrefix: string;
}

/** The id of a tab button, for the panel's aria-labelledby. */
export const tabId = (idPrefix: string, tab: SettingsTab) => `${idPrefix}-tab-${tab}`;

export function SettingsTabs({ tab, onSelect, genresEnabled, idPrefix }: SettingsTabsProps) {
  return (
    <div role="tablist" aria-label="Settings" className={styles.tabs}>
      {TABS.map(({ id, label }) => {
        const disabled = id === 'genres' && !genresEnabled;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            id={tabId(idPrefix, id)}
            className={styles.tab}
            aria-selected={tab === id}
            aria-controls={`${idPrefix}-panel`}
            aria-disabled={disabled ? true : undefined}
            title={disabled ? GENRES_DISABLED_TEXT : undefined}
            onClick={() => {
              if (!disabled) onSelect(id);
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
