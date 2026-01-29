import type { UnitSystem } from '@/types';

// Distance conversions
export function metersToKilometers(meters: number): number {
  return meters / 1000;
}

export function metersToMiles(meters: number): number {
  return meters / 1609.344;
}

export function kilometersToMiles(km: number): number {
  return km * 0.621371;
}

export function milesToKilometers(miles: number): number {
  return miles * 1.609344;
}

// Speed conversions
export function kmhToMph(kmh: number): number {
  return kmh * 0.621371;
}

export function mphToKmh(mph: number): number {
  return mph * 1.609344;
}

// Elevation conversions
export function metersToFeet(meters: number): number {
  return meters * 3.28084;
}

export function feetToMeters(feet: number): number {
  return feet / 3.28084;
}

// Format distance
export function formatDistance(meters: number, unitSystem: UnitSystem): string {
  if (unitSystem === 'metric') {
    const km = metersToKilometers(meters);
    if (km >= 10) {
      return `${km.toFixed(1)} km`;
    } else if (km >= 1) {
      return `${km.toFixed(2)} km`;
    } else {
      return `${Math.round(meters)} m`;
    }
  } else {
    const miles = metersToMiles(meters);
    if (miles >= 1) {
      return `${miles.toFixed(2)} mi`;
    } else {
      const feet = metersToFeet(meters);
      return `${Math.round(feet)} ft`;
    }
  }
}

// Format speed
export function formatSpeed(mps: number, unitSystem: UnitSystem): string {
  if (unitSystem === 'metric') {
    const kmh = mps * 3.6;
    return `${kmh.toFixed(1)} km/h`;
  } else {
    const mph = kmhToMph(mps * 3.6);
    return `${mph.toFixed(1)} mph`;
  }
}

// Format pace (min/km or min/mile)
export function formatPace(mps: number, unitSystem: UnitSystem): string {
  if (mps <= 0) return '--:--';
  
  const speedKmh = mps * 3.6;
  
  if (unitSystem === 'metric') {
    const paceMinPerKm = 60 / speedKmh;
    const minutes = Math.floor(paceMinPerKm);
    const seconds = Math.round((paceMinPerKm - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
  } else {
    const speedMph = kmhToMph(speedKmh);
    const paceMinPerMile = 60 / speedMph;
    const minutes = Math.floor(paceMinPerMile);
    const seconds = Math.round((paceMinPerMile - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')} /mi`;
  }
}

// Format elevation
export function formatElevation(meters: number, unitSystem: UnitSystem): string {
  if (unitSystem === 'metric') {
    return `${Math.round(meters)} m`;
  } else {
    const feet = metersToFeet(meters);
    return `${Math.round(feet)} ft`;
  }
}

// Format duration
export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

// Format time
export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Get unit labels
export function getUnitLabels(unitSystem: UnitSystem) {
  return {
    distance: unitSystem === 'metric' ? 'km' : 'mi',
    speed: unitSystem === 'metric' ? 'km/h' : 'mph',
    pace: unitSystem === 'metric' ? '/km' : '/mi',
    elevation: unitSystem === 'metric' ? 'm' : 'ft',
  };
}

// Convert value based on unit system
export function convertDistance(meters: number, unitSystem: UnitSystem): number {
  return unitSystem === 'metric' ? metersToKilometers(meters) : metersToMiles(meters);
}

export function convertSpeed(mps: number, unitSystem: UnitSystem): number {
  return unitSystem === 'metric' ? mps * 3.6 : kmhToMph(mps * 3.6);
}

export function convertElevation(meters: number, unitSystem: UnitSystem): number {
  return unitSystem === 'metric' ? meters : metersToFeet(meters);
}
