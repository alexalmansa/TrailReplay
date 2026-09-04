import { describe, expect, it, afterEach } from 'vitest';
import { shouldHandleSpaceAsPlayPause } from './keyboardShortcuts';

function spaceOn(
  target: EventTarget | null,
  { focusedViaPointer = false, ...overrides }: Partial<KeyboardEvent> & { focusedViaPointer?: boolean } = {},
) {
  return shouldHandleSpaceAsPlayPause(
    {
      key: ' ',
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      target,
      ...overrides,
    },
    { focusedViaPointer },
  );
}

function mount<T extends HTMLElement>(element: T): T {
  document.body.appendChild(element);
  return element;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('shouldHandleSpaceAsPlayPause', () => {
  it('claims a bare space pressed on the page', () => {
    expect(spaceOn(mount(document.createElement('div')))).toBe(true);
    expect(spaceOn(document.body)).toBe(true);
    expect(spaceOn(null)).toBe(true);
  });

  it('accepts the legacy key name', () => {
    expect(spaceOn(document.body, { key: 'Spacebar' })).toBe(true);
  });

  it('ignores every other key', () => {
    for (const key of ['a', 'Enter', 'ArrowRight', 'Escape', 'w']) {
      expect(spaceOn(document.body, { key })).toBe(false);
    }
  });

  it('leaves modified space to the browser and the OS', () => {
    // Shift+Space pages up; the rest are application and system shortcuts.
    expect(spaceOn(document.body, { shiftKey: true })).toBe(false);
    expect(spaceOn(document.body, { ctrlKey: true })).toBe(false);
    expect(spaceOn(document.body, { metaKey: true })).toBe(false);
    expect(spaceOn(document.body, { altKey: true })).toBe(false);
  });

  it('never steals a space that is being typed', () => {
    // Regardless of how the field got focus — clicking into a text box and
    // typing a space is still typing a space.
    for (const focusedViaPointer of [true, false]) {
      expect(spaceOn(mount(document.createElement('input')), { focusedViaPointer })).toBe(false);
      expect(spaceOn(mount(document.createElement('textarea')), { focusedViaPointer })).toBe(false);
      expect(spaceOn(mount(document.createElement('select')), { focusedViaPointer })).toBe(false);

      const editable = mount(document.createElement('div'));
      // jsdom does not derive isContentEditable from the attribute.
      Object.defineProperty(editable, 'isContentEditable', { value: true });
      expect(spaceOn(editable, { focusedViaPointer })).toBe(false);
    }
  });

  it('leaves a keyboard-focused button alone, so tabbing to it still works', () => {
    // Tab to a button and press space and you mean to press that button.
    expect(spaceOn(mount(document.createElement('button')))).toBe(false);

    const link = mount(document.createElement('a'));
    link.href = '#';
    expect(spaceOn(link)).toBe(false);

    const summary = mount(document.createElement('summary'));
    expect(spaceOn(summary)).toBe(false);

    const custom = mount(document.createElement('div'));
    custom.setAttribute('role', 'button');
    custom.tabIndex = 0;
    expect(spaceOn(custom)).toBe(false);
  });

  it('claims space for playback when a button only has focus from a mouse click', () => {
    // The case that matters in practice: click "Set camera keyframe", then
    // press space expecting the replay to start. A mouse click leaves focus
    // behind as a side effect nobody asked for, and re-firing that button is
    // not what anyone meant.
    expect(spaceOn(mount(document.createElement('button')), { focusedViaPointer: true })).toBe(true);

    const custom = mount(document.createElement('div'));
    custom.setAttribute('role', 'button');
    expect(spaceOn(custom, { focusedViaPointer: true })).toBe(true);
  });
});
