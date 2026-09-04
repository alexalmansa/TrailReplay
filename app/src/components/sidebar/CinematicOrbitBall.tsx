import { useRef } from 'react';
import { useI18n } from '@/i18n/useI18n';

interface CinematicOrbitBallProps {
  bearingDeg: number;
  pitchDeg: number;
  /** Route heading at the current moment, to mark "ahead" on the ring. Null when there's no route to reference. */
  routeHeadingDeg: number | null;
  onChange: (next: { bearingDeg: number; pitchDeg: number }) => void;
}

const SIZE = 168;
const CENTER = SIZE / 2;
const MAX_RADIUS = CENTER - 14;
const MAX_PITCH = 85;

function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function pointFromPose(bearingDeg: number, pitchDeg: number): { x: number; y: number } {
  const radius = (Math.max(0, Math.min(MAX_PITCH, pitchDeg)) / MAX_PITCH) * MAX_RADIUS;
  const angleRad = (normalizeAngle(bearingDeg) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.sin(angleRad),
    y: CENTER - radius * Math.cos(angleRad),
  };
}

function poseFromPoint(x: number, y: number): { bearingDeg: number; pitchDeg: number } {
  const dx = x - CENTER;
  const dy = y - CENTER;
  const radius = Math.min(MAX_RADIUS, Math.sqrt(dx * dx + dy * dy));
  const bearingDeg = normalizeAngle((Math.atan2(dx, -dy) * 180) / Math.PI);
  const pitchDeg = (radius / MAX_RADIUS) * MAX_PITCH;
  return { bearingDeg, pitchDeg };
}

/**
 * The orbit gizmo from CINEMATIC_CAMERA_PLAN.md section 8.2: a subject-fixed
 * "ball" the user rotates to place the camera, rather than freeform map
 * dragging — which pans the subject out from under the shot along with
 * whatever rotate/tilt gesture was intended. Bearing is the handle's angle
 * from the top (12 o'clock = north); pitch is its distance from the centre
 * (centre = looking straight down, edge = near ground level). Zoom is
 * intentionally not part of this control — see the plan's own table.
 */
export function CinematicOrbitBall({ bearingDeg, pitchDeg, routeHeadingDeg, onChange }: CinematicOrbitBallProps) {
  const { t } = useI18n();
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);

  const applyFromClientPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * SIZE;
    const y = ((clientY - rect.top) / rect.height) * SIZE;
    onChange(poseFromPoint(x, y));
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    applyFromClientPoint(event.clientX, event.clientY);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!draggingRef.current) return;
    applyFromClientPoint(event.clientX, event.clientY);
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handle = pointFromPose(bearingDeg, pitchDeg);
  const headingPoint = routeHeadingDeg !== null ? pointFromPose(routeHeadingDeg, MAX_PITCH + 10) : null;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        ref={svgRef}
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="touch-none cursor-grab select-none active:cursor-grabbing rounded-full"
        role="img"
        aria-label={t('settings.cinematicCamera.orbitBallValue', {
          bearing: Math.round(normalizeAngle(bearingDeg)),
          pitch: Math.round(pitchDeg),
        })}
      >
        {/* Pitch reference rings: straight-down, mid, near-ground. */}
        {[0.33, 0.66, 1].map((fraction) => (
          <circle
            key={fraction}
            cx={CENTER}
            cy={CENTER}
            r={MAX_RADIUS * fraction}
            fill="none"
            stroke="var(--evergreen-20, rgba(0,0,0,0.12))"
            strokeWidth={1}
          />
        ))}
        <circle cx={CENTER} cy={CENTER} r={2} fill="var(--evergreen-60, rgba(0,0,0,0.4))" />

        {headingPoint && (
          <line
            x1={CENTER}
            y1={CENTER}
            x2={headingPoint.x}
            y2={headingPoint.y}
            stroke="var(--trail-orange, #C1652F)"
            strokeOpacity={0.35}
            strokeWidth={2}
            strokeDasharray="3 3"
          />
        )}

        <line x1={handle.x} y1={handle.y} x2={CENTER} y2={CENTER} stroke="var(--trail-orange, #C1652F)" strokeWidth={1.5} strokeOpacity={0.5} />
        <circle cx={handle.x} cy={handle.y} r={8} fill="var(--trail-orange, #C1652F)" stroke="white" strokeWidth={2} />
      </svg>
      <p className="text-[10px] text-[var(--evergreen-60)] text-center leading-tight max-w-[168px]">
        {t('settings.cinematicCamera.orbitBallHint')}
      </p>
    </div>
  );
}
