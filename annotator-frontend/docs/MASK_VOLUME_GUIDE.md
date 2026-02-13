# MaskVolume Developer Guide

## Overview

`MaskVolume` is the core 3D volumetric mask storage class for the medical image annotator. It replaces the legacy per-slice `ImageData` storage with a single contiguous `Uint8Array`, providing significant memory savings and multi-axis rendering capabilities.

**Key benefits over the legacy approach:**

| Metric | Legacy (ImageData) | MaskVolume | Improvement |
|--------|-------------------|------------|-------------|
| Memory (512x512x100, 1 ch) | ~100 MB (Z only) | ~25 MB | **75% reduction** |
| Memory (all 3 axes) | ~524 MB | ~25 MB | **95% reduction** |
| Constructor time | 5.51 ms | 0.19 ms | **29x faster** |
| Slice extraction (Z) | N/A | 3.79 ms | < 10 ms target |

---

## Architecture

### File Structure

```
segmentation/core/
  index.ts           — Public API barrel export
  types.ts           — Shared type definitions
  MaskVolume.ts      — Core volume class
  MigrationUtils.ts  — Legacy <-> Volume conversion
  __tests__/
    setup.ts              — ImageData polyfill for jsdom
    MaskVolume.test.ts    — 81 unit tests
    MaskVolume.bench.ts   — Performance benchmarks
    MigrationUtils.test.ts — 20 migration tests
```

### Memory Layout

The backing `Uint8Array` uses **slice-major** order: `[z][y][x][channel]`.

```
index = z * (width * height * channels)
      + y * (width * channels)
      + x * channels
      + channel
```

This layout is optimised for **axial (Z-axis) slice extraction**, which is the most common operation in medical imaging — extracting a full Z-slice reads a contiguous memory region.

### Coordinate Convention

| Symbol | Axis | Medical Term | Dimension |
|--------|------|-------------|-----------|
| x | Left-Right | Sagittal | `width` |
| y | Front-Back | Coronal | `height` |
| z | Bottom-Top | Axial | `depth` |

---

## Quick Start

### Import

```ts
import {
  MaskVolume,
  RenderMode,
  type Dimensions,
} from '../segmentation/core';
```

### Create a Volume

```ts
// Single channel (default) — matches NRRD dimensions
const vol = new MaskVolume(512, 512, 100);

// Multi-channel (e.g. 4 label channels)
const multiVol = new MaskVolume(512, 512, 100, 4);
```

### Read / Write Voxels

```ts
// Write a voxel value (0-255)
vol.setVoxel(256, 256, 50, 255);

// Read it back
const value = vol.getVoxel(256, 256, 50); // 255

// Multi-channel: specify channel as 5th argument
multiVol.setVoxel(100, 100, 25, 200, 2); // channel 2
```

### Extract Slices for Canvas

```ts
// Grayscale (default, backward compatible)
const axial = vol.getSliceImageData(50, 'z');
ctx.putImageData(axial, 0, 0);

// Coronal slice
const coronal = vol.getSliceImageData(256, 'y');

// Sagittal slice
const sagittal = vol.getSliceImageData(256, 'x');
```

### Insert Slices from Canvas

```ts
// Capture canvas content and write back to volume
const imgData = ctx.getImageData(0, 0, 512, 512);
vol.setSliceFromImageData(50, imgData, 'z');
```

---

## Rendering Modes

`getSliceImageData()` supports four rendering modes via the `options` parameter:

### 1. GRAYSCALE (default)

Single channel rendered as white-on-transparent. Non-zero voxels are opaque, zero voxels are transparent.

```ts
const slice = vol.getSliceImageData(50, 'z');
// or explicitly:
const slice = vol.getSliceImageData(50, 'z', {
  mode: RenderMode.GRAYSCALE,
  channel: 0,
});
```

### 2. COLORED_SINGLE

Single channel with its assigned color. Alpha is modulated by voxel intensity and opacity.

```ts
const colored = vol.getSliceImageData(50, 'z', {
  mode: RenderMode.COLORED_SINGLE,
  channel: 0,
  opacity: 0.6,
});
```

### 3. COLORED_MULTI

