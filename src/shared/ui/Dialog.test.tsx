/**
 * Tests for the dialog shell and the danger button.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { Dialog } from './Dialog';

describe('Dialog', () => {
  it('dialog_open_showsTitleAndActions', () => {
    render(
      <Dialog
        open
        title='Delete "Drift"?'
        onClose={() => undefined}
        actions={<Button variant="secondary">Cancel</Button>}
      >
        <p>Body text.</p>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Delete "Drift"?' });
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(screen.getByText('Body text.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('dialog_cancelEvent_callsOnClose', () => {
    const onClose = vi.fn();
    render(
      <Dialog open title="Title" onClose={onClose} actions={null}>
        Body
      </Dialog>,
    );
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('dialog_wide_hasWideClassAndCaption', () => {
    render(
      <Dialog
        open
        size="wide"
        title="New Board"
        caption="A caption."
        onClose={() => undefined}
        actions={null}
      >
        Body
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'New Board' }).className).toMatch(/wide/);
    expect(screen.getByText('A caption.')).toBeTruthy();
  });

  it('dialog_default_noWideClass', () => {
    render(
      <Dialog open title="Title" onClose={() => undefined} actions={null}>
        Body
      </Dialog>,
    );
    expect(screen.getByRole('dialog').className).not.toMatch(/wide/);
  });

  it('dialog_dataAutofocus_focusedAtOpen', () => {
    render(
      <Dialog open title="Title" onClose={() => undefined} actions={null}>
        <input aria-label="Field" data-autofocus />
      </Dialog>,
    );
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Field' }));
  });

  it('dialog_showClose_closeButtonCallsOnClose', () => {
    const onClose = vi.fn();
    render(
      <Dialog open showClose title="Genres" onClose={onClose} actions={null}>
        Body
      </Dialog>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('dialog_noShowClose_noCloseButton', () => {
    render(
      <Dialog open title="Title" onClose={() => undefined} actions={null}>
        Body
      </Dialog>,
    );
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });

  it('dialog_footerNote_rendersBesideActions', () => {
    render(
      <Dialog
        open
        title="Genres"
        footerNote="Each deck keeps at least 1 genre."
        onClose={() => undefined}
        actions={<Button variant="primary">Done</Button>}
      >
        Body
      </Dialog>,
    );
    const note = screen.getByText('Each deck keeps at least 1 genre.');
    expect(note.parentElement).toBe(screen.getByRole('button', { name: 'Done' }).parentElement);
  });

  it('dialog_tabs_renderBetweenTitleAndCaption', () => {
    render(
      <Dialog
        open
        size="settings"
        title="Settings"
        caption="A scope line."
        tabs={<div role="tablist" aria-label="Tabs" />}
        onClose={() => undefined}
        actions={null}
      >
        Body
      </Dialog>,
    );
    const heading = screen.getByRole('heading', { name: 'Settings' });
    const tablist = screen.getByRole('tablist');
    const caption = screen.getByText('A scope line.');
    expect(
      heading.compareDocumentPosition(tablist) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      tablist.compareDocumentPosition(caption) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('dialog_noTabs_rendersAsBefore', () => {
    render(
      <Dialog open title="Title" caption="A caption." onClose={() => undefined} actions={null}>
        Body
      </Dialog>,
    );
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByText('A caption.')).toBeTruthy();
  });

  it('button_danger_hasDangerClass', () => {
    render(<Button variant="danger">Delete Board</Button>);
    expect(screen.getByRole('button', { name: 'Delete Board' }).className).toMatch(/danger/);
  });
});
