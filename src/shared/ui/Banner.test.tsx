/**
 * Tests for the banner icon: alert-circle by default, a named icon on request, none on status.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Banner } from './Banner';

const noop = () => undefined;

describe('Banner', () => {
  it('banner_warningDefault_showsAlertIcon', () => {
    const { container } = render(
      <Banner kind="warning" text="Oops." actionLabel="Retry" onAction={noop} />,
    );
    expect(container.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('alert-circle');
  });

  it('banner_warningWithIcon_showsThatIcon', () => {
    const { container } = render(
      <Banner kind="warning" icon="file-x" text="Bad." actionLabel="Retry" onAction={noop} />,
    );
    expect(container.querySelector('[data-icon]')?.getAttribute('data-icon')).toBe('file-x');
  });

  it('banner_status_hasNoIcon', () => {
    const { container } = render(
      <Banner kind="status" text="Changed." actionLabel="Reload" onAction={noop} />,
    );
    expect(container.querySelector('[data-icon]')).toBeNull();
  });
});
