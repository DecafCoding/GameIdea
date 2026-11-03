/**
 * New ids for boards, cards and notes: a random version 4 UUID.
 * crypto.randomUUID exists only in a secure context (localhost or HTTPS). Over plain HTTP on
 * the local network it is missing, so the same UUID shape is built from crypto.getRandomValues,
 * which every context has.
 */

/** Builds a version 4 UUID from 16 random bytes. */
export function uuidFromBytes(bytes: Uint8Array): string {
  if (bytes.length !== 16) throw new Error('A UUID needs 16 bytes.');
  const b = Uint8Array.from(bytes);
  b[6] = (b[6]! & 0x0f) | 0x40; // version 4
  b[8] = (b[8]! & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(b, (n) => n.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Returns a new random id. */
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return uuidFromBytes(crypto.getRandomValues(new Uint8Array(16)));
}
