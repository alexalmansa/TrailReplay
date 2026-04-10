import { createElement } from 'react';
import type { CSSProperties, ReactElement } from 'react';

export const SVG_ACTIVITY_ICON_VALUES = {
  walking: 'svg-walking',
  running: 'svg-running',
  biking: 'svg-biking',
} as const;

export const DEFAULT_ACTIVITY_ICON = SVG_ACTIVITY_ICON_VALUES.walking;

type ActivityIconOption = {
  value: string;
  labelKey: string;
  kind: 'emoji' | 'svg';
  content: string;
};

const svgIconBasePath = '/media/images/activity-icons';

export const ACTIVITY_ICONS: ActivityIconOption[] = [
  { value: SVG_ACTIVITY_ICON_VALUES.walking, labelKey: 'activities.walking', kind: 'svg', content: `${svgIconBasePath}/walking.svg` },
  { value: SVG_ACTIVITY_ICON_VALUES.running, labelKey: 'activities.running', kind: 'svg', content: `${svgIconBasePath}/running.svg` },
  { value: SVG_ACTIVITY_ICON_VALUES.biking, labelKey: 'activities.cycling', kind: 'svg', content: `${svgIconBasePath}/biking.svg` },
  { value: '🏃', labelKey: 'activities.running', kind: 'emoji', content: '🏃' },
  { value: '🏃‍♂️', labelKey: 'activities.runner', kind: 'emoji', content: '🏃‍♂️' },
  { value: '🚴', labelKey: 'activities.cycling', kind: 'emoji', content: '🚴' },
  { value: '🚴‍♂️', labelKey: 'activities.cyclist', kind: 'emoji', content: '🚴‍♂️' },
  { value: '🥾', labelKey: 'activities.hiking', kind: 'emoji', content: '🥾' },
  { value: '🚶', labelKey: 'activities.walking', kind: 'emoji', content: '🚶' },
  { value: '🚶‍♂️', labelKey: 'activities.walker', kind: 'emoji', content: '🚶‍♂️' },
  { value: '⛷️', labelKey: 'activities.skiing', kind: 'emoji', content: '⛷️' },
  { value: '🏊', labelKey: 'activities.swimming', kind: 'emoji', content: '🏊' },
  { value: '🧗', labelKey: 'activities.climbing', kind: 'emoji', content: '🧗' },
  { value: '🏇', labelKey: 'activities.horse', kind: 'emoji', content: '🏇' },
  { value: '🛶', labelKey: 'activities.kayak', kind: 'emoji', content: '🛶' },
  { value: '🛹', labelKey: 'activities.skate', kind: 'emoji', content: '🛹' },
  { value: '🎿', labelKey: 'activities.ski', kind: 'emoji', content: '🎿' },
  { value: '🏂', labelKey: 'activities.snowboard', kind: 'emoji', content: '🏂' },
  { value: '🚗', labelKey: 'activities.car', kind: 'emoji', content: '🚗' },
  { value: '✈️', labelKey: 'activities.plane', kind: 'emoji', content: '✈️' },
  { value: '🚂', labelKey: 'activities.train', kind: 'emoji', content: '🚂' },
];

const activityIconMap = new Map(ACTIVITY_ICONS.map((icon) => [icon.value, icon]));

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function iconFrameStyle(size: number): CSSProperties {
  return {
    width: size,
    height: size,
    display: 'block',
    objectFit: 'contain',
  };
}

export function getActivityIconOption(value: string): ActivityIconOption | undefined {
  return activityIconMap.get(value);
}

export function renderActivityIcon(
  value: string,
  options: { size?: number; className?: string } = {},
): ReactElement {
  const { size = 24, className } = options;
  const icon = getActivityIconOption(value);

  if (icon?.kind === 'svg') {
    return createElement('img', {
      src: icon.content,
      alt: '',
      'aria-hidden': true,
      className,
      style: iconFrameStyle(size),
    });
  }

  return createElement(
    'span',
    {
      'aria-hidden': true,
      className,
      style: {
        ...iconFrameStyle(size),
        alignItems: 'center',
        display: 'inline-flex',
        fontSize: size,
        justifyContent: 'center',
        lineHeight: 1,
      } satisfies CSSProperties,
    },
    icon?.content ?? value,
  );
}

export function getActivityIconMarkerHtml(value: string, size: number): string {
  const icon = getActivityIconOption(value);

  if (icon?.kind === 'svg') {
    return `<img src="${escapeHtml(icon.content)}" alt="" aria-hidden="true" style="width:${size}px;height:${size}px;display:block;object-fit:contain;position:relative;z-index:10;" />`;
  }

  return `<span style="width:${size}px;height:${size}px;display:inline-flex;align-items:center;justify-content:center;font-size:${size}px;line-height:1;position:relative;z-index:10;">${escapeHtml(icon?.content ?? value)}</span>`;
}
