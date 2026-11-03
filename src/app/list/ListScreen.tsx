/**
 * ListScreen: the board list page at #/ (design 9.8): a 56 px header bar with the app mark,
 * the wordmark and the local-only caption, and the board list below it. The board list
 * feature gets the board address format from here.
 */
import { BoardList } from '@/features/boards';
import { AppMark } from '../board/TopBar';
import styles from './ListScreen.module.css';

const boardHref = (id: string) => `#/board/${encodeURIComponent(id)}`;

function openBoard(id: string) {
  window.location.hash = `/board/${encodeURIComponent(id)}`;
}

export function ListScreen() {
  return (
    <div className={styles.screen}>
      <header className={styles.bar}>
        <AppMark />
        <span className={styles.wordmark}>TheForge</span>
        <span className={styles.gap} />
        <span className={styles.caption}>Runs on your computer. Nothing leaves it.</span>
      </header>
      <main className={styles.main} aria-label="Board List">
        <BoardList boardHref={boardHref} onOpen={openBoard} />
      </main>
    </div>
  );
}
