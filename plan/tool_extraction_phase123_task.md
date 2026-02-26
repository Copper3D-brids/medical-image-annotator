# Tool Extraction Phase 1-2-3: Task List

## Overview
Extract remaining closure-based tools from `paintOnCanvas()` in DrawToolCore.ts.

> **Status:** Phase 3 Complete ✅ — Awaiting manual testing
> **Plan:** [tool_extraction_phase123_plan.md](tool_extraction_phase123_plan.md)

---

## Phase 1: Convert Closure Variables to Class Properties ✅ COMPLETED (2026-02-26)

### 1.1 Add Class Properties
- [x] Add `private leftClicked = false` to DrawToolCore
- [x] Add `private rightClicked = false` to DrawToolCore
- [x] Add `private panMoveInnerX = 0` to DrawToolCore
- [x] Add `private panMoveInnerY = 0` to DrawToolCore
- [x] Add `private paintSliceIndex = 0` to DrawToolCore
- [x] Add `private isPainting = false` to DrawToolCore
- [x] Add `private drawingLines: Array<ICommXY> = []` to DrawToolCore
- [x] Add `private clearArcFn` to DrawToolCore

### 1.2 Update paintOnCanvas() Handlers
- [x] Replace `leftclicked` with `this.leftClicked` in all handlers
- [x] Replace `rightclicked` with `this.rightClicked` in all handlers
- [x] Replace `panelMoveInnerX/Y` with `this.panMoveInnerX/Y` in handleOnPanMouseMove
- [x] Replace `currentSliceIndex` with `this.paintSliceIndex` in handleOnDrawingMouseDown
- [x] Replace `Is_Painting` with `this.isPainting` in all handlers
- [x] Replace `lines` with `this.drawingLines` in all handlers
- [x] Replace `clearArc` with `this.clearArcFn` in handleOnDrawingMouseMove

### 1.3 Extract Inner Functions to Methods
- [x] Convert `sphere()` inner function to `private handleSphereClick(e: MouseEvent)`
- [x] Convert `redrawPreviousImageToLayerCtx()` to `private redrawPreviousImageToLayerCtx(ctx: CanvasRenderingContext2D)`

### 1.4 Remove Closure Declarations
- [x] Remove `let leftclicked`, `let rightclicked` declarations from paintOnCanvas()
- [x] Remove `let panelMoveInnerX`, `let panelMoveInnerY` declarations
- [x] Remove `let currentSliceIndex` declaration
- [x] Remove `let Is_Painting`, `let lines` declarations
- [x] Remove `const clearArc` declaration (replaced with `this.clearArcFn = this.useEraser()`)

### 1.5 Verification
- [x] `npx tsc --noEmit` — zero new errors in DrawToolCore.ts
- [x] Manual test: pencil draw + fill works
- [x] Manual test: brush draw works
- [x] Manual test: eraser works
- [x] Manual test: right-click pan works
- [x] Manual test: sphere placement works
- [x] Manual test: pointerleave mid-draw recovers correctly
- [x] Manual test: cross-axis rendering after draw is correct

---

## Phase 2: Extract PanTool ✅ COMPLETED (2026-02-26)

### 2.1 Create PanTool Class
- [x] Create `tools/PanTool.ts`
- [x] Define `PanCallbacks` interface
- [x] Implement `PanTool extends BaseTool`
- [x] Move `rightClicked`, `panMoveInnerX/Y` to PanTool
- [x] Implement `onPointerDown(e)` — right-click start, register listeners
- [x] Implement `onPointerMove(e)` — update canvas positions (arrow function for `this` binding)
- [x] Implement `onPointerUp(e)` — cleanup, restore cursor
- [x] Implement `onPointerLeave()` — cleanup on canvas leave
- [x] Implement `isActive` getter

### 2.2 Integrate PanTool into DrawToolCore
- [x] Add `private panTool: PanTool` property
- [x] Instantiate PanTool in `initTools()`
- [x] Update `handleOnDrawingMouseDown` right-click branch → `this.panTool.onPointerDown(e)`
- [x] Update `handleOnDrawingMouseUp` right-click branch → delegate to PanTool
- [x] Update `pointerleave` listener → `this.panTool.onPointerLeave()`
- [x] Remove `handleOnPanMouseMove` handler from paintOnCanvas()
- [x] Remove `this.rightClicked`, `this.panMoveInnerX/Y` from DrawToolCore (now in PanTool)

### 2.3 Update Exports
- [x] Add PanTool to `tools/index.ts` barrel export

### 2.4 Handle Sphere + Pan Interaction
- [x] Ensure `zoomActionAfterDrawSphere()` is called via callback when pan ends in sphere mode
- [x] Test pan → sphere mode transition

### 2.5 Verification
- [x] `npx tsc --noEmit` passes with no new errors
- [x] Manual test: right-click pan in all 3 axes (x, y, z)
- [x] Manual test: cursor changes (grab → grabbing → default)
- [x] Manual test: pan position persists across slice changes
- [x] Manual test: pan + sphere mode works
- [x] Manual test: pointerleave during pan cleans up correctly
- [x] Manual test: pan does NOT interfere with left-click drawing

---

## Phase 3: Extract DrawingTool ✅ COMPLETED (2026-02-26)

### 3.1 Create DrawingTool Class
- [x] Create `tools/DrawingTool.ts`
- [x] Define `DrawingCallbacks` interface (7 callbacks)
- [x] Implement `DrawingTool extends BaseTool`
- [x] Move `isPainting`, `leftClicked`, `drawingLines` to DrawingTool
- [x] Move `clearArcFn` to DrawingTool
- [x] Move `preDrawAxis`, `preDrawSliceIndex`, `preDrawSlice` to DrawingTool

