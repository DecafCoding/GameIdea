/**
 * The text file: the board in plain words, downloaded as <board-name>.txt. The board
 * name, then a Cards section (stacks top to bottom, then left to right; tucked cards
 * indented 2 spaces per level; only the active cue or pair), then a Notes section (each
 * note: its title line, then its text).
 * A Modifier tucked under a card with nothing tucked under it joins its parent's line
 * ("Player Role: exiled navigator, devout"). LF line ends and one final newline.
 */
import { activeText } from '@/features/card';
import { childrenOf, isRoot } from '@/features/canvas';
import { DECK_NAME, type Board, type Card } from '@/shared/model';
import { downloadFile, safeFileBase } from './download';

/** "<name>.txt", with characters Windows does not allow in a file name replaced. */
export function textFileName(name: string): string {
  return `${safeFileBase(name)}.txt`;
}

/** A Modifier with no cards of its own joins its parent's line. */
function joinsParent(board: Board, card: Card): boolean {
  return card.type === 'modifier' && childrenOf(board, card.id).length === 0;
}

function cardLines(board: Board): string[] {
  const lines: string[] = [];
  const visit = (card: Card, depth: number) => {
    const children = childrenOf(board, card.id);
    const joined = children.filter((child) => joinsParent(board, child));
    const words = [activeText(card), ...joined.map(activeText)].join(', ');
    lines.push(`${'  '.repeat(depth)}${DECK_NAME[card.type]}: ${words}`);
    for (const child of children) {
      if (!joined.includes(child)) visit(child, depth + 1);
    }
  };
  const roots = board.cards
    .filter((card) => isRoot(board, card.id))
    .sort((a, b) => a.y - b.y || a.x - b.x || a.z - b.z);
  for (const root of roots) visit(root, 0);
  return lines;
}

function noteBlocks(board: Board): string[] {
  return board.notes
    .filter((note) => note.text.trim() !== '')
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((note) =>
      [note.title.trim(), ...note.text.trimEnd().split(/\r?\n/)]
        .map((line) => line.trimEnd())
        .join('\n'),
    );
}

/** The text file contents. A board with no cards and no non-blank notes is the name only. */
export function boardText(board: Board): string {
  const sections = [board.name];
  const cards = cardLines(board);
  if (cards.length > 0) sections.push(['Cards', '', ...cards].join('\n'));
  const notes = noteBlocks(board);
  if (notes.length > 0) sections.push(['Notes', '', notes.join('\n\n')].join('\n'));
  return `${sections.join('\n\n')}\n`;
}

/** Downloads the text file at once, with no dialog. */
export function downloadTextFile(board: Board): void {
  downloadFile(textFileName(board.name), boardText(board), 'text/plain;charset=utf-8');
}
