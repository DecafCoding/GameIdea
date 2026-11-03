/**
 * DrawFlight: the draw motion (design 9.7). A fixed-position copy of the new card flies
 * from the deck button at 0.45 scale to the card's place at the current zoom, turned -3°
 * at 80 percent and settling to 0°, over --t-draw, ease-out. The real node stays hidden
 * until the copy lands. A copy outside the canvas is never clipped at the canvas edge.
 */
import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CardView } from '@/features/card';
import type { Card } from '@/shared/model';
import type { Point } from './placement';
import { CARD_SIZE } from './placement';
import styles from './DrawFlight.module.css';

export interface Flight {
  key: number;
  card: Card;
  from: DOMRect;
  /** The card's top-left on screen. */
  to: Point;
  zoom: number;
  duration: number;
}

const noop = () => {};

function FlyingCard({ flight, onDone }: { flight: Flight; onDone: (key: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const half = CARD_SIZE / 2;
  const center = { x: flight.to.x + half * flight.zoom, y: flight.to.y + half * flight.zoom };

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const dx = flight.from.left + flight.from.width / 2 - center.x;
    const dy = flight.from.top + flight.from.height / 2 - center.y;
    const end = `translate(0px, 0px) scale(${flight.zoom})`;
    const animation = element.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(0.45) rotate(0deg)` },
        { transform: `${end} rotate(-3deg)`, offset: 0.8 },
        { transform: `${end} rotate(0deg)` },
      ],
      { duration: flight.duration, easing: 'ease-out', fill: 'forwards' },
    );
    let live = true;
    animation.finished.then(
      () => live && onDone(flight.key),
      () => live && onDone(flight.key),
    );
    return () => {
      live = false;
      animation.cancel();
    };
    // The flight is fixed once it starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      className={styles.flight}
      style={{ left: center.x - half, top: center.y - half }}
      aria-hidden="true"
      data-testid="draw-flight"
    >
      <CardView card={flight.card} onTurn={noop} />
    </div>
  );
}

export function DrawFlight({
  flights,
  onDone,
}: {
  flights: Flight[];
  onDone: (key: number) => void;
}) {
  if (flights.length === 0) return null;
  return createPortal(
    flights.map((flight) => <FlyingCard key={flight.key} flight={flight} onDone={onDone} />),
    document.body,
  );
}
