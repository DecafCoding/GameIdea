/**
 * NoteNode: one note as a React Flow node. Editing state lives in the canvas UI
 * state; title and text commit once when editing ends, and only when it changed.
 */
import type { NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { deleteNote, NoteView, resizeNote, setNoteContent } from '@/features/notes';
import { useBoardStore } from '@/shared/store';
import { useCanvasUi } from './CanvasProvider';
import type { NoteFlowNode } from './nodes';

function NoteNodeView({ data }: NodeProps<NoteFlowNode>) {
  const note = useBoardStore((state) => state.board.notes.find((n) => n.id === data.noteId));
  const changeBoard = useBoardStore((state) => state.changeBoard);
  const { editingNoteId, setEditingNoteId } = useCanvasUi();
  if (!note) return null;
  const id = note.id;

  return (
    <NoteView
      note={note}
      editing={editingNoteId === id}
      onStartEdit={() => setEditingNoteId(id)}
      onEndEdit={(content) => {
        if (content.title !== note.title || content.text !== note.text) {
          changeBoard((board) => setNoteContent(board, id, content));
        }
        setEditingNoteId((current) => (current === id ? null : current));
      }}
      onResize={(width, height) => changeBoard((board) => resizeNote(board, id, width, height))}
      onDelete={() => {
        setEditingNoteId(null);
        changeBoard((board) => deleteNote(board, id));
      }}
      interactiveClassName="nodrag nowheel"
    />
  );
}

export const NoteNode = memo(NoteNodeView);
