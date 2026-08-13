import { describe, expect, it } from 'vitest';
import { analyzeRouteLandmarks } from './routeLandmarks';

const route = (elevations: number[], spacing = 1_000) => elevations.map((elevation, index) => ({ lat: 45 + index * 0.009, lon: 6, elevation, distance: index * spacing }));

describe('analyzeRouteLandmarks', () => {
  it('keeps the absolute high point despite noisy elevation samples', () => {
    const landmarks = analyzeRouteLandmarks(route([900, 940, 930, 1_020, 1_000, 1_210, 1_180, 1_150]));
    expect(landmarks.find((landmark) => landmark.type === 'highest-point')?.elevation).toBeGreaterThan(1_100);
  });

  it('does not invent terrain moments for a flat route', () => {
    const landmarks = analyzeRouteLandmarks(route([100, 101, 99, 100, 101, 100]));
    expect(landmarks.map((landmark) => landmark.type)).toEqual(['halfway', 'finish']);
  });

  it('adds sustained climb and descent moments', () => {
    const landmarks = analyzeRouteLandmarks(route([800, 850, 980, 1_140, 1_300, 1_180, 980, 780]));
    expect(landmarks.some((landmark) => landmark.type === 'longest-climb')).toBe(true);
    expect(landmarks.some((landmark) => landmark.type === 'major-descent')).toBe(true);
  });
});
