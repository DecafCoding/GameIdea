/**
 * EmptyBoardPanel: the guide over an empty board (design 9.2): a centered panel with the
 * title, one line on what a hook is and 3 numbered steps, plus a "Start Here" tag at the
 * top left of the canvas pointing at the rail's Hook Card button. The board screen shows
 * it until the first card or note is on the board.
 */
import styles from './EmptyBoardPanel.module.css';

export const EMPTY_BOARD_STEPS = [
  'Draw a Hook Card from the top of the rail.',
  'Draw a Player Role and tuck it under the Hook Card.',
  'Add a Mechanic, a Resource, a Goal and a Conflict. Turn the rings until the sentence reads well.',
] as const;

export function EmptyBoardPanel() {
  return (
    <>
      <p className={styles.tag} data-testid="start-here">
        Start Here
      </p>
      <section className={styles.panel} aria-labelledby="empty-board-title">
        <h2 id="empty-board-title" className={styles.title}>
          Build Your First Hook
        </h2>
        <p className={styles.text}>
          A hook is one or two sentences that make a person want to play your game.
        </p>
        <ol className={styles.steps}>
          {EMPTY_BOARD_STEPS.map((step, i) => (
            <li key={step} className={styles.step}>
              <span className={styles.number} aria-hidden="true">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
