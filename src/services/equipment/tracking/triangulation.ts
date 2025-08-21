/**
 * estimateDevicePosition — Estimate a device’s 2D position from beacon RSSI.
 *
 * Behavior:
 * - Selects the room of the strongest received beacon (highest RSSI), then discards beacons from other rooms.
 * - Uses trilateration (least-squares) if ≥3 beacons remain; otherwise falls back to the strongest beacon’s coordinates.
 * - Optionally clamps the result to the [0..1] map area and can return normalized or percent coordinates.
 *
 * Key options:
 * - defaultTxPowerAt1m: dBm at 1 meter for RSSI→distance (fallback if a beacon lacks txPowerAt1m). Typical ~ -59 dBm.
 * - defaultPathLossExponent: Environment factor n for path loss (typical indoor 2.0–3.5). Used if a beacon lacks its own n.
 * - metersPerUnit: How many meters correspond to 1.0 normalized map unit (used to scale RSSI-derived distances).
 * - outputScale: 'normalized' (0..1) or 'percent' (0..100) for the returned coordinates.
 * - clampToUnitSquare: If true, clamps (x,y) to [0..1].
 *
 * Notes:
 * - Coordinates for beacons and output are normalized with (0,0) at top-left and (1,1) at bottom-right.
 * - If trilateration is ill-conditioned (e.g., near-colinear beacons), the function falls back to strongest beacon.
 */

import { Resources } from "@tago-io/sdk";
import { site_id } from "../../../analysis/__tests__/mocks/getAssetInfoInside.mock";

// Types and domain models
export interface Beacon {
  id: string;
  x: number; // normalized [0..1]
  y: number; // normalized [0..1]
  room: string;
  // Optional per-beacon calibration
  txPowerAt1m?: number; // dBm at 1 meter (default -59)
  pathLossExponent?: number; // environment factor n (default 2.0)
}

export interface DeviceBeacon {
  id: string;
  rssi: number; // e.g., -72
}

export interface DeviceData {
  beacons: DeviceBeacon[];
}

export interface PositionEstimate {
  x: number; // normalized [0..1] or percent [0..100] depending on outputScale
  y: number; // normalized [0..1] or percent [0..100]
  room: string;
  method: "trilateration" | "fallback-strongest";
  usedBeacons: string[]; // IDs actually used in the solve
}

export interface TrilaterationOptions {
  defaultTxPowerAt1m?: number; // default -59
  defaultPathLossExponent?: number; // default 2.0 (2.0-3.5 typical indoors)
  metersPerUnit?: number; // how many meters correspond to 1.0 normalized unit (default 1)
  outputScale?: "normalized" | "percent"; // default 'normalized'
  clampToUnitSquare?: boolean; // clamp output to [0,1] range; default true
  minBeaconsForTrilateration?: number; // default 3
  minDistanceUnits?: number; // floor distance in normalized units; default 0.01
}

// Public API
export function estimateDevicePosition(
  device: DeviceData,
  beacons: Beacon[],
  options: TrilaterationOptions = {}
): PositionEstimate | null {
  const {
    defaultTxPowerAt1m = -59,
    defaultPathLossExponent = 2.0,
    metersPerUnit = 1,
    outputScale = "normalized",
    clampToUnitSquare = true,
    minBeaconsForTrilateration = 3,
    minDistanceUnits = 0.01,
  } = options;

  const beaconMap = indexBeaconsById(beacons);

  // Keep only device beacons that exist in settings
  const observed = device.beacons
    .map((b) => {
      const meta = beaconMap.get(b.id);
      return meta ? { ...b, meta } : null;
    })
    .filter(Boolean) as Array<DeviceBeacon & { meta: Beacon }>;

  if (observed.length === 0) {
    return null;
  }

  // Strongest RSSI determines the room
  const strongest = observed.reduce((a, b) => (b.rssi > a.rssi ? b : a));
  const room = strongest.meta.room;

  // Filter to beacons in the same room
  const observedInRoom = observed.filter((b) => b.meta.room === room);
  if (observedInRoom.length === 0) {
    // Shouldn't happen since strongest is in the room, but safe-guard
    return fallbackToStrongest(strongest, outputScale);
  }

  // If not enough beacons to triangulate, fallback to strongest beacon's position
  if (observedInRoom.length < minBeaconsForTrilateration) {
    return fallbackToStrongest(strongest, outputScale);
  }

  // Build anchors with distances derived from RSSI
  const anchors = observedInRoom.map((o) => {
    const tx = pickNumber(o.meta.txPowerAt1m, defaultTxPowerAt1m);
    const n = pickNumber(o.meta.pathLossExponent, defaultPathLossExponent);
    const dMeters = rssiToDistanceMeters(o.rssi, tx, n);
    const dUnitsRaw = dMeters / metersPerUnit;
    const dUnits = Math.max(dUnitsRaw, minDistanceUnits); // avoid degeneracies
    return {
      id: o.id,
      x: o.meta.x,
      y: o.meta.y,
      d: dUnits,
      rssi: o.rssi,
    };
  });

  // Sort anchors by signal strength (strongest first) to improve numerical stability
  anchors.sort((a, b) => b.rssi - a.rssi);

  // Solve trilateration using linearized least squares
  const solve = trilaterateLeastSquares2D(anchors);

  if (!solve) {
    // Ill-conditioned or failed: spec says fallback to strongest
    return fallbackToStrongest(strongest, outputScale);
  }

  const out = maybeClamp(solve, clampToUnitSquare);
  const scaled = scaleOutput(out, outputScale);

  return {
    x: scaled.x,
    y: scaled.y,
    room,
    method: "trilateration",
    usedBeacons: anchors.map((a) => a.id),
  };
}