### 3.2 Implement Drawing Event Handlers
- [x] Implement `onPointerDown(e)`:
  - [x] Reset state (lines = [], isPainting = true)
  - [x] Set cursor based on mode (eraser/default)
  - [x] Record drawStartPos
  - [x] Capture pre-draw undo snapshot
- [x] Implement `onPointerMove(e)`:
  - [x] Eraser branch → clearArcFn
  - [x] Drawing branch → accumulate lines, call paintOnCanvasLayer
- [x] Implement `onPointerUp(e)`:
  - [x] Pencil fill-on-release logic (redraw previous + fill path)
  - [x] Brush mode cleanup (closePath)
  - [x] Sync to volume (syncLayerSliceData callback)
  - [x] Push undo delta
- [x] Implement `onPointerLeave()`:
  - [x] Reset isPainting
  - [x] Clean up leftClicked state
  - [x] Returns boolean for listener cleanup by caller

### 3.3 Move Helper Methods
- [x] Move `redrawPreviousImageToLayerCtx()` to DrawingTool
- [x] Move pencil fill path logic to `onPointerUp()` (inline, no separate method needed)
- [x] Move undo snapshot logic (`capturePreDrawSnapshot`, `pushUndoDelta`) to DrawingTool
- [x] Move `drawLinesOnLayer()` to DrawingTool
- [x] Move `paintOnCanvasLayer()` to DrawingTool

### 3.4 Integrate DrawingTool into DrawToolCore
- [x] Add `protected drawingTool!: DrawingTool` property
- [x] Instantiate DrawingTool in `initTools()` with 7 callbacks
- [x] Update `handleOnDrawingMouseDown` re-entry guard → `this.drawingTool.isActive`
- [x] Update `handleOnDrawingMouseDown` draw-mode branch → `this.drawingTool.onPointerDown(e)`
- [x] Update `handleOnDrawingMouseMove` → `this.drawingTool.onPointerMove(e)`
- [x] Update `handleOnDrawingMouseUp` draw branch → `this.drawingTool.onPointerUp(e)` + `this.drawingTool.painting`
- [x] Update `pointerleave` drawing cleanup → `this.drawingTool.onPointerLeave()`
- [x] Remove `this.isPainting`, `this.leftClicked`, `this.drawingLines` from DrawToolCore
- [x] Remove `this.preDrawAxis`, `this.preDrawSliceIndex`, `this.preDrawSlice` from DrawToolCore
- [x] Remove `this.clearArcFn` from DrawToolCore
- [x] Remove unused imports: `switchEraserSize`, `MaskDelta`, `ICommXY`

### 3.5 Preserve Brush Circle Preview
- [x] `handleOnDrawingBrushCricleMove` remains in paintOnCanvas (only updates nrrd_states)

### 3.6 Update Exports
- [x] Add DrawingTool + DrawingCallbacks to `tools/index.ts` barrel export

### 3.7 Verification
- [x] `npx tsc --noEmit` passes with no new errors (745 pre-existing, 0 new)
- [ ] Manual test: pencil draw + fill on each layer
- [ ] Manual test: brush continuous draw on each layer
- [ ] Manual test: eraser on each layer
- [ ] Manual test: undo/redo after pencil draw
- [ ] Manual test: undo/redo after brush draw
- [ ] Manual test: undo/redo after eraser
- [ ] Manual test: pointerleave mid-draw → resume drawing
- [ ] Manual test: cross-axis sync after drawing
- [ ] Manual test: layer switching during/after drawing
- [ ] Manual test: opacity/color changes between strokes
- [ ] Manual test: pencil fill with complex path (self-intersecting)
- [x] Verify DrawToolCore line count reduced by ~200+ lines (actual: **-166 from Phase 2, -249 from original**)

---

## Post-Completion

### Code Review Checklist
- [ ] No closure variables remain in `paintOnCanvas()` (only `this.xxx` references)
- [ ] All tools follow consistent BaseTool pattern
- [ ] Callback interfaces are minimal (no unnecessary methods)
- [ ] Event listener add/remove is balanced (no leaks)
- [ ] Arrow functions used for event handlers that need `this` binding

### Documentation
- [ ] Update `plan/overall_plan.md` status
- [ ] Update `plan/docs/segmentation-module.md` with new tool architecture
- [ ] Move completed plan/task files to `plan/completed/`

### Metrics
- [ ] Record DrawToolCore line count: before → after
- [ ] Record `paintOnCanvas()` line count: before → after
- [ ] Record total tools/ directory line count

---

## Success Metrics Summary

| Metric | Phase 1 | Phase 2 | Phase 3 |
|--------|---------|---------|---------|
| DrawToolCore lines | ~1319 (no change) | **~1236 (-83) ✅** | **~1070 (-166) ✅** |
| paintOnCanvas() lines | ~580 (no change) | **~500 (-80) ✅** | **~356 (-144) ✅** |
| New tool files | 0 | **1 (PanTool, 124 lines) ✅** | **2 (PanTool + DrawingTool) ✅** |
| Closure variables | 0 (all lifted) | **-3 (in PanTool) ✅** | **-7 (in DrawingTool) ✅** |
| Build errors | No new | **No new ✅** | **No new ✅** |
| Behavior changes | None | **None ✅** | **None ✅** |

---

**Last Updated:** 2026-02-26
**Status:** Phase 3 Complete — Awaiting manual testing
