/**
 * The text file: the board in plain words, downloaded as <board-name>.txt. The board
 * name, then a Hooks section (each non-empty hook sentence in reading order, one
 * paragraph each, a blank line between), then a Core Loop section (the Core Loop card's
 * stored loopText, else its live text; each line trimmed at the end; left out when there is
 * no Core Loop card or the text is empty), then a Questions section (each answer in list
 * order, newest first: its question line, then its answer lines trimmed at the end, a blank
 * line between answers; left out when there are no answers), then on a One-Pager board a
 * Details section (each
 * lane's plural deck name in rail order, then "- <words>" per chip in lane order, merged
 * and On Top adjectives included, a blank line between lanes; left out when the panel is
 * empty), then a Cards section (stacks top to bottom, then left to right; tucked cards
 * indented 2 spaces per level; only the active cue or pair), then a Notes section (each
 * note: its title line, then its text).
 * A Modifier tucked under a card with nothing tucked under it joins its parent's line
 * ("Player Role: exiled navigator, devout"). An On Top Modifier is never its own line: it
 * reads inside its base card's words ("Player Role: tall frozen pilot"). A Hook Card line
 * reads "Hook Card", with its stack indented under it. Concept cards and the Core Loop card
 * are never in Cards. A Modifier line names its Modifier deck. LF line ends and one final
 * newline.
 */
import { activeText } from '@/features/card';
import {
  cardText,
  childrenOf,
  conceptLanes,
  hookSentences,
  isOnTop,
  isRoot,
  loopSteps,
} from '@/features/canvas';
import { buildLoopText } from '@/features/loop';
import { DECK_LANE_NAME, DECK_NAME, MOD_DECK_NAME, type Board, type Card } from '@/shared/model';
import { downloadFile, safeFileBase } from './download';

/** "<name>.txt", with characters Windows does not allow in a file name replaced. */
export function textFileName(name: string): string {
  return `${safeFileBase(name)}.txt`;
}

/** A Modifier with no cards of its own joins its parent's line. */
function joinsParent(board: Board, card: Card): boolean {
  return card.type === 'modifier' && childrenOf(board, card.id).length === 0;
}

/** The deck name on a card's line: "Player Role", or "Setting Modifier" for a Modifier. */
function deckName(card: Card): string {
  return card.type === 'modifier' && card.modDeck
    ? MOD_DECK_NAME[card.modDeck]
    : DECK_NAME[card.type];
}

function cardLines(board: Board): string[] {
  const lines: string[] = [];
  const visit = (card: Card, depth: number) => {
    const children = childrenOf(board, card.id);
    const joined = children.filter((child) => joinsParent(board, child));
    const indent = '  '.repeat(depth);
    if (card.type === 'hook') {
      lines.push(`${indent}${DECK_NAME.hook}`);
    } else {
      const words = [cardText(board, card), ...joined.map((c) => activeText(c))].join(', ');
      lines.push(`${indent}${deckName(card)}: ${words}`);
    }
    for (const child of children) {
      if (!joined.includes(child)) visit(child, depth + 1);
    }
  };
  const roots = board.cards
    // Concept cards are listed in the Concept section, the Core Loop card in its own.
    .filter(
      (card) =>
        isRoot(board, card.id) && !isOnTop(board, card) && !card.inConcept && card.type !== 'loop',
    )
    .sort((a, b) => a.y - b.y || a.x - b.x || a.z - b.z);
  for (const root of roots) visit(root, 0);
  return lines;
}

/** Each Concept lane: its name, then 1 bullet per chip; empty on a Free Form board. */
function conceptBlocks(board: Board): string[] {
  if (board.kind !== 'onePager') return [];
  return conceptLanes(board).map((lane) =>
    [DECK_LANE_NAME[lane.deck], ...lane.cards.map((card) => `- ${cardText(board, card)}`)].join(
      '\n',
    ),
  );
}

/** The Core Loop text: stored, else live; each line trimmed at the end; '' when none. */
function loopBlock(board: Board): string {
  const card = board.cards.find((c) => c.type === 'loop');
  if (!card) return '';
  const text = card.loopText ?? buildLoopText(loopSteps(board)).text;
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join('\n')
    .trimEnd();
}

/** 1 block per answer in list order: the question line, then the answer lines. */
function questionBlocks(board: Board): string[] {
  return (board.questions ?? []).map((item) =>
    [item.question.trim(), ...item.answer.split(/\r?\n/).map((line) => line.trimEnd())].join('\n'),
  );
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
  const hooks = hookSentences(board);
  if (hooks.length > 0) sections.push(['Hooks', '', hooks.join('\n\n')].join('\n'));
  const loop = loopBlock(board);
  if (loop !== '') sections.push(['Core Loop', '', loop].join('\n'));
  const questions = questionBlocks(board);
  if (questions.length > 0) {
    sections.push(['Questions', '', questions.join('\n\n')].join('\n'));
  }
  const concept = conceptBlocks(board);
  if (concept.length > 0) sections.push(['Details', '', concept.join('\n\n')].join('\n'));
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
