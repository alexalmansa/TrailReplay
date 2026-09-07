import { useEffect } from 'react';
import { shouldHandleSpaceAsPlayPause } from '@/utils/keyboardShortcuts';
import { isFocusedViaPointer } from '@/utils/focusModality';
import { usePlaybackToggle } from '@/hooks/usePlaybackToggle';

/**
 * Space toggles playback from anywhere on the page.
 *
 * Mounted alongside the playback bar, which only exists once a route is
 * loaded — so the shortcut is live exactly when there is something to play,
 * and goes away with it. Whether the key is ours rather than the focused
 * control's comes down to how that control got focus; see
 * `focusModality`.
 */
export function usePlayPauseShortcut() {
  const togglePlayback = usePlaybackToggle();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!shouldHandleSpaceAsPlayPause(event, { focusedViaPointer: isFocusedViaPointer() })) return;

      // Space scrolls the page by default, which is never what someone
      // pressing it over a replay wants.
      event.preventDefault();
      togglePlayback('keyboard_shortcut');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayback]);
}
