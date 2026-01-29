import type { GPXPoint, GPXTrack } from '@/types';

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Parse GPX XML content
export function parseGPX(gpxContent: string, fileName: string): GPXTrack {
  const parser = new DOMParser();
  const doc = parser.parseFromString(gpxContent, 'text/xml');
  
  // Check for parsing errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid GPX file format');
  }
  
  // Get track name
  const nameElement = doc.querySelector('trk > name, gpx > name');
  const name = nameElement?.textContent || fileName.replace('.gpx', '');
  
  // Get all track points
  const trackPoints: GPXPoint[] = [];
  const trackPointElements = doc.querySelectorAll('trkpt, rtept');
  
  if (trackPointElements.length === 0) {
    throw new Error('No track points found in GPX file');
  }
  
  let totalDistance = 0;
  let elevationGain = 0;
  let elevationLoss = 0;
  let maxElevation = -Infinity;
  let minElevation = Infinity;
  let maxSpeed = 0;
  let totalSpeed = 0;
  let speedCount = 0;
  
  const bounds = {
    minLat: Infinity,
    maxLat: -Infinity,
    minLon: Infinity,
    maxLon: -Infinity,
  };
  
  trackPointElements.forEach((point, index) => {
    const lat = parseFloat(point.getAttribute('lat') || '0');
    const lon = parseFloat(point.getAttribute('lon') || '0');
    
    // Update bounds
    bounds.minLat = Math.min(bounds.minLat, lat);
    bounds.maxLat = Math.max(bounds.maxLat, lat);
    bounds.minLon = Math.min(bounds.minLon, lon);
    bounds.maxLon = Math.max(bounds.maxLon, lon);
    
    // Get elevation
    const eleElement = point.querySelector('ele');
    const elevation = eleElement ? parseFloat(eleElement.textContent || '0') : 0;
    
    // Get time
    const timeElement = point.querySelector('time');
    const time = timeElement ? new Date(timeElement.textContent || '') : null;
    
    // Get heart rate from extensions
    let heartRate: number | null = null;
    const hrElement = point.querySelector('hr, gpxtpx\\:hr, ns3\\:hr, ns2\\:hr');
    if (hrElement) {
      heartRate = parseInt(hrElement.textContent || '0', 10);
    }
    
    // Get cadence
    let cadence: number | null = null;
    const cadElement = point.querySelector('cad, gpxtpx\\:cad, ns3\\:cad');
    if (cadElement) {
      cadence = parseInt(cadElement.textContent || '0', 10);
    }
    
    // Get power
    let power: number | null = null;
    const powerElement = point.querySelector('power');
    if (powerElement) {
      power = parseFloat(powerElement.textContent || '0');
    }
    
    // Get temperature
    let temperature: number | null = null;
    const tempElement = point.querySelector('atemp, gpxtpx\\:atemp');
    if (tempElement) {
      temperature = parseFloat(tempElement.textContent || '0');
    }
    
    // Calculate distance from previous point
    let distance = 0;
    if (index > 0 && trackPoints.length > 0) {
      const prevPoint = trackPoints[trackPoints.length - 1];
      distance = calculateDistance(prevPoint.lat, prevPoint.lon, lat, lon);
      totalDistance += distance;
      
      // Calculate elevation gain/loss
      const elevationDiff = elevation - prevPoint.elevation;
      if (elevationDiff > 0) {
        elevationGain += elevationDiff;
      } else {
        elevationLoss += Math.abs(elevationDiff);
      }
    }
    
    // Calculate speed
    let speed = 0;
    if (index > 0 && trackPoints.length > 0 && time) {
      const prevPoint = trackPoints[trackPoints.length - 1];
      if (prevPoint.time) {
        const timeDiff = (time.getTime() - prevPoint.time.getTime()) / 1000; // seconds
        if (timeDiff > 0) {
          speed = (distance / timeDiff) * 3.6; // km/h
          maxSpeed = Math.max(maxSpeed, speed);
          if (speed > 0.5) { // Only count moving speed
            totalSpeed += speed;
            speedCount++;
          }
        }
      }
    }
    
    // Update elevation stats
    maxElevation = Math.max(maxElevation, elevation);
    minElevation = Math.min(minElevation, elevation);
    
    trackPoints.push({
      lat,
      lon,
      elevation,
      time,
      heartRate,
      cadence,
      power,
      temperature,
      distance: totalDistance,
      speed,
    });
  });
  
  // Calculate total time
  let totalTime = 0;
  let movingTime = 0;
  
  if (trackPoints.length > 1 && trackPoints[0].time && trackPoints[trackPoints.length - 1].time) {
    totalTime = (trackPoints[trackPoints.length - 1].time!.getTime() - trackPoints[0].time!.getTime()) / 1000;
    
    // Calculate moving time (speed > 0.5 km/h)
    for (let i = 1; i < trackPoints.length; i++) {
      if (trackPoints[i].speed > 0.5 && trackPoints[i].time && trackPoints[i - 1].time) {
        movingTime += (trackPoints[i].time!.getTime() - trackPoints[i - 1].time!.getTime()) / 1000;
      }
    }
  }
  
  // Calculate average speeds
  const avgSpeed = totalTime > 0 ? (totalDistance / 1000) / (totalTime / 3600) : 0;
  const avgMovingSpeed = speedCount > 0 ? totalSpeed / speedCount : 0;
  
  return {
    id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    points: trackPoints,
    totalDistance,
    totalTime,
    movingTime,
    elevationGain,
    elevationLoss,
    maxElevation,
    minElevation,
    maxSpeed,
    avgSpeed,
    avgMovingSpeed,
    bounds,
    color: '#C1652F',
    visible: true,
  };
}

