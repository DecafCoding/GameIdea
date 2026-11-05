/**
 * HookCard: the dark 240 × 200 Hook Card (design 9.5). It shows the hook sentence the
 * canvas computes from its stack on every change; it never stores it. With nothing tucked
 * under it, it shows the New state: the help line and a static "Player Role goes here"
 * slot under the card. The sentence is selectable text (nodrag, nopan), so it is copied
 * with the pointer and Ctrl+C; drag the card by its header.
 */
import { PanelTitle } from '@/shared/ui';
import styles from './HookCard.module.css';

/** The New state's help line (design 9.5). */
export const HOOK_NEW_TEXT =
  'Tuck a Player Role under this card. Then tuck a Mechanic, a Resource, a Goal and a Conflict.';

interface HookCardProps {
  sentence: string;
  /** Nothing is tucked under the Hook Card. */
  empty: boolean;
}

export function HookCard({ sentence, empty }: HookCardProps) {
  return (
    <article className={styles.hook} aria-label="Hook Card" data-card="" data-type="hook">
      <PanelTitle icon="hook" title="Hook" />
      <p
        className={`${styles.sentence} nodrag nopan`}
        data-testid="hook-sentence"
        data-hook-text=""
      >
        {empty ? HOOK_NEW_TEXT : sentence}
      </p>
      {empty && (
        <div className={styles.slot} data-testid="hook-slot" aria-hidden="true">
          Player Role goes here
        </div>
      )}
    </article>
  );
}
