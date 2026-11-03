/**
 * Segmented: a segmented control (design 9.11) as a radio group. Each option is a radio
 * button; a click or the arrow keys pick an option at once. An option can carry a color
 * dot.
 */
import { useRef, type KeyboardEvent } from 'react';
import styles from './Settings.module.css';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** The class of a 14 px color dot before the label. */
  dotClass?: string;
}

interface SegmentedProps<T extends string> {
  /** The accessible name of the group. */
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (step === 0) return;
    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const next = (index + step + options.length) % options.length;
    onChange(options[next]!.value);
    buttons.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className={styles.segmented} onKeyDown={onKeyDown}>
      {options.map((option, i) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className={styles.segment}
            onClick={() => onChange(option.value)}
          >
            {option.dotClass && (
              <span aria-hidden="true" className={`${styles.dot} ${option.dotClass}`} />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
