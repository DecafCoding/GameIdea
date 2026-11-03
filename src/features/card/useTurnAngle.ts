/**
 * useTurnAngle: follows a ring's activeIndex and keeps a cumulative clockwise angle,
 * a turn counter and the last turn direction for the turn animation.
 * It derives the new values during render (no effect), so the active style and the
 * rotation start in the same frame, and 4 turns one way keep spinning the same way.
 */
import { useState } from 'react';
import type { TurnDirection } from './rings';

export interface TurnState {
  /** Clockwise degrees for the cue layer. At rest the active cue is on the bottom edge. */
  angle: number;
  /** How many turns this ring has made since mount; a key for remounting turned words. */
  turns: number;
  direction: TurnDirection;
}

interface Tracked extends TurnState {
  index: number;
}

/**
 * @param lastDirection the direction of the last click; used on a 2-cue ring, where
 *   both directions give the same activeIndex.
 */
export function useTurnAngle(
  activeIndex: number,
  count: number,
  lastDirection: TurnDirection = 'cw',
): TurnState {
  const step = count === 2 ? 180 : 360 / Math.max(count, 1);
  const [tracked, setTracked] = useState<Tracked>({
    index: activeIndex,
    angle: -activeIndex * step,
    turns: 0,
    direction: 'cw',
  });

  if (tracked.index === activeIndex) return tracked;

  let direction: TurnDirection | null;
  if (count === 2) direction = lastDirection;
  else if (activeIndex === (tracked.index - 1 + count) % count) direction = 'cw';
  else if (activeIndex === (tracked.index + 1) % count) direction = 'ccw';
  else direction = null;

  const next: Tracked = {
    index: activeIndex,
    // A jump of more than one step (not a turn) snaps to the resting angle.
    angle:
      direction === null
        ? -activeIndex * step
        : tracked.angle + (direction === 'cw' ? step : -step),
    turns: tracked.turns + 1,
    direction: direction ?? 'cw',
  };
  setTracked(next);
  return next;
}
