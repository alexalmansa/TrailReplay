import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getStatAvailability, isStatAvailable } from '@/utils/statAvailability';

/**
 * The stats the loaded routes can actually answer, so nothing downstream has
 * to re-derive which of them depend on data the files may not carry.
 */
export function useAvailableStats() {
  const tracks = useAppStore((state) => state.tracks);
  const configuredStats = useAppStore((state) => state.settings.visibleStats);

  const availability = useMemo(() => getStatAvailability(tracks), [tracks]);
  const visibleStats = useMemo(
    () => configuredStats.filter((id) => isStatAvailable(id, availability)),
    [availability, configuredStats]
  );

  return { availability, visibleStats };
}
