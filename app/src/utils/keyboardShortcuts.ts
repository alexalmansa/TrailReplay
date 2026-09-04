/**
 * Whether a keypress belongs to an app-wide shortcut or to whatever the user
 * is currently focused on.
 *
 * Space and Enter are the obvious keys for "play" and "confirm" and also the
 * most contested ones on a web page: they scroll, they activate the focused
 * control, and they type. Deciding when they are ours is the whole problem,
 * so it lives here as predicates rather than buried in event handlers.
 */

const TEXT_ENTRY_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** Controls that act on Space or Enter themselves. */
const NATIVE_ACTIVATION_TAGS = new Set(['BUTTON', 'A', 'SUMMARY']);

export interface ShortcutContext {
  /**
   * Whether the focused element got focus from a pointer rather than the
   * keyboard.
   *
   * This decides who owns the key when a control has focus. Tab to a button
   * and press Space or Enter and you mean to press *that button* — taking the
   * key would break keyboard navigation. Click the same button with a mouse
   * and it keeps focus as a side effect nobody asked for, and the key
   * afterwards means the app-wide action, not "press that again".
   *
   * It has to be tracked separately rather than read off `:focus-visible`,
   * which looks like the obvious answer and is not: pressing a key promotes
   * the focused element to focus-visible, so by the time a keydown handler
   * asks, the answer is always yes. Measured in a real browser — a button
   * reported `:focus-visible: false` right up until the keypress that needed
   * to know.
   */
  focusedViaPointer: boolean;
}

interface ShortcutEvent {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  target: EventTarget | null;
}

/** Whether the event landed somewhere the user is entering text. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return TEXT_ENTRY_TAGS.has(target.tagName) || target.isContentEditable;
}

function claimsKeyFromFocusedControl(event: ShortcutEvent, context: ShortcutContext): boolean {
  // Modified keys belong to the browser and the OS — Shift+Space pages up,
  // and Ctrl/Cmd/Alt combinations are shortcuts we have no business taking.
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false;

  const target = event.target;
  if (!(target instanceof HTMLElement)) return true;

  if (isTypingTarget(target)) return false;

  const activatesOnKey =
    NATIVE_ACTIVATION_TAGS.has(target.tagName) || target.getAttribute('role') === 'button';
  return !(activatesOnKey && !context.focusedViaPointer);
}

export function shouldHandleSpaceAsPlayPause(
  event: ShortcutEvent,
  context: ShortcutContext,
): boolean {
  // ' ' is the modern name; 'Spacebar' is IE/legacy Edge.
  if (event.key !== ' ' && event.key !== 'Spacebar') return false;
  return claimsKeyFromFocusedControl(event, context);
}

/**
 * Whether Enter should be taken as "do the thing this panel is for" — in
 * cinematic mode, saving the shot the ball is currently showing.
 */
export function shouldHandleEnterAsPrimaryAction(
  event: ShortcutEvent,
  context: ShortcutContext,
): boolean {
  if (event.key !== 'Enter') return false;
  return claimsKeyFromFocusedControl(event, context);
}
