/**
 * Tests for NoteView: start editing, end with the draft, and delete.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fixtureNote } from '@/test/fixtures/boards';
import { NoteView } from './NoteView';

function setup(editing: boolean) {
  const handlers = {
    onStartEdit: vi.fn(),
    onEndEdit: vi.fn(),
    onResize: vi.fn(),
    onDelete: vi.fn(),
  };
  render(
    <NoteView
      note={fixtureNote({ title: 'Logline', text: 'A ship' })}
      editing={editing}
      {...handlers}
    />,
  );
  return handlers;
}

describe('NoteView', () => {
  it('noteView_click_startsEdit', () => {
    const { onStartEdit } = setup(false);
    expect(screen.getByText('Logline')).toBeTruthy();
    fireEvent.click(screen.getByText('A ship'));
    expect(onStartEdit).toHaveBeenCalledOnce();
  });

  it('noteView_escape_endsEditWithDraft', () => {
    const { onEndEdit } = setup(true);
    const field = screen.getByRole('textbox', { name: 'Note Text' });
    fireEvent.change(field, { target: { value: 'A ship adrift' } });
    fireEvent.keyDown(field, { key: 'Escape' });
    fireEvent.blur(field);
    expect(onEndEdit).toHaveBeenCalledOnce();
    expect(onEndEdit).toHaveBeenCalledWith({ title: 'Logline', text: 'A ship adrift' });
  });

  it('noteView_focusMovesBetweenFields_staysEditing', () => {
    const { onEndEdit } = setup(true);
    const title = screen.getByRole('textbox', { name: 'Note Title' });
    const text = screen.getByRole('textbox', { name: 'Note Text' });
    fireEvent.change(title, { target: { value: 'Premise' } });
    fireEvent.blur(title, { relatedTarget: text });
    expect(onEndEdit).not.toHaveBeenCalled();
    fireEvent.blur(text);
    expect(onEndEdit).toHaveBeenCalledWith({ title: 'Premise', text: 'A ship' });
  });

  it('noteView_trash_callsDelete', () => {
    const { onDelete } = setup(true);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Note' }));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
