/**
 * Tests for the name-only New Board dialog: Make Board stays disabled until the trimmed name
 * has text, Enter and Make Board pass the trimmed name, Cancel and Esc make nothing.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NEW_BOARD_HELP_TEXT, NewBoardDialog } from './NewBoardDialog';

function renderDialog() {
  const onCancel = vi.fn();
  const onCreate = vi.fn();
  render(<NewBoardDialog open onCancel={onCancel} onCreate={onCreate} />);
  return { onCancel, onCreate };
}

const nameField = () => screen.getByRole('textbox', { name: 'Name' });
const makeBoard = () => screen.getByRole('button', { name: 'Make Board' });

describe('NewBoardDialog', () => {
  it('newBoardDialog_open_showsTitleNameFieldAndHelpLine', () => {
    renderDialog();
    expect(screen.getByRole('dialog', { name: 'New Board' })).toBeTruthy();
    expect((nameField() as HTMLInputElement).value).toBe('');
    expect(screen.getByText(NEW_BOARD_HELP_TEXT)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('newBoardDialog_emptyOrSpacesName_makeBoardDisabled', () => {
    renderDialog();
    expect((makeBoard() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(nameField(), { target: { value: '   ' } });
    expect((makeBoard() as HTMLButtonElement).disabled).toBe(true);
  });

  it('newBoardDialog_nameThenMakeBoard_passesTrimmedName', () => {
    const { onCreate } = renderDialog();
    fireEvent.change(nameField(), { target: { value: '  Salvage Run  ' } });
    expect((makeBoard() as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(makeBoard());
    expect(onCreate).toHaveBeenCalledWith('Salvage Run');
  });

  it('newBoardDialog_enterInNameField_submits', () => {
    const { onCreate } = renderDialog();
    fireEvent.change(nameField(), { target: { value: 'Drift' } });
    fireEvent.submit(nameField().closest('form')!);
    expect(onCreate).toHaveBeenCalledWith('Drift');
  });

  it('newBoardDialog_enterWithSpacesOnly_makesNothing', () => {
    const { onCreate } = renderDialog();
    fireEvent.change(nameField(), { target: { value: '  ' } });
    fireEvent.submit(nameField().closest('form')!);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('newBoardDialog_cancelOrEsc_callsOnCancel', () => {
    const { onCancel, onCreate } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent(screen.getByRole('dialog'), new Event('cancel'));
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onCreate).not.toHaveBeenCalled();
  });
});
