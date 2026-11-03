/**
 * KeyboardList: the read-only list of keyboard shortcuts in the Settings dialog (design
 * 9.11): key caps in the first column, what the key does in the second.
 */
import { Fragment } from 'react';
import { KEYBOARD_SHORTCUTS } from './keys';
import styles from './Settings.module.css';

export function KeyboardList() {
  return (
    <dl className={styles.keys}>
      {KEYBOARD_SHORTCUTS.map((shortcut) => (
        <Fragment key={shortcut.keys.join('+')}>
          <dt className={styles.keyCombo}>
            {shortcut.keys.map((key, i) => (
              <Fragment key={key}>
                {i > 0 && <span className={styles.plus}>+</span>}
                <kbd className={styles.cap}>{key}</kbd>
              </Fragment>
            ))}
          </dt>
          <dd className={styles.keyDoes}>{shortcut.does}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
