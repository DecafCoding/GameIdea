/**
 * ZoomStrip: bottom right of the canvas (design section 8): zoom out, the percent (which
 * resets to 100 percent), zoom in, and Fit. Zoom stays between 25 and 200 percent.
 */
import { useReactFlow, useViewport } from '@xyflow/react';
import styles from './ZoomStrip.module.css';

export function ZoomStrip() {
  const { zoom } = useViewport();
  const flow = useReactFlow();
  return (
    <div className={styles.strip} data-testid="zoom-strip">
      <button
        type="button"
        className={styles.button}
        aria-label="Zoom Out"
        onClick={() => void flow.zoomOut()}
      >
        −
      </button>
      <button
        type="button"
        className={`${styles.button} ${styles.percent}`}
        aria-label="Reset Zoom"
        onClick={() => void flow.zoomTo(1)}
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        className={styles.button}
        aria-label="Zoom In"
        onClick={() => void flow.zoomIn()}
      >
        +
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={() => void flow.fitView({ padding: 0.2, maxZoom: 1 })}
      >
        Fit
      </button>
    </div>
  );
}