// Parse multiple GPX files
export async function parseGPXFiles(files: File[]): Promise<GPXTrack[]> {
  const tracks: GPXTrack[] = [];
  
  for (const file of files) {
    if (!file.name.endsWith('.gpx')) continue;
    
    try {
      const content = await file.text();
      const track = parseGPX(content, file.name);
      tracks.push(track);
    } catch (error) {
      console.error(`Error parsing ${file.name}:`, error);
    }
  }
  
  return tracks;
}

// Get point at a specific distance along the track
export function getPointAtDistance(track: GPXTrack, distance: number): GPXPoint | null {
  if (track.points.length === 0) return null;
  if (distance <= 0) return track.points[0];
  if (distance >= track.totalDistance) return track.points[track.points.length - 1];
  
  // Binary search for the correct segment
  let left = 0;
  let right = track.points.length - 1;
  
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (track.points[mid].distance < distance) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  
  // Interpolate between points
  const pointIndex = Math.max(1, left);
  const prevPoint = track.points[pointIndex - 1];
  const nextPoint = track.points[pointIndex];
  
  const segmentDistance = nextPoint.distance - prevPoint.distance;
  if (segmentDistance === 0) return prevPoint;
  
  const ratio = (distance - prevPoint.distance) / segmentDistance;
  
  return {
    lat: prevPoint.lat + (nextPoint.lat - prevPoint.lat) * ratio,
    lon: prevPoint.lon + (nextPoint.lon - prevPoint.lon) * ratio,
    elevation: prevPoint.elevation + (nextPoint.elevation - prevPoint.elevation) * ratio,
    time: prevPoint.time && nextPoint.time
      ? new Date(prevPoint.time.getTime() + (nextPoint.time.getTime() - prevPoint.time.getTime()) * ratio)
      : null,
    heartRate: prevPoint.heartRate && nextPoint.heartRate
      ? prevPoint.heartRate + (nextPoint.heartRate - prevPoint.heartRate) * ratio
      : null,
    cadence: prevPoint.cadence && nextPoint.cadence
      ? prevPoint.cadence + (nextPoint.cadence - prevPoint.cadence) * ratio
      : null,
    power: prevPoint.power && nextPoint.power
      ? prevPoint.power + (nextPoint.power - prevPoint.power) * ratio
      : null,
    temperature: prevPoint.temperature && nextPoint.temperature
      ? prevPoint.temperature + (nextPoint.temperature - prevPoint.temperature) * ratio
      : null,
    distance,
    speed: prevPoint.speed + (nextPoint.speed - prevPoint.speed) * ratio,
  };
}

// Calculate heart rate zones
export function calculateHeartRateZones(maxHeartRate: number = 180): { [key: string]: { min: number; max: number; color: string } } {
  return {
    recovery: { min: 0, max: maxHeartRate * 0.6, color: '#4ade80' },
    aerobic: { min: maxHeartRate * 0.6, max: maxHeartRate * 0.7, color: '#60a5fa' },
    tempo: { min: maxHeartRate * 0.7, max: maxHeartRate * 0.8, color: '#fbbf24' },
    threshold: { min: maxHeartRate * 0.8, max: maxHeartRate * 0.9, color: '#f97316' },
    anaerobic: { min: maxHeartRate * 0.9, max: maxHeartRate, color: '#ef4444' },
  };
}

// Get color for heart rate
export function getHeartRateColor(heartRate: number, maxHeartRate: number = 180): string {
  const zones = calculateHeartRateZones(maxHeartRate);
  
  for (const [, zone] of Object.entries(zones)) {
    if (heartRate >= zone.min && heartRate < zone.max) {
      return zone.color;
    }
  }
  
  return zones.anaerobic.color;
}