All visible channels composited — **highest-index non-zero channel wins** (priority-based). Useful for showing multiple non-overlapping labels.

```ts
const multi = vol.getSliceImageData(50, 'z', {
  mode: RenderMode.COLORED_MULTI,
  visibleChannels: [false, true, true, true], // hide channel 0
});
```

### 4. BLENDED

All visible channels blended additively. Each channel contributes its color weighted by intensity. RGB values are clamped to 255.

```ts
const blended = vol.getSliceImageData(50, 'z', {
  mode: RenderMode.BLENDED,
  opacity: 0.8,
});
```

---

## Multi-Channel Usage

### When to Use Multiple Channels

Multiple channels are useful for storing separate annotation labels in a single volume:

| Channel | Purpose | Color |
|---------|---------|-------|
| 0 | Background | transparent |
| 1 | Primary / Tumor | Green |
| 2 | Secondary / Edema | Red |
| 3 | Tertiary / Necrosis | Blue |
| 4 | Enhancement | Yellow |

### Creating a Multi-Channel Volume

```ts
const vol = new MaskVolume(512, 512, 100, 4); // 4 channels

// Paint on channel 1 (tumor)
vol.setVoxel(100, 100, 50, 255, 1);

// Paint on channel 2 (edema)
vol.setVoxel(100, 100, 50, 200, 2);

// Render with all channels visible
const slice = vol.getSliceImageData(50, 'z', {
  mode: RenderMode.COLORED_MULTI,
});
```

### Custom Colors

```ts
import { type RGBAColor } from '../segmentation/core';

// Override a channel color
vol.setChannelColor(1, { r: 255, g: 128, b: 0, a: 200 }); // Orange

// Get current color
const color: RGBAColor = vol.getChannelColor(1);

// Use a custom color map for one render call
const slice = vol.getSliceImageData(50, 'z', {
  mode: RenderMode.COLORED_SINGLE,
  channel: 1,
  colorMap: {
    1: { r: 255, g: 128, b: 0, a: 200 },
  },
});
```

---

## Utility Methods

### Clone (Undo / Snapshot)

```ts
// Create a snapshot before an operation
const snapshot = vol.clone();

// ... perform edit ...

// Rollback if needed
vol.setRawData(snapshot.getRawData());
```

### Clear

```ts
// Clear entire volume
vol.clear();

// Clear a single slice
vol.clearSlice(50, 'z');

// Clear only channel 1 of slice 50
vol.clearSlice(50, 'z', 1);
```

### Raw Data Access

```ts
// Get the raw buffer (reference — mutations affect the volume)
const raw = vol.getRawData();

// Serialise for network transfer
socket.send(raw.buffer);

// Replace entire buffer (must match length exactly)
const restored = new Uint8Array(savedBuffer);
vol.setRawData(restored);
```

### Memory Info

```ts
const bytes = vol.getMemoryUsage();
console.log(`Volume uses ${(bytes / 1024 / 1024).toFixed(1)} MB`);
// "Volume uses 25.0 MB" for 512x512x100x1
```

---

## Migration from Legacy Storage

### Forward: IPaintImages to MaskVolume

```ts
import {
  convertIPaintImagesToVolume,
  type IPaintImages,
  type Dimensions,
} from '../segmentation/core';

const dims: Dimensions = { width: 512, height: 512, depth: 100 };
const volume = convertIPaintImagesToVolume(paintImages, dims);
```

**Behaviour:**
- Processes all three axes (z, y, x) in order
- Skips null entries and out-of-bounds indices silently
- Duplicate indices: last write wins
- Missing slices remain zero (sparse-safe)

### Backward: MaskVolume to IPaintImages

```ts
import { convertVolumeToIPaintImages } from '../segmentation/core';

// Default: Z-axis only, non-empty slices only
const legacy = convertVolumeToIPaintImages(volume);

// Include all three axes
const full = convertVolumeToIPaintImages(volume, 0, {
  includeAllAxes: true,
});

// Include empty slices too
const complete = convertVolumeToIPaintImages(volume, 0, {
  includeEmpty: true,
});
```

### Round-Trip Guarantee

Data is preserved through forward + backward conversion:

