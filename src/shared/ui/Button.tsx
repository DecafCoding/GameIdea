/**
 * Button: the shared primary, secondary and danger buttons (design sections 9.8, 9.10 and 11).
 */
import type { ButtonHTMLAttributes, Ref } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** danger is the delete dialog's confirm button. */
  variant: 'primary' | 'secondary' | 'danger';
  /** React 19 passes ref as a prop; it reaches the <button>. */
  ref?: Ref<HTMLButtonElement>;
}

export function Button({ variant, type = 'button', className, ...rest }: ButtonProps) {
  const classes = [styles.button, styles[variant], className].filter(Boolean).join(' ');
  return <button type={type} className={classes} {...rest} />;
}
