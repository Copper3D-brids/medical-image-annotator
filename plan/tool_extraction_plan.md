# Tool Extraction Refactoring Plan

## Goal

Extract event handler implementations from `DrawToolCore.ts` (~2219 lines) and `DragOperator.ts` (~458 lines) into separate, focused tool files to:
1. Reduce code size in core files
2. Improve maintainability and testability
3. Enable easier feature additions

## Current State Analysis

### DrawToolCore.ts Handler Functions

| Handler | Lines | Location | Purpose |
|---------|-------|----------|---------|
| `handleOnDrawingMouseDown` | ~100 | L393-492 | Drawing start, mode detection |
| `handleOnDrawingMouseUp` | ~175 | L584-758 | Drawing end, save to layers |
| `handleOnDrawingMouseMove` | ~12 | L380-392 | Drawing stroke |
| `handleOnPanMouseMove` | ~11 | L343-353 | Canvas pan |
| `handleOnDrawingBrushCricleMove` | ~22 | L356-377 | Brush cursor preview |
| `handleMouseZoomSliceWheel` | via `configMouseZoomWheel()` | L1025+ | Zoom/slice wheel |
| `handleSphereWheel` | via `configMouseSphereWheel()` | L340+ | Sphere radius wheel |
| `handleOnContrastMouseDown/Up/Move` | ~60 | L2100-2130 | Contrast adjustment |

**paintOnCanvas()** alone spans ~600 lines (L282-877) with 7 nested function definitions.

### DragOperator.ts Handler Functions

| Handler | Lines | Location | Purpose |
|---------|-------|----------|---------|
| `handleOnDragMouseDown` | ~17 | L144-160 | Drag start |
| `handleOnDragMouseUp` | ~13 | L183-195 | Drag end |
| `handleOnDragMouseMove` | throttled | L161-180 | Slice navigation |

---

## Proposed Architecture

```
segmentation/
├── eventRouter/
│   └── EventRouter.ts              (已完成)
├── tools/
│   ├── index.ts                    [NEW] Barrel exports
│   ├── BaseTool.ts                 [NEW] Abstract base class
│   ├── PencilTool.ts               [NEW] Drawing with pencil
│   ├── BrushTool.ts                [NEW] Brush strokes + cursor preview
│   ├── EraserTool.ts               [NEW] Erasing logic
│   ├── PanTool.ts                  [NEW] Canvas panning
│   ├── ZoomTool.ts                 [NEW] Zoom wheel handling
│   ├── SliceTool.ts                [NEW] Slice navigation wheel
│   ├── DragSliceTool.ts            [NEW] Drag-based slice navigation
│   ├── ContrastTool.ts             [NEW] Contrast adjustment
│   ├── SphereTool.ts               [NEW] Sphere drawing + radius wheel
│   └── CrosshairTool.ts            [NEW] Crosshair positioning
├── DrawToolCore.ts                 [MODIFY] Reduced coordinator
├── DragOperator.ts                 [MODIFY] Reduced, uses DragSliceTool
└── NrrdTools.ts                    [UNCHANGED]
```

---

## Proposed Changes

### Phase 1: Create Tool Infrastructure

#### [NEW] BaseTool.ts

Abstract base class providing shared context:

```typescript
export interface ToolContext {
  nrrd_states: INrrdStates;
  gui_states: IGUIStates;
  protectedData: IProtected;
  canvases: ICanvases;
  ctxes: IContexts;
}

export abstract class BaseTool {
  protected ctx: ToolContext;
  abstract onActivate(): void;
  abstract onDeactivate(): void;
}
```

---

### Phase 2: Extract Drawing Tools

#### [NEW] PencilTool.ts

Extract from `handleOnDrawingMouseDown/Move/Up`:
- Line drawing logic
- Fill path logic
- Store to undo array

#### [NEW] EraserTool.ts

Extract eraser logic currently in `handleOnDrawingMouseMove`:
- `clearArc()` function
- Eraser cursor switching

---

### Phase 3: Extract Navigation Tools

#### [NEW] DragSliceTool.ts

Extract from `DragOperator.drag()`:
- `handleOnDragMouseDown`
- `handleOnDragMouseUp`
- `handleOnDragMouseMove`
- `updateIndex()` slice calculation

#### [NEW] PanTool.ts

Extract `handleOnPanMouseMove` for right-click panning.

---

### Phase 4: Extract Wheel Tools

#### [NEW] ZoomTool.ts

Extract `configMouseZoomWheel()` wheel zoom logic.

#### [NEW] SliceTool.ts

Extract `configMouseSliceWheel()` wheel slice navigation.

---

### Phase 5: Extract Specialty Tools

#### [NEW] ContrastTool.ts

Extract contrast handlers from `initContrastSettingPanel()`:
- Mouse down/up/move for contrast adjustment

#### [NEW] SphereTool.ts

Extract sphere logic from `paintOnCanvas.sphere()` and related.

---

## Dependencies & Shared State

> [!IMPORTANT]
> Main challenge: handlers access class fields via closure (`this.nrrd_states`, `this.protectedData`).

**Solution: Dependency Injection**

Each tool receives a `ToolContext` at construction:

```typescript
class PencilTool extends BaseTool {
  constructor(ctx: ToolContext) {
    super(ctx);
  }
  
  onPointerDown(e: PointerEvent) {
    // Access via this.ctx.nrrd_states instead of this.nrrd_states
  }
}
```

---

## Verification Plan

### Per-Phase Verification

1. **Build check**: `npx tsc --noEmit`
2. **Functionality test**: 
   - Drawing tools: Shift+drag to draw
   - Navigation: Drag slice, wheel zoom/slice
   - Specialty: Sphere, contrast, crosshair

### Final Verification

- All 12 original handlers work correctly
- DrawToolCore.ts reduced by ~500+ lines
- DragOperator.ts reduced by ~100+ lines

---

## Estimated Impact

| File | Before | After (est.) | Reduction |
|------|--------|--------------|-----------|
| DrawToolCore.ts | ~2219 lines | ~1500 lines | ~32% |
| DragOperator.ts | ~458 lines | ~250 lines | ~45% |
| **New tools/** | 0 | ~800 lines | (distributed) |
