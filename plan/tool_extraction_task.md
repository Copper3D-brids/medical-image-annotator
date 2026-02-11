# Tool Extraction Task List

## Overview
Extract event handler implementations from DrawToolCore.ts and DragOperator.ts into separate tool files.

---

## Phase 1: Tool Infrastructure
- [ ] Create `tools/` directory
- [ ] Create `BaseTool.ts` with ToolContext interface
- [ ] Create `index.ts` barrel export
- [ ] Build verification

---

## Phase 2: Extract Drawing Tools
- [ ] Create `PencilTool.ts`
  - [ ] Move line drawing from `handleOnDrawingMouseDown`
  - [ ] Move stroke logic from `handleOnDrawingMouseMove`
  - [ ] Move save logic from `handleOnDrawingMouseUp`
- [ ] Create `BrushTool.ts`
  - [ ] Move `handleOnDrawingBrushCricleMove`
- [ ] Create `EraserTool.ts`
  - [ ] Move `clearArc()` and eraser logic
- [ ] Update DrawToolCore to use new tools
- [ ] Build verification
- [ ] Functional test: drawing, erasing

---

## Phase 3: Extract Navigation Tools
- [ ] Create `DragSliceTool.ts`
  - [ ] Move `handleOnDragMouseDown/Up/Move`
  - [ ] Move `updateIndex()` slice calculation
- [ ] Create `PanTool.ts`
  - [ ] Move `handleOnPanMouseMove`
- [ ] Update DragOperator to use DragSliceTool
- [ ] Update DrawToolCore to use PanTool
- [ ] Build verification
- [ ] Functional test: drag slice, pan

---

## Phase 4: Extract Wheel Tools
- [ ] Create `ZoomTool.ts`
  - [ ] Move `configMouseZoomWheel()` logic
- [ ] Create `SliceTool.ts`
  - [ ] Move `configMouseSliceWheel()` logic
- [ ] Update DrawToolCore wheel handler references
- [ ] Build verification
- [ ] Functional test: wheel zoom, wheel slice

---

## Phase 5: Extract Specialty Tools
- [ ] Create `ContrastTool.ts`
  - [ ] Move contrast mouse handlers
- [ ] Create `SphereTool.ts`
  - [ ] Move sphere logic and wheel handler
- [ ] Create `CrosshairTool.ts`
  - [ ] Move crosshair positioning logic
- [ ] Update DrawToolCore references
- [ ] Build verification
- [ ] Functional test: contrast, sphere, crosshair

---

## Phase 6: Cleanup & Documentation
- [ ] Remove dead code from DrawToolCore.ts
- [ ] Remove dead code from DragOperator.ts
- [ ] Update exec_eventlistener.md report
- [ ] Final line count comparison
- [ ] Full regression test

---

## Success Metrics
- [ ] DrawToolCore.ts ≤ 1500 lines (from ~2219)
- [ ] DragOperator.ts ≤ 250 lines (from ~458)
- [ ] All original functionality preserved
- [ ] Build passes with no new errors