// ---- Implementation details below ----

function indexBeaconsById(beacons: Beacon[]): Map<string, Beacon> {
  const m = new Map<string, Beacon>();
  for (const b of beacons) {
    m.set(b.id, b);
  }
  return m;
}

function pickNumber<T extends number>(...vals: Array<T | undefined>): T {
  for (const v of vals) {
    if (typeof v === "number" && Number.isFinite(v)) {
      return v;
    }
  }
  // @ts-expect-error - at least one numeric default must be provided by callers
  return undefined;
}

// RSSI to distance using log-distance path loss model
// d (meters) = 10 ^ ((TxPowerAt1m - RSSI) / (10 * n))
function rssiToDistanceMeters(
  rssi: number,
  txPowerAt1m: number,
  pathLossExponent: number
): number {
  // Protect against pathological values
  const n = Math.max(1.0, Math.min(6.0, pathLossExponent));
  const numerator = txPowerAt1m - sanitizeRssi(rssi);
  const exp = numerator / (10 * n);
  const d = Math.pow(10, exp);
  return isFinite(d) ? d : 1e6;
}

function sanitizeRssi(rssi: number): number {
  if (!Number.isFinite(rssi)) return -100;
  // Typical RSSI range: -20 (very close) to -100 (far)
  return Math.max(-120, Math.min(-20, rssi));
}

function fallbackToStrongest(
  strongest: DeviceBeacon & { meta: Beacon },
  outputScale: "normalized" | "percent"
): PositionEstimate {
  const pos = scaleOutput(
    { x: strongest.meta.x, y: strongest.meta.y },
    outputScale
  );
  return {
    x: pos.x,
    y: pos.y,
    room: strongest.meta.room,
    method: "fallback-strongest",
    usedBeacons: [strongest.id],
  };
}

function scaleOutput(
  p: { x: number; y: number },
  outputScale: "normalized" | "percent"
): { x: number; y: number } {
  if (outputScale === "percent") {
    return { x: p.x * 100, y: p.y * 100 };
  }
  return p;
}

function maybeClamp(
  p: { x: number; y: number },
  clamp: boolean
): { x: number; y: number } {
  if (!clamp) return p;
  return {
    x: Math.max(0, Math.min(1, p.x)),
    y: Math.max(0, Math.min(1, p.y)),
  };
}

// Linearized least squares trilateration in 2D.
// For anchors (xi, yi, di), use first anchor as reference and solve:
// 2(xi - x1) * x + 2(yi - y1) * y = (xi^2 - x1^2 + yi^2 - y1^2) + d1^2 - di^2  for i=2..n
function trilaterateLeastSquares2D(
  anchors: Array<{ id: string; x: number; y: number; d: number }>
): { x: number; y: number } | null {
  if (anchors.length < 3) {
    return null;
  }

  const ref = anchors[0];
  // Build normal equations ATA * [x;y] = ATb (ATA is 2x2, ATb is 2x1)
  let ata11 = 0,
    ata12 = 0,
    ata22 = 0;
  let atb1 = 0,
    atb2 = 0;

  for (let i = 1; i < anchors.length; i++) {
    const ai = anchors[i];
    const A0 = 2 * (ai.x - ref.x);
    const A1 = 2 * (ai.y - ref.y);
    const bi =
      ai.x * ai.x -
      ref.x * ref.x +
      (ai.y * ai.y - ref.y * ref.y) +
      (ref.d * ref.d - ai.d * ai.d);

    // Accumulate ATA
    ata11 += A0 * A0;
    ata12 += A0 * A1;
    ata22 += A1 * A1;

    // Accumulate ATb
    atb1 += A0 * bi;
    atb2 += A1 * bi;
  }

  const det = ata11 * ata22 - ata12 * ata12;
  const EPS = 1e-12;

  if (Math.abs(det) < EPS) {
    // Ill-conditioned (e.g., near-colinear anchor layout)
    return null;
  }

  // Inverse of 2x2 [a b; b c] is (1/det) * [c -b; -b a]
  const inv11 = ata22 / det;
  const inv12 = -ata12 / det;
  const inv22 = ata11 / det;

  const x = inv11 * atb1 + inv12 * atb2;
  const y = inv12 * atb1 + inv22 * atb2;

  if (!isFinite(x) || !isFinite(y)) {
    return null;
  }

  return { x, y };
}

// ------------------- Example usage -------------------
// Uncomment to test locally
// const beacons: Beacon[] = [
//   { id: '5b8ce8', x: 0.87, y: 0.11, room: 'A' },
//   { id: '5b8cf4', x: 0.74, y: 0.81, room: 'A' },
//   { id: '5b8cf1', x: 0.15, y: 0.14, room: 'A' },
//   { id: '5b8cf3', x: 0.1, y: 0.5, room: 'A' },
// ];

// const device: DeviceData = {
//   beacons: [
//     { id: '5b8ce8', rssi: -64 },
//     { id: '5b8cf4', rssi: -78 },
//     { id: '5b8cf1', rssi: -72 },
//   ],
// };

// const pos = estimateDevicePosition(device, beacons, {
//   defaultTxPowerAt1m: -59,
//   defaultPathLossExponent: 2.2,
//   metersPerUnit: 10,           // if 1.0 normalized unit ~= 10 meters across your map
//   outputScale: 'normalized',
//   clampToUnitSquare: true,
// });
