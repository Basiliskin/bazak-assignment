import '@testing-library/jest-dom/vitest';

// jsdom has <dialog> but not its modal API — minimal stand-in so Modal can open/close in tests.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.removeAttribute('open');
};
