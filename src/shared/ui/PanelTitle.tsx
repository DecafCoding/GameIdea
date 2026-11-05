/**
 * PanelTitle: the one header for the Hook Card, the Core Loop card, the Details panel and
 * the Questions panel (design 9.5, user 2026-11-05): an icon 14 with no circle, then the
 * title in Display 12/600, 0.08em, uppercase, both in the current mode's --accent-text.
 * Anything after the title (such as a count pill) comes in as children.
 */
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './PanelTitle.module.css';

interface PanelTitleProps {
  icon: IconName;
  title: string;
  children?: ReactNode;
}

export function PanelTitle({ icon, title, children }: PanelTitleProps) {
  return (
    <header className={styles.header}>
      <span className={styles.icon}>
        <Icon name={icon} size={14} />
      </span>
      <h2 className={styles.title}>{title}</h2>
      {children}
    </header>
  );
}
