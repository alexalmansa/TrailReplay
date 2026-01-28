const STORAGE_KEY = 'trailReplayUnits';
const KM_TO_MI = 0.621371;
const M_TO_FT = 3.28084;

export function getUnitPreference() {
    if (typeof localStorage === 'undefined') return 'metric';
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'imperial' ? 'imperial' : 'metric';
}

export function setUnitPreference(unit) {
    if (typeof localStorage === 'undefined') return;
    const normalized = unit === 'imperial' ? 'imperial' : 'metric';
    localStorage.setItem(STORAGE_KEY, normalized);
}

export function getUnitLabels(unit = getUnitPreference()) {
    if (unit === 'imperial') {
        return {
            distance: 'mi',
            speed: 'mph',
            pace: 'min/mi',
            elevation: 'ft'
        };
    }
    return {
        distance: 'km',
        speed: 'km/h',
        pace: 'min/km',
        elevation: 'm'
    };
}

export function convertDistance(km, unit = getUnitPreference()) {
    if (unit === 'imperial') {
        return km * KM_TO_MI;
    }
    return km;
}

export function convertSpeed(kmh, unit = getUnitPreference()) {
    if (unit === 'imperial') {
        return kmh * KM_TO_MI;
    }
    return kmh;
}

export function formatDistance(distanceKm, unit = getUnitPreference(), { decimals = 2 } = {}) {
    if (!distanceKm || distanceKm === 0) {
        const label = getUnitLabels(unit).distance;
        return `0 ${label}`;
    }

    if (unit === 'imperial') {
        const miles = distanceKm * KM_TO_MI;
        return `${miles.toFixed(decimals)} ${getUnitLabels(unit).distance}`;
    }

    if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)} m`;
    }
    return `${distanceKm.toFixed(decimals)} km`;
}

export function formatSpeed(speedKmh, unit = getUnitPreference()) {
    if (!speedKmh || speedKmh === 0) return `0 ${getUnitLabels(unit).speed}`;
    const value = convertSpeed(speedKmh, unit);
    return `${value.toFixed(1)} ${getUnitLabels(unit).speed}`;
}

export function formatPaceFromSpeed(speedKmh, unit = getUnitPreference()) {
    if (!speedKmh || speedKmh === 0) return `0:00 ${getUnitLabels(unit).pace}`;
    const speed = unit === 'imperial' ? speedKmh * KM_TO_MI : speedKmh;
    const pace = 60 / speed;
    const minutes = Math.floor(pace);
    let seconds = Math.round((pace - minutes) * 60);
    let adjustedMinutes = minutes;
    if (seconds === 60) {
        adjustedMinutes += 1;
        seconds = 0;
    }
    return `${adjustedMinutes}:${seconds.toString().padStart(2, '0')} ${getUnitLabels(unit).pace}`;
}

export function formatPaceValue(paceMinPerKm, unit = getUnitPreference()) {
    if (!paceMinPerKm || paceMinPerKm === 0) return `0:00 ${getUnitLabels(unit).pace}`;
    const pace = unit === 'imperial' ? paceMinPerKm / KM_TO_MI : paceMinPerKm;
    const minutes = Math.floor(pace);
    let seconds = Math.round((pace - minutes) * 60);
    let adjustedMinutes = minutes;
    if (seconds === 60) {
        adjustedMinutes += 1;
        seconds = 0;
    }
    return `${adjustedMinutes}:${seconds.toString().padStart(2, '0')} ${getUnitLabels(unit).pace}`;
}

export function formatElevation(meters, unit = getUnitPreference()) {
    if (!meters || meters === 0) return unit === 'imperial' ? '0 ft' : '0 m';
    const value = unit === 'imperial' ? meters * M_TO_FT : meters;
    return `${Math.round(value)} ${unit === 'imperial' ? 'ft' : 'm'}`;
}
