/**
 * Core Type Definitions for MaskVolume
 *
 * Shared types for the 3D volumetric mask storage system.
 */

/**
 * 3D volume dimensions in voxels.
 *
 * Coordinate convention:
 *   x = left-right  (sagittal axis)
 *   y = front-back  (coronal axis)
 *   z = bottom-top  (axial axis / slice direction)
 */
export interface Dimensions {
  width: number;   // X extent
  height: number;  // Y extent
  depth: number;   // Z extent (number of slices)
}

// ── Color Mapping Types ─────────────────────────────────────────────────

/**
 * RGBA color with each component in the range [0, 255].
 */
export interface RGBAColor {
  r: number;  // 0-255
  g: number;  // 0-255
  b: number;  // 0-255
  a: number;  // 0-255
}

/**
 * Maps channel indices to RGBA colors.
 */
export type ChannelColorMap = Record<number, RGBAColor>;

/**
 * Rendering mode for slice extraction.
 */
export enum RenderMode {
  /** Single channel as grayscale (original behavior). */
  GRAYSCALE = 'grayscale',

  /** Single channel with predefined color. */
  COLORED_SINGLE = 'colored_single',

  /** All channels composited with colors (last non-zero channel wins). */
  COLORED_MULTI = 'colored_multi',

  /** All channels blended (additive). */
  BLENDED = 'blended',
}

/**
 * Options for slice rendering via `getSliceImageData()`.
 */
export interface SliceRenderOptions {
  /** Rendering mode (default: GRAYSCALE). */
  mode?: RenderMode;

  /** Specific channel to render (for GRAYSCALE / COLORED_SINGLE modes, default 0). */
  channel?: number;

  /** Custom color map (overrides the volume's default). */
  colorMap?: ChannelColorMap;

  /** Channel visibility mask (for COLORED_MULTI / BLENDED modes). */
  visibleChannels?: boolean[];

  /** Opacity multiplier 0.0 – 1.0 (default 1.0). */
  opacity?: number;
}

// ── Predefined Color Constants ──────────────────────────────────────────

/**
 * Predefined color palette for mask channels.
 *
 * Based on common medical imaging conventions:
 *
 * | Channel | Role                      | Color    |
 * |---------|---------------------------|----------|
 * | 0       | Background                | transparent |
 * | 1       | Primary / Tumor           | Green    |
 * | 2       | Secondary / Edema         | Red      |
 * | 3       | Tertiary / Necrosis       | Blue     |
 * | 4       | Enhancement               | Yellow   |
 * | 5       | Vessel / Boundary         | Magenta  |
 * | 6       | Additional region         | Cyan     |
 * | 7       | Auxiliary annotation       | Orange   |
 * | 8       | Extended annotation        | Purple   |
 */
export const MASK_CHANNEL_COLORS: Readonly<ChannelColorMap> = {
  0: { r: 0,   g: 0,   b: 0,   a: 0   },   // Background (transparent)
  1: { r: 0,   g: 255, b: 0,   a: 153 },   // Green  — Primary / Tumor
  2: { r: 255, g: 0,   b: 0,   a: 153 },   // Red    — Secondary / Edema
  3: { r: 0,   g: 0,   b: 255, a: 153 },   // Blue   — Tertiary / Necrosis
  4: { r: 255, g: 255, b: 0,   a: 153 },   // Yellow — Enhancement
  5: { r: 255, g: 0,   b: 255, a: 153 },   // Magenta — Vessel / Boundary
  6: { r: 0,   g: 255, b: 255, a: 153 },   // Cyan   — Additional
  7: { r: 255, g: 128, b: 0,   a: 153 },   // Orange — Auxiliary
  8: { r: 128, g: 0,   b: 255, a: 153 },   // Purple — Extended
};

/**
 * CSS color strings for the default channel palette (for reference / UI).
 */
export const MASK_CHANNEL_CSS_COLORS: Readonly<Record<number, string>> = {
  0: 'rgba(0,0,0,0)',
  1: 'rgba(0,255,0,0.6)',      // Green
  2: 'rgba(255,0,0,0.6)',      // Red
  3: 'rgba(0,0,255,0.6)',      // Blue
  4: 'rgba(255,255,0,0.6)',    // Yellow
  5: 'rgba(255,0,255,0.6)',    // Magenta
  6: 'rgba(0,255,255,0.6)',    // Cyan
  7: 'rgba(255,128,0,0.6)',    // Orange
  8: 'rgba(128,0,255,0.6)',    // Purple
};
