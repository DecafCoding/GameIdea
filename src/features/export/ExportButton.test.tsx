/**
 * Tests for the Export button and its menu: file names, downloads, keys and outside clicks.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { combinedCard, fixtureBoard } from '@/test/fixtures/boards';
import { ExportButton } from './ExportButton';

const board = { ...fixtureBoard([combinedCard('role')]), name: 'Salvage Run' };

let downloads: string[];

beforeEach(() => {
  downloads = [];
  vi.stubGlobal(
    'URL',
    Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL: () => undefined }),
  );
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push(this.download);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderButton() {
  render(<ExportButton name={board.name} getBoard={() => board} />);
  return screen.getByRole('button', { name: 'Export' });
}

describe('ExportButton', () => {
  it('exportButton_click_opensMenuWithFileNames', () => {
    const button = renderButton();
    expect(button.getAttribute('aria-haspopup')).toBe('menu');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const menu = screen.getByRole('menu', { name: 'Export' });
    expect(menu.textContent).toContain('Salvage Run.txt');
    expect(menu.textContent).toContain('Salvage Run.gameidea.json');
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
    expect(document.activeElement).toBe(screen.getAllByRole('menuitem')[0]);
  });

  it('exportButton_captions_matchDesign', () => {
    fireEvent.click(renderButton());
    const menu = screen.getByRole('menu', { name: 'Export' });
    expect(menu.textContent).toContain(
      'Each hook on this board, then the cards and notes in plain words.',
    );
    expect(menu.textContent).toContain(
      'All data of this board. Import it again on any computer. This is your only backup.',
    );
  });

  it('exportButton_textRow_downloadsTextAndCloses', () => {
    const button = renderButton();
    fireEvent.click(button);
    fireEvent.click(screen.getByRole('menuitem', { name: /Text File/ }));
    expect(downloads).toEqual(['Salvage Run.txt']);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('exportButton_boardRow_downloadsBoardFileAndCloses', () => {
    const button = renderButton();
    fireEvent.click(button);
    fireEvent.click(screen.getByRole('menuitem', { name: /Board File/ }));
    expect(downloads).toEqual(['Salvage Run.gameidea.json']);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('exportButton_escape_closesAndFocusesButton', () => {
    const button = renderButton();
    fireEvent.click(button);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('exportButton_arrowDown_movesFocus', () => {
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    const [text, boardRow] = screen.getAllByRole('menuitem');
    const menu = screen.getByRole('menu');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(boardRow);
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(text);
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(boardRow);
  });

  it('exportButton_pointerDownOutside_closes', () => {
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
