/**
 * Switch: an on/off switch (design 9.11), 44 × 26 with a 20 px knob and an --accent track
 * when on. A button with role="switch".
 */
import styles from './Settings.module.css';

interface SwitchProps {
  /** The accessible name. */
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Switch({ label, checked, onChange }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={styles.switch}
      onClick={() => onChange(!checked)}
    >
      <span aria-hidden="true" className={styles.knob} />
    </button>
  );
}
