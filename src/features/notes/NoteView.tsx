/**
 * NoteView: one note (design 9.6). A header band with the title over a white body with the
 * text. A click starts editing (in the title field when the click was on the title). Edit
 * mode holds a local draft of both fields that commits once when editing ends (Esc, or
 * focus leaves both fields), a trash button and a resize handle that commits on release.
 * No React Flow here: the canvas passes its no-drag class names through interactiveClassName.
 */
import {
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import type { Note } from '@/shared/model';
import { Icon } from '@/shared/ui';
import { clampNoteSize } from './noteActions';
import styles from './NoteView.module.css';

interface NoteViewProps {
  note: Note;
  editing: boolean;
  onStartEdit: () => void;
  onEndEdit: (content: { title: string; text: string }) => void;
  onResize: (width: number, height: number) => void;
  onDelete: () => void;
  /** Extra class names for the textarea, the handle and the trash button. */
  interactiveClassName?: string;
}

interface ResizeDrag {
  pointerId: number;
  startX: number;
  startY: number;
  width: number;
  height: number;
}

const keepFocus = (event: { preventDefault: () => void }) => event.preventDefault();

export function NoteView({
  note,
  editing,
  onStartEdit,
  onEndEdit,
  onResize,
  onDelete,
  interactiveClassName = '',
}: NoteViewProps) {
  const [live, setLive] = useState<{ width: number; height: number } | null>(null);
  const resize = useRef<ResizeDrag | null>(null);
  const [focusTitle, setFocusTitle] = useState(false);
  const size = live ?? { width: note.width, height: note.height };

  function onHandleDown(event: PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    resize.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: note.width,
      height: note.height,
    };
    setLive({ width: note.width, height: note.height });
  }

  function sizeAt(event: PointerEvent<HTMLButtonElement>) {
    const drag = resize.current!;
    return clampNoteSize(
      drag.width + event.clientX - drag.startX,
      drag.height + event.clientY - drag.startY,
    );
  }

  function onHandleMove(event: PointerEvent<HTMLButtonElement>) {
    if (resize.current?.pointerId !== event.pointerId) return;
    setLive(sizeAt(event));
  }

  function onHandleUp(event: PointerEvent<HTMLButtonElement>) {
    if (resize.current?.pointerId !== event.pointerId) return;
    const next = sizeAt(event);
    resize.current = null;
    setLive(null);
    onResize(next.width, next.height);
  }

  function startEdit(event: MouseEvent<HTMLDivElement>) {
    setFocusTitle(event.target instanceof Element && !!event.target.closest('[data-note-title]'));
    onStartEdit();
  }

  return (
    <div
      className={`${styles.note} ${editing ? styles.editing : ''}`}
      style={{ width: size.width, height: size.height }}
      data-testid="note"
      data-note-id={note.id}
      onClick={editing ? undefined : startEdit}
    >
      {editing ? (
        <>
          <NoteEditor
            note={note}
            focusTitle={focusTitle}
            onEnd={onEndEdit}
            interactiveClassName={interactiveClassName}
          />
          <button
            type="button"
            className={`${styles.trash} ${interactiveClassName}`}
            aria-label="Delete Note"
            onMouseDown={keepFocus}
            onClick={onDelete}
          >
            <span className={styles.trashFace}>
              <Icon name="trash" size={16} />
            </span>
          </button>
          <button
            type="button"
            className={`${styles.handle} ${interactiveClassName}`}
            aria-label="Resize Note"
            data-testid="note-resize"
            onMouseDown={keepFocus}
            onPointerDown={onHandleDown}
            onPointerMove={onHandleMove}
            onPointerUp={onHandleUp}
            onPointerCancel={onHandleUp}
          />
        </>
      ) : (
        <>
          <div className={styles.header}>
            <span className={styles.title} data-note-title="">
              {note.title}
            </span>
          </div>
          <div className={styles.body}>
            <p className={styles.text}>{note.text}</p>
          </div>
        </>
      )}
    </div>
  );
}

interface NoteEditorProps {
  note: Note;
  /** Focus the title field first, not the text. */
  focusTitle: boolean;
  onEnd: (content: { title: string; text: string }) => void;
  interactiveClassName: string;
}

/**
 * The title field and the textarea with one draft. Ends once, on Esc or when focus leaves
 * both fields, whichever comes first. Enter in the title moves to the text.
 */
function NoteEditor({ note, focusTitle, onEnd, interactiveClassName }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [text, setText] = useState(note.text);
  const titleRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const ended = useRef(false);

  function end() {
    if (ended.current) return;
    ended.current = true;
    onEnd({ title, text });
  }

  function onBlur(event: FocusEvent) {
    const next = event.relatedTarget;
    if (next && (next === titleRef.current || next === textRef.current)) return;
    end();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      end();
    } else if (event.key === 'Enter' && event.currentTarget === titleRef.current) {
      event.preventDefault();
      textRef.current?.focus();
    }
  }

  return (
    <>
      <div className={styles.header}>
        <input
          ref={titleRef}
          className={`${styles.title} ${styles.input} ${interactiveClassName}`}
          aria-label="Note Title"
          value={title}
          autoFocus={focusTitle}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
        />
      </div>
      <div className={styles.body}>
        <textarea
          ref={textRef}
          className={`${styles.text} ${styles.input} ${interactiveClassName}`}
          aria-label="Note Text"
          value={text}
          autoFocus={!focusTitle}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
        />
      </div>
    </>
  );
}
