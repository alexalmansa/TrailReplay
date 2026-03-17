import type { TransportMode, TransportSegment } from '@/types';
import { createId } from '@/utils/id';
import { calculateDistance } from '@/utils/journeyUtils';

const TRANSPORT_SPEEDS: Record<TransportMode, number> = {
  car: 50,
  bus: 30,
  train: 80,
  plane: 500,
  bike: 15,
  walk: 4,
  ferry: 25,
};

export function createTransportSegment(
  mode: TransportMode,
  from: { lat: number; lon: number },
  to: { lat: number; lon: number }
): TransportSegment {
  const distance = calculateDistance(from.lat, from.lon, to.lat, to.lon);
  const speed = TRANSPORT_SPEEDS[mode] || 30;
  const defaultDuration = Math.max(3000, (distance / speed) * 3600 * 1000);

  return {
    id: createId('transport'),
    type: 'transport',
    mode,
    from,
    to,
    duration: Math.min(defaultDuration, 10000),
    distance,
  };
}
