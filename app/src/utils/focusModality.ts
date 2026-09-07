/**
 * Tracks whether the element that currently has focus got it from a pointer.
 *
 * Keyboard shortcuts on contested keys (Space, Enter) need this to know
 * whether the focused control meant to receive the key. It has to be recorded
 * when focus *moves*, not when the key is pressed: anything sampled during a
 * keydown has already been contaminated by that keydown. `:focus-visible`
 * fails for exactly that reason, and so would a modality flag that any
 * keypress resets.
 *
 * It is global, and installed once for the life of the page, because the
 * click that moves focus routinely happens before the component that cares
 * about it exists. That was a real bug: the tracker used to live inside the
 * cinematic panel, so clicking "Cinematic" to open that panel was itself the
 * click it could not see — leaving focus on a button it believed had been
 * tabbed to, and Enter declining to do anything at all.
 */

/** How the element that currently has focus came to have it. */
let focusedViaPointer = false;
/** How the *next* focus change will have been caused. */
let nextFocusFromPointer = false;
let installed = false;

export function installFocusModalityTracking(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('pointerdown', () => {
    nextFocusFromPointer = true;
  }, true);

  window.addEventListener('keydown', (event) => {
    // Only keys that actually move focus count as keyboard-driven focus.
    // Resetting on every key would clear the flag with the very keypress that
    // needs to read it.
    if (event.key === 'Tab') nextFocusFromPointer = false;
  }, true);

  window.addEventListener('focusin', () => {
    focusedViaPointer = nextFocusFromPointer;
  }, true);
}

export function isFocusedViaPointer(): boolean {
  return focusedViaPointer;
}
