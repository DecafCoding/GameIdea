/**
 * Tests for the Concept chip: text only, no icon, and the drop target outline.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChipView } from './ChipView';

describe('ChipView', () => {
  it('chipView_text_rendersNoIcon', () => {
    render(<ChipView text="stolen salt" deck="resource" />);
    const chip = screen.getByTestId('chip');
    expect(chip.textContent).toBe('stolen salt');
    expect(chip.getAttribute('data-type')).toBe('resource');
    expect(chip.querySelector('[data-icon]')).toBeNull();
    expect(chip.querySelector('button')).toBeNull();
    expect(chip.getAttribute('data-targeted')).toBeNull();
  });

  it('chipView_targeted_hasOutlineAttr', () => {
    render(<ChipView text="outpost" deck="setting" targeted />);
    expect(screen.getByTestId('chip').getAttribute('data-targeted')).toBe('true');
  });
});
