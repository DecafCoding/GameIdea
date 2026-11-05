/** Tests for PanelTitle: the shared header of the Hook Card, Core Loop, Details and Questions. */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PanelTitle } from './PanelTitle';

describe('PanelTitle', () => {
  it('panelTitle_iconAndTitle_iconWithNoCircleThenHeading', () => {
    const { container } = render(<PanelTitle icon="list" title="Details" />);
    const header = container.querySelector('header')!;
    const icon = header.querySelector('[data-icon="list"]')!;
    expect(icon.getAttribute('style')).toContain('14px');
    expect(header.querySelector('h2')!.textContent).toBe('Details');
    expect(header.children).toHaveLength(2);
  });

  it('panelTitle_children_afterTitle', () => {
    const { container } = render(
      <PanelTitle icon="hook" title="Hook">
        <span data-testid="extra">3</span>
      </PanelTitle>,
    );
    expect(container.querySelector('header')!.lastElementChild!.textContent).toBe('3');
  });
});
