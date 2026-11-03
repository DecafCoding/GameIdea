/**
 * Ring geometry on the 250 px card (design section 9.3), in card coordinates.
 * Builds the clip paths for the ring-half buttons and the arrow marks. The disc and the
 * rings keep their pixel size at any card size; they only sit at the card center.
 */

export const CARD_SIZE = 250;
export const CENTER = CARD_SIZE / 2;
export const RING_WIDTH = 13;
export const INNER_RADIUS = 33.5;
export const OUTER_RADIUS = 49.5;
/** Half of the 2 px split line at 12 and 6 o'clock. */
const HALF_SPLIT = 1;
/** Each arrow sits on its ring's center line: inner 91.5 and 158.5, outer 75.5 and 174.5. */
export const ARROW_X = {
  inner: [CENTER - INNER_RADIUS, CENTER + INNER_RADIUS],
  outer: [CENTER - OUTER_RADIUS, CENTER + OUTER_RADIUS],
} as const;
const ARROW_BASE = 6;
const ARROW_HEIGHT = 5.5;

export type RingSide = 'left' | 'right';

const n = (value: number) => Number(value.toFixed(3));

/** A half annulus from rIn to rOut, on one side of the split, for CSS clip-path: path(). */
export function halfAnnulusPath(rIn: number, rOut: number, side: RingSide): string {
  const yo = Math.sqrt(rOut * rOut - HALF_SPLIT * HALF_SPLIT);
  const yi = Math.sqrt(rIn * rIn - HALF_SPLIT * HALF_SPLIT);
  const x = side === 'left' ? CENTER - HALF_SPLIT : CENTER + HALF_SPLIT;
  const outerSweep = side === 'left' ? 0 : 1;
  const innerSweep = side === 'left' ? 1 : 0;
  return [
    `M ${x} ${n(CENTER - yo)}`,
    `A ${rOut} ${rOut} 0 0 ${outerSweep} ${x} ${n(CENTER + yo)}`,
    `L ${x} ${n(CENTER + yi)}`,
    `A ${rIn} ${rIn} 0 0 ${innerSweep} ${x} ${n(CENTER - yi)}`,
    'Z',
  ].join(' ');
}

/** The half annulus for a ring of the given center radius and the 13 px ring width. */
export function ringHalfPath(radius: number, side: RingSide): string {
  return halfAnnulusPath(radius - RING_WIDTH / 2, radius + RING_WIDTH / 2, side);
}

/** The down-pointing arrow triangle centered on x = cx, on the horizontal center line. */
export function arrowPath(cx: number): string {
  const top = CENTER - ARROW_HEIGHT / 2;
  return `M ${cx - ARROW_BASE / 2} ${top} L ${cx + ARROW_BASE / 2} ${top} L ${cx} ${top + ARROW_HEIGHT} Z`;
}