```ts
const vol = convertIPaintImagesToVolume(paintImages, dims);
const exported = convertVolumeToIPaintImages(vol);
const restored = convertIPaintImagesToVolume(exported, dims);
// restored has identical voxel data as vol
```

---

## Slice Dimensions Reference

When extracting or inserting slices, the 2D dimensions depend on the axis:

| Axis | Plane | Slice Width | Slice Height |
|------|-------|-------------|--------------|
| `'z'` | Axial | `width` | `height` |
| `'y'` | Coronal | `width` | `depth` |
| `'x'` | Sagittal | `height` | `depth` |

The mapping from 2D slice coordinates `(i, j)` to 3D volume coordinates `(x, y, z)`:

| Axis | i maps to | j maps to | sliceIndex maps to |
|------|-----------|-----------|-------------------|
| `'z'` | x | y | z |
| `'y'` | x | z | y |
| `'x'` | y | z | x |

---

## Performance Characteristics

Benchmarked on 512x512x100 volume (Vitest bench):

| Operation | Time | Notes |
|-----------|------|-------|
| Constructor | 0.19 ms | Uint8Array allocation (zero-init by spec) |
| getVoxel (1000 reads) | 0.006 ms | ~1.6x slower than raw array (bounds checking) |
| setVoxel (1000 writes) | 0.006 ms | ~1.5x slower than raw array (bounds checking) |
| getSliceImageData Z | 3.79 ms | Contiguous memory read |
| getSliceImageData Y | 0.62 ms | Strided access |
| getSliceImageData X | 0.83 ms | Strided access |
| setSliceFromImageData Z | 3.20 ms | Write back from canvas |
| clone() | 10.45 ms | Copies ~25 MB buffer |
| GRAYSCALE render | 3.22 ms | Single channel |
| COLORED_SINGLE render | 3.09 ms | Single channel + color |
| COLORED_MULTI render | 7.56 ms | All 4 channels |
| BLENDED render | 9.28 ms | All 4 channels |

**Key observations:**
- Voxel access is ~1.5x slower than raw ImageData due to bounds checking (acceptable safety trade-off)
- Multi-channel modes are 2-3x slower than single-channel (expected — iterates all channels per pixel)
- Z-axis slice extraction is the slowest because it reads `width * height` voxels (largest slice)

---

## Testing

### Run Tests

```bash
cd annotator-frontend
yarn test                  # Run all tests
yarn test:watch            # Watch mode
npx vitest bench           # Run benchmarks
```

### Test Coverage

- **MaskVolume.test.ts**: 81 tests covering constructor, voxel access, bounds checking, multi-channel, slice extraction/insertion (all 3 axes), utility methods, all 4 render modes, custom colors, visibility, opacity
- **MigrationUtils.test.ts**: 20 tests covering forward/backward conversion, sparse data, round-trip integrity, error handling
- **MaskVolume.bench.ts**: 9 benchmark groups with ImageData baselines

### Test Environment

Tests use `jsdom` with an `ImageData` polyfill (`__tests__/setup.ts`) since jsdom does not natively support `ImageData`.

---

## Design Decisions

### Why Uint8Array instead of ImageData[]?

1. **Memory efficiency**: Single contiguous buffer vs many RGBA ImageData objects
2. **Multi-axis support**: One buffer serves all three viewing planes
3. **GC pressure**: No thousands of ImageData objects to garbage-collect
4. **Serialisation**: Direct buffer transfer (no conversion needed)
5. **GPU upload**: Compatible with WebGL texture upload

### Why slice-major [z][y][x][ch] order?

- Optimises for the most common operation: axial (Z) slice extraction
- Z-slice reads are contiguous in memory (best cache locality)
- Y and X slices use strided access (still fast enough at < 1 ms)

### Why bounds checking on every voxel access?

- Medical imaging data integrity is critical
- The ~1.5x overhead is acceptable for safety
- For bulk operations (like slice extraction), the internal code uses `this.getIndex()` which can be bypassed if performance becomes critical

### Why mirror IPaintImage/IPaintImages interfaces?

- Keeps the `core/` module self-contained
- No dependency on legacy `coreTools/coreType.ts`
- Structurally compatible with the originals (TypeScript duck typing)
