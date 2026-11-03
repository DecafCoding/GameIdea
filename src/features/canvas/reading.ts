/**
 * Reading a board: the On Top Modifier of a base card, the words a card reads as on the
 * board, with its On Top adjective first ("tall frozen pilot"), and a Hook Card's stack in
 * reading order, and every Hook Card's sentence on a board. The sentence builder, the
 * connector badges, the text file and the board list read cards through this file.
 */
import { activeText } from '@/features/card';
import { buildHookSentence, type StackEntry } from '@/features/hook';
import type { Board, Card } from '@/shared/model';
import { connectorFor } from './connector';
import { isRoot, stackOrder } from './stack';

/** The Modifier on top of the base card, or null. */
export function onTopCardOf(board: Board, baseId: string): Card | null {
  return board.cards.find((card) => card.onTopOf === baseId) ?? null;
}

/**
 * True when the card sits on top of a card on the board. Such a card has no place and no
 * canvas node of its own: it reads as part of its base card. A card whose onTopOf names no
 * card shows as a free card.
 */
export function isOnTop(board: Board, card: Card): boolean {
  return card.onTopOf !== null && board.cards.some((c) => c.id === card.onTopOf);
}

/** The card's words on the board: On Top adjective, merged adjective, noun. */
export function cardText(board: Board, card: Card): string {
  return activeText(card, onTopCardOf(board, card.id)?.rings[0]);
}

/**
 * A Hook Card's stack in reading order, for the sentence builder: every card under it in
 * stack order, each with the connector word shown on the seam above it (the card just
 * before it in stack order), so the sentence always matches the badges.
 */
export function stackEntries(board: Board, hookId: string): StackEntry[] {
  const order = stackOrder(board, hookId);
  const entries: StackEntry[] = [];
  order.forEach((card, i) => {
    const prev = order[i - 1];
    if (!prev || card.type === 'hook') return;
    const text = cardText(board, card);
    const connector = connectorFor(prev.type, {
      type: card.type,
      text,
      saved: card.connector ?? null,
    });
    entries.push({ type: card.type, connector: connector?.text ?? null, activeText: text });
  });
  return entries;
}

/**
 * Every Hook Card's sentence, in reading order: Hook Cards that are stack roots, top to
 * bottom, then left to right (the text file's root order). An empty Hook Card has no
 * sentence and is left out. Filtering on isRoot keeps a malformed import from listing a
 * stack twice.
 */
export function hookSentences(board: Board): string[] {
  return board.cards
    .filter((card) => card.type === 'hook' && isRoot(board, card.id))
    .sort((a, b) => a.y - b.y || a.x - b.x || a.z - b.z)
    .map((hook) => buildHookSentence(stackEntries(board, hook.id)))
    .filter((sentence) => sentence !== '');
}
