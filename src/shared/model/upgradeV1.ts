/**
 * The board format step from version 1 to version 2: every board saved before One-Pager
 * boards existed becomes a Free Form board, and every card gets inConcept: false. It never
 * sets conceptWidth. Dexie schema version 2 (shared/storage/db.ts) runs it on each saved
 * record and UPGRADES[1] (features/export/upgrade.ts) runs it on each board file, so the 2
 * paths cannot drift. It lives in shared/model because both can reach it.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A new version 2 record from a version 1 record. Never mutates its input. A cards value
 * that is not an array, or a card that is not a plain object, is left as it is for the
 * Zod check to reject.
 */
export function upgradeBoardV1(record: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...record, formatVersion: 2, kind: 'free' };
  if (Array.isArray(record.cards)) {
    next.cards = record.cards.map((card: unknown) =>
      isPlainObject(card) ? { ...card, inConcept: false } : card,
    );
  }
  return next;
}
