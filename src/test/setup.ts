/**
 * Vitest setup: unmounts React Testing Library renders after each test, and stubs
 * HTMLDialogElement.showModal and close, which jsdom does not implement.
 */
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

if (typeof HTMLDialogElement !== 'undefined') {
  const proto = HTMLDialogElement.prototype;
  if (typeof proto.showModal !== 'function') {
    proto.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
  }
  if (typeof proto.close !== 'function') {
    proto.close = function close(this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
  }
}

afterEach(() => {
  cleanup();
});
