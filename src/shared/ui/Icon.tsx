/**
 * Icon: draws one of the app's own SVG icons from public/icons/ in currentColor,
 * through a CSS mask, so the icon takes the text color of its parent.
 */
import type { CSSProperties } from 'react';
import styles from './Icon.module.css';

export type IconName =
  | 'hook'
  | 'user'
  | 'wrench'
  | 'battery'
  | 'flag'
  | 'zap'
  | 'user-plus'
  | 'battery-plus'
  | 'map-pin-plus'
  | 'map-pin'
  | 'smile'
  | 'rotate-ccw'
  | 'trending-up'
  | 'shield-x'
  | 'settings'
  | 'sliders-horizontal'
  | 'align-left'
  | 'lock'
  | 'x'
  | 'minus'
  | 'ellipsis'
  | 'triangle-alert'
  | 'refresh-cw'
  | 'alert-circle'
  | 'undo'
  | 'redo'
  | 'note'
  | 'trash'
  | 'pencil'
  | 'plus'
  | 'download'
  | 'chevron-down'
  | 'file-text'
  | 'board-file'
  | 'upload'
  | 'file-x'
  | 'check'
  | 'copy'
  | 'playing-cards-fan'
  | 'lock-open'
  | 'split';

interface IconProps {
  name: IconName;
  /** Size in px. */
  size: number;
  className?: string;
}

export function Icon({ name, size, className }: IconProps) {
  const url = `url(${import.meta.env.BASE_URL}icons/${name}.svg)`;
  const style: CSSProperties = {
    width: size,
    height: size,
    maskImage: url,
    WebkitMaskImage: url,
  };
  return (
    <span
      aria-hidden="true"
      data-icon={name}
      className={className ? `${styles.icon} ${className}` : styles.icon}
      style={style}
    />
  );
}
