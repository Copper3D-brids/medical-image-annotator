# Phase 6: Tool Coordination (ToolCoordinator) - Report

**Completed**: True
**Date**: 2026-02-04

---

## AI_error.md Check

AI_error.md 已检查，本 Phase 未违反已记录错误约束：
1. **不硬编码路径**: ToolCoordinator 不包含任何硬编码路径或文件名
2. **不 import 项目级模块**: 仅使用 `./BaseTool` 和 `../core/types` 相对导入，不依赖 `@/` 项目路径
3. **不擅自删除代码**: 仅新增文件和更新导出，未修改或删除现有功能代码
4. **遵循依赖注入模式**: 工具实例通过 `registerTool()` 注入，外部回调通过 `onArrowSlice`/`onDragSlice`/`onStateChange` 回调注入

---

## Summary

Phase 6 implements the ToolCoordinator - a centralized state machine that replaces the scattered boolean flags (`Is_Shift_Pressed`, `Is_Ctrl_Pressed`, `enableCursorChoose`, `gui_states.sphere`) across 3 different objects in the old DrawToolCore with a single class managing tool mutual-exclusion rules, input event routing, and tool lifecycle.

---

## Tasks Completed

### 6.1 ToolCoordinator Core

#### [NEW] `tools/ToolCoordinator.ts`

Centralized tool coordination with two-level mode system:

| Component | Description |
|-----------|-------------|
| **GuiTool (Level 1)** | `'pencil' \| 'brush' \| 'eraser' \| 'sphere' \| 'calculator'` - persistent GUI selection |
| **Interaction State (Level 2)** | `crosshairEnabled`, `shiftHeld`, `ctrlHeld`, `leftButtonDown`, `rightButtonDown` - temporary modifiers |
| **InteractionType** | 12 interaction types: `draw`, `pan`, `zoom`, `sliceChange`, `arrowSlice`, `crosshairClick`, `crosshairToggle`, `contrast`, `spherePlace`, `sphereWheel`, `calcPlace`, `undoRedo` |

#### Core Methods

| Method | Description |
|--------|-------------|
| `setGuiTool(tool)` | Switch GUI tool with automatic Level 2 state reset |
| `getGuiTool()` | Get current GUI tool |
| `canUse(interaction)` | Core mutual-exclusion check |
| `getAllowed()` | Get full set of currently allowed interactions |
| `isCrosshairEnabled()` | Check crosshair mode |
| `isDrawing()` | Check if actively drawing (shift + left button) |

#### State Update Methods

| Method | Description |
|--------|-------------|
| `onShiftChange(pressed)` | Update shift state (ignored in crosshair/sphere/calculator) |
| `onCtrlChange(pressed)` | Update ctrl state (ignored in crosshair/sphere/calculator/shift) |
| `onLeftButtonChange(pressed)` | Update left mouse button state |
| `onRightButtonChange(pressed)` | Update right mouse button state |
| `onCrosshairToggle()` | Toggle crosshair mode (S key) |

#### Event Dispatch Methods

| Method | Description |
|--------|-------------|
| `dispatchPointerDown(e)` | Route pointer-down to correct tool based on state |
| `dispatchPointerMove(e)` | Route pointer-move during active operations |
| `dispatchPointerUp(e)` | Route pointer-up to settle operations |
| `dispatchWheel(e)` | Route wheel to zoom/slice/sphere-radius |
| `dispatchArrowKey(direction)` | Route arrow keys for slice navigation |

#### Tool Registration

| Method | Description |
|--------|-------------|
| `registerTool(name, tool)` | Register a tool instance for dispatch |
| `unregisterTool(name)` | Remove a registered tool |
| `getTool(name)` | Retrieve a registered tool |
| `getRegisteredTools()` | List all registered tool names |

### 6.2 Mutual-Exclusion Rules Implemented

#### Drawing Tools (pencil/brush/eraser)

| State | Allowed | Blocked |
|-------|---------|---------|
| Idle (no modifiers) | zoom, sliceChange, crosshairToggle, undoRedo, pan, arrowSlice | draw, spherePlace, calcPlace, crosshairClick, contrast |
| Shift held | draw | everything else (including arrowSlice) |
| Ctrl held | contrast, undoRedo, arrowSlice | draw, zoom, sliceChange, crosshairToggle |
| Right button down | pan | everything else |
| Left button down (no modifiers) | sliceChange | everything else |
| Crosshair ON | crosshairToggle, crosshairClick, undoRedo(if !leftDown), pan(if rightDown), arrowSlice | draw, zoom, sliceChange, contrast, spherePlace |

#### Sphere

| State | Allowed | Blocked |
|-------|---------|---------|
| Idle | zoom, sliceChange, pan, undoRedo, arrowSlice, spherePlace, sphereWheel | draw, crosshairClick, crosshairToggle, contrast |
| Left button down | spherePlace, sphereWheel | zoom, pan, sliceChange, arrowSlice, everything else |

#### Calculator

| State | Allowed | Blocked |
|-------|---------|---------|
| Idle | zoom, sliceChange, pan, undoRedo, arrowSlice, calcPlace | draw, crosshairClick, crosshairToggle, contrast |
| Left button down | calcPlace, arrowSlice | zoom, pan, sliceChange, everything else |

#### arrowSlice Summary

| Blocked Condition | Reason |
|-------------------|--------|
| Shift held | Drawing mode - prevent accidental slice switch |
| Sphere + left button down | Sphere placement with radius adjustment |
| All other states | Allowed |

### 6.3 State Transitions

| Event | Condition | Action |
|-------|-----------|--------|
| **S key** | drawing tool, !shift, !ctrl | Toggle crosshairEnabled |
| **Shift down** | !crosshair, drawing tool, !ctrl | shiftHeld = true |
| **Shift up** | shiftHeld | shiftHeld = false; settle drawing if leftDown |
| **Ctrl down** | !crosshair, drawing tool, !shift | ctrlHeld = true |
| **Ctrl up** | ctrlHeld | ctrlHeld = false |
| **GUI tool switch to sphere/calculator** | any | Reset crosshair, shift, ctrl; deactivate/activate tools |
| **GUI tool switch drawing↔drawing** | drawing tool | Just swap guiTool, keep Level 2 state |

### 6.4 Event Routing

```
PointerDown(left):
  crosshairEnabled → CrosshairTool.onPointerDown()
  shiftHeld + drawing → DrawingTool.onPointerDown()
  ctrlHeld → ContrastTool.onPointerDown()
  sphere mode → SphereTool.onPointerDown()
  calculator mode → SphereTool.onPointerDown(calc)
  else → DragOperator (external via onDragSlice)

PointerDown(right):
  → PanTool.onPointerDown()

Wheel:
  sphere + leftDown → SphereTool.onWheel() (radius)
  shiftHeld/ctrlHeld/crosshairEnabled → blocked
  else → ZoomTool.onWheel()

ArrowKey:
  canUse('arrowSlice') → onArrowSlice callback
```

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Two-level mode system** | Level 1 (GuiTool) is persistent from UI; Level 2 (modifiers) is temporary. Separation makes state management predictable and testable. |
| **`canUse()` centralized check** | Single point of truth for all mutual-exclusion rules. No scattered if/return chains across event handlers. |
| **Drawing tool switch preserves Level 2** | Switching Pencil↔Brush↔Eraser should not affect crosshair/shift/ctrl state, matching existing DrawToolCore behavior. |
| **Shift release settlement** | When shift is released while left button is held during drawing, the drawing tool's `onPointerUp` is called to finalize the stroke. |
| **Shift/Ctrl mutual blocking** | Shift and Ctrl cannot be active simultaneously - if one is held, the other is ignored. Prevents ambiguous state. |
| **Callback pattern for external actions** | `onArrowSlice`, `onDragSlice`, `onStateChange` are callbacks (not adapters) because they are simple event notifications, not complex interface contracts. |
| **Tool registration by name** | Tools are registered by string name and retrieved for dispatch. This allows the coordinator to work with any BaseTool subclass without direct imports. |

---

## Edge Cases: Simultaneous Key Combinations

用户可能同时按下多个修饰键（Shift、Ctrl、S、Arrow 等）。以下分析 ToolCoordinator 对每种组合的处理方式。

### 核心防御机制

`onShiftChange` 和 `onCtrlChange` 各有 3 道门卫：

```typescript
// onShiftChange (line 296-298)
if (this.crosshairEnabled) return;           // 门卫 1: Crosshair ON → 忽略
if (!DRAWING_TOOLS.has(this.guiTool)) return; // 门卫 2: Sphere/Calculator → 忽略
if (this.ctrlHeld) return;                    // 门卫 3: Ctrl 已按 → 忽略

// onCtrlChange (line 317-319)
if (this.crosshairEnabled) return;           // 门卫 1: Crosshair ON → 忽略
if (!DRAWING_TOOLS.has(this.guiTool)) return; // 门卫 2: Sphere/Calculator → 忽略
if (this.shiftHeld) return;                   // 门卫 3: Shift 已按 → 忽略
```

Shift 和 Ctrl 之间采用**先到先得**互斥：浏览器的 keydown 事件是串行的，先到的占位，后到的被 `return` 拦截。

### `onCrosshairToggle` (S 键) 门卫

```typescript
// onCrosshairToggle (line 350-351)
if (!DRAWING_TOOLS.has(this.guiTool)) return; // 非 Drawing 工具 → 忽略
if (this.shiftHeld || this.ctrlHeld) return;   // 修饰键按住 → 忽略
```

### 组合键行为矩阵

| 组合 | 结果 | 代码路径 |
|------|------|----------|
| **Shift + Ctrl** | 先到先得，后者被忽略 | `onShiftChange` 门卫 3 / `onCtrlChange` 门卫 3 |
| **Shift + S** | S 被忽略，crosshair 不 toggle | `onCrosshairToggle` 检查 `shiftHeld` |
| **Ctrl + S** | S 被忽略，crosshair 不 toggle | `onCrosshairToggle` 检查 `ctrlHeld` |
| **Shift + Arrow ↑/↓** | Arrow 被禁止 | `canUse('arrowSlice')`: `if (this.shiftHeld) return false` |
| **Ctrl + Arrow ↑/↓** | Arrow 允许 | `canUse('arrowSlice')` 不检查 `ctrlHeld` |
| **Ctrl + Z** | undoRedo 允许 | `canUse('undoRedo')` 在 ctrlHeld 区返回 `true` |
| **Shift + Ctrl + Z** | undo 被禁止 | Shift 先到 → Ctrl 被忽略 → shiftHeld 区只允许 `draw` |
| **Shift + Ctrl + S** | 无效果 | Shift 先到 → Ctrl 被忽略; S 被 `shiftHeld` 拦截 |
| **Crosshair ON + Shift** | Shift 被忽略 | `onShiftChange` 门卫 1: `crosshairEnabled` |
| **Crosshair ON + Ctrl** | Ctrl 被忽略 | `onCtrlChange` 门卫 1: `crosshairEnabled` |
| **Crosshair ON + S** | 关闭 crosshair | toggle 正常执行 (shift/ctrl 均为 false) |
| **Crosshair ON + Arrow** | Arrow 允许 | `canUse('arrowSlice')` 在 crosshair 检查之前，不检查 crosshairEnabled |
| **Sphere + Shift** | Shift 被忽略 | `onShiftChange` 门卫 2: 非 DRAWING_TOOLS |
| **Sphere + Ctrl** | Ctrl 被忽略 | `onCtrlChange` 门卫 2: 非 DRAWING_TOOLS |
| **Sphere + S** | S 被忽略 | `onCrosshairToggle` 门卫: 非 DRAWING_TOOLS |

### 设计原则

1. **不可能出现矛盾状态**：Shift/Ctrl 互斥门卫确保两者不会同时为 `true`
2. **Crosshair 最优先**：Crosshair ON 时所有修饰键被静默忽略，只有 S 键能退出
3. **arrowSlice 最宽容**：`canUse('arrowSlice')` 在所有规则检查之前执行，仅被 Shift 和 Sphere+leftDown 阻止
4. **Sphere/Calculator 隔离**：门卫 2 确保非 Drawing 工具模式下 Shift/Ctrl/S 键完全无效

---

## Files Created

| File | Lines | Description |
|------|-------|-------------|
| `tools/ToolCoordinator.ts` | 406 | Centralized tool coordination with two-level mode system |
| `__tests__/coordinator.test.ts` | 601 | 84 unit tests |

---

## Files Modified

| File | Change |
|------|--------|
| `tools/index.ts` | Added ToolCoordinator, GuiTool, InteractionType, StateChangeCallback, ArrowSliceCallback, DragSliceCallback exports |
| `core/index.ts` | Added Phase 6 exports for ToolCoordinator types |
| `plan/task.md` | Marked Phase 6 tasks as completed |
| `plan/implementation_plan.md` | Marked Phase 6 as completed, updated file structure |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                Phase 6: ToolCoordinator                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Level 1: GUI Tool Selection                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐│
│  │  Pencil  │ │  Brush   │ │  Eraser  │ │  Sphere  │ │ Calculator ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────────┘│
│                                                                      │
│  Level 2: Interaction State                                          │
│  ┌────────────────┐ ┌──────────────────┐ ┌──────────────────┐       │
│  │ Crosshair: T/F │ │ Shift: held/up   │ │ Ctrl: held/up    │       │
│  └────────────────┘ └──────────────────┘ └──────────────────┘       │
│  ┌──────────────────┐ ┌──────────────────┐                           │
│  │ Left btn: dn/up  │ │ Right btn: dn/up │                           │
│  └──────────────────┘ └──────────────────┘                           │
│                                                                      │
│  canUse(interaction) → boolean                                       │
│  getAllowed() → Set<InteractionType>                                  │
│                                                                      │
│  Event Dispatch:                                                     │
│  ├── dispatchPointerDown(e) → routes to correct tool                 │
│  ├── dispatchPointerMove(e) → routes during active operations        │
│  ├── dispatchPointerUp(e)   → settles operations                     │
│  ├── dispatchWheel(e)       → zoom / slice / sphere radius           │
│  └── dispatchArrowKey(dir)  → slice navigation                       │
│                                                                      │
│  Callbacks:                                                          │
│  ├── onStateChange(allowed, guiTool, crosshairEnabled)               │
│  ├── onArrowSlice(direction)                                         │
│  └── onDragSlice(e)                                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Comparison with DrawToolCore

```
Old (DrawToolCore)                   New (ToolCoordinator)
┌──────────────────────────┐        ┌──────────────────────────┐
│ nrrd_states.Is_Shift     │        │ shiftHeld                │
│ protectedData.Is_Ctrl    │   →    │ ctrlHeld                 │
│ gui_states.sphere        │        │ guiTool = 'sphere'       │
│ enableCursorChoose       │        │ crosshairEnabled         │
│ (scattered in 3 objects) │        │ (all in 1 class)         │
├──────────────────────────┤        ├──────────────────────────┤
│ if/return chains         │        │ canUse(interaction)      │
│ in event handlers        │   →    │ centralized check        │
├──────────────────────────┤        ├──────────────────────────┤
│ No way to query          │        │ getAllowed()             │
│ "what's allowed now?"    │   →    │ returns full allowed set │
├──────────────────────────┤        ├──────────────────────────┤
│ No UI notification       │        │ onStateChange callback   │
│ on state change          │   →    │ drives UI updates        │
└──────────────────────────┘        └──────────────────────────┘
```

---

## Test Verification

```
 ✓ src/ts/Utils/segmentation/__tests__/coordinator.test.ts (84 tests) 33ms

   ✓ ToolCoordinator > Drawing + Shift mutual exclusion (8)
     ✓ should default to pencil guiTool
     ✓ should allow zoom, sliceChange, crosshairToggle in idle state
     ✓ should allow only draw when shift is held
     ✓ should block arrowSlice when shift is held
     ✓ should restore idle permissions when shift is released
     ✓ should block undoRedo when shift is held
     ✓ should block spherePlace and calcPlace in drawing tool mode
     ✓ should only allow pan when right button is down in drawing mode

   ✓ ToolCoordinator > Drawing + Ctrl mutual exclusion (6)
     ✓ should allow contrast when ctrl is held
     ✓ should allow undoRedo when ctrl is held
     ✓ should block draw, zoom, sliceChange when ctrl is held
     ✓ should allow arrowSlice when ctrl is held
     ✓ should ignore ctrl if shift is already held
     ✓ should ignore shift if ctrl is already held

   ✓ ToolCoordinator > Crosshair mutual exclusion (10)
     ✓ should toggle crosshair on via onCrosshairToggle
     ✓ should toggle crosshair off on second toggle
     ✓ should allow crosshairToggle when crosshair is ON
     ✓ should allow crosshairClick when crosshair is ON
     ✓ should allow undoRedo when crosshair ON and left button up
     ✓ should block undoRedo when crosshair ON and left button down
     ✓ should block draw, zoom, sliceChange, contrast when crosshair is ON
     ✓ should allow arrowSlice when crosshair is ON
     ✓ should allow pan when crosshair ON and right button down
     ✓ should block pan when crosshair ON and right button up

   ✓ ToolCoordinator > Sphere mutual exclusion (8)
     ✓ should permanently block draw, crosshair, contrast in sphere mode
     ✓ should allow zoom, sliceChange, arrowSlice, undoRedo when idle in sphere mode
     ✓ should allow spherePlace and sphereWheel when left button down in sphere mode
     ✓ should block zoom, pan, sliceChange when left button down in sphere mode
     ✓ should block arrowSlice when left button down in sphere mode
     ✓ should allow pan when right button down in sphere mode
     ✓ should ignore shift and ctrl in sphere mode
     ✓ should ignore crosshair toggle in sphere mode

   ✓ ToolCoordinator > Calculator mutual exclusion (6)
     ✓ should permanently block draw, crosshair, contrast in calculator mode
     ✓ should allow zoom, sliceChange, arrowSlice, undoRedo when idle in calculator mode
     ✓ should allow calcPlace when left button down in calculator mode
     ✓ should block spherePlace/sphereWheel in calculator mode
     ✓ should allow arrowSlice when left button down in calculator mode (unlike sphere)
     ✓ should ignore shift, ctrl, crosshair toggle in calculator mode

   ✓ ToolCoordinator > GUI tool switching (6)
     ✓ should switch between drawing tools without resetting crosshair
     ✓ should reset crosshair when switching from drawing to sphere
     ✓ should reset shift/ctrl when switching to sphere
     ✓ should call deactivate on old tool and activate on new tool
     ✓ should not call deactivate/activate when switching between drawing tools
     ✓ should be a no-op when setting the same guiTool

   ✓ ToolCoordinator > State transitions (8)
     ✓ should update leftButtonDown on onLeftButtonChange
     ✓ should update rightButtonDown on onRightButtonChange
     ✓ should report isDrawing when shift + left button down
     ✓ should not report isDrawing when only shift or only left button
     ✓ should not report isDrawing in sphere mode even with shift+left
     ✓ should fire onStateChange on shift change
     ✓ should fire onStateChange on ctrl change
     ✓ should settle drawing on shift release if left button is down

   ✓ ToolCoordinator > Event routing (8)
     ✓ should route right-click to pan tool
     ✓ should route left-click to drawing tool when shift held
     ✓ should route left-click to crosshair when crosshair enabled
     ✓ should route left-click to contrast when ctrl held
     ✓ should route left-click to sphere tool in sphere mode
     ✓ should route wheel to zoom tool in idle drawing mode
     ✓ should route wheel to sphere tool when sphere + left button down
     ✓ should dispatch arrow key to onArrowSlice callback

   ✓ ToolCoordinator > arrowSlice availability (6)
     ✓ should allow arrowSlice in idle drawing mode
     ✓ should block arrowSlice when shift held
     ✓ should block arrowSlice when sphere + left button down
     ✓ should allow arrowSlice when sphere + left button up
     ✓ should allow arrowSlice when calculator + left button down
     ✓ should allow arrowSlice when crosshair ON

   ✓ ToolCoordinator > Edge cases (5)
     ✓ should handle rapid shift toggle
     ✓ should handle rapid crosshair toggle
     ✓ should handle dispatchPointerUp for right button correctly
     ✓ should handle resetInteractionState
     ✓ should return correct allowed set via getAllowed

   ✓ ToolCoordinator > Tool registration (3)
     ✓ should register and retrieve tools
     ✓ should unregister tools
     ✓ should list all registered tool names

   ✓ ToolCoordinator > Pointer move routing (5)
     ✓ should route move to pan tool when right button held
     ✓ should route move to drawing tool when shift + left button
     ✓ should route move to crosshair when crosshair + left button
     ✓ should route move to contrast when ctrl + left button
     ✓ should call onDragSlice when left button with no modifier in drawing mode

   ✓ ToolCoordinator > Wheel event blocking (3)
     ✓ should block wheel when shift is held
     ✓ should block wheel when ctrl is held
     ✓ should block wheel when crosshair is ON

   ✓ ToolCoordinator > Drawing idle left-drag (2)
     ✓ should allow sliceChange on left button down with no modifiers
     ✓ should block sliceChange when crosshair is ON
```

### All Tests Summary

```
 Test Files  5 passed (5)
      Tests  289 passed (289)
   Duration  4.91s

   core.test.ts:        46 tests ✅
   tools.test.ts:       67 tests ✅
   rendering.test.ts:   45 tests ✅
   crosshair.test.ts:   47 tests ✅
   coordinator.test.ts: 84 tests ✅ (NEW)
```

---

## Build Verification

```bash
$ yarn build
✓ built in 15.13s
# dist/my-app.umd.js  2,215.02 kB │ gzip: 682.83 kB
```

Bundle size unchanged from Phase 5 (2,215.02 kB) - new ToolCoordinator code is tree-shaken since it's not yet integrated into the main rendering pipeline.

---

## Pre-existing TypeScript Errors (Unrelated to Phase 6)

Same as Phase 2/3/4/5:
- `node_modules/@msgpack/msgpack`: Uint8Array generic type issue
- `node_modules/@vitejs/plugin-vue`: SFCScriptCompileOptions type mismatch
- `node_modules/vuetify`: GlobalComponents type constraint issues
- `node_modules/copper3d`: Missing three.js type declarations
- `LeftPanelController.vue`: NrrdTools type mismatch between local and package

---

## Code Migration Mapping Update

| 现有功能 | 现有位置 | 新位置 | 状态 |
|---------|---------|--------|------|
| **Tool互斥管理** | `DrawToolCore` scattered booleans (Is_Shift_Pressed, Is_Ctrl_Pressed, enableCursorChoose) | `ToolCoordinator.canUse()` | ✅ Phase 6 |
| **事件路由** | `DrawToolCore.start()` + `handleOnDrawingMouseDown/Move/Up` | `ToolCoordinator.dispatchPointer*()` | ✅ Phase 6 |
| **工具生命周期** | Implicit in DrawToolCore | `ToolCoordinator.setGuiTool()` with deactivate/activate | ✅ Phase 6 |
| **滚轮路由** | `DrawToolCore.configMouseZoomWheel` + `configMouseSphereWheel` | `ToolCoordinator.dispatchWheel()` | ✅ Phase 6 |
| **Arrow键切换slice** | Scattered in DrawToolCore keydown handlers | `ToolCoordinator.dispatchArrowKey()` | ✅ Phase 6 |
| **状态通知UI** | None (Vue directly reads flags) | `ToolCoordinator.onStateChange` callback | ✅ Phase 6 |

---

## Known Issues

None specific to Phase 6.

---

## External Usage Examples

### 1. 初始化 ToolCoordinator

```typescript
import {
    ToolCoordinator,
    PencilTool,
    BrushTool,
    EraserTool,
    PanTool,
    ZoomTool,
    ContrastTool,
    SphereTool,
    CrosshairTool,
} from '@/ts/Utils/segmentation/core';

// 创建 Coordinator
const coordinator = new ToolCoordinator();

// 注册所有工具实例
coordinator.registerTool('pencil', pencilTool);
coordinator.registerTool('brush', brushTool);
coordinator.registerTool('eraser', eraserTool);
coordinator.registerTool('pan', panTool);
coordinator.registerTool('zoom', zoomTool);
coordinator.registerTool('contrast', contrastTool);
coordinator.registerTool('sphere', sphereTool);
coordinator.registerTool('crosshair', crosshairTool);
```

### 2. 绑定事件

```typescript
// Canvas 事件绑定
canvas.addEventListener('pointerdown', (e) => {
    const deltas = coordinator.dispatchPointerDown(e);
    if (deltas.length > 0) {
        undoManager.push(deltas);
        autoSave.addChanges(deltas);
    }
});

canvas.addEventListener('pointermove', (e) => {
    coordinator.dispatchPointerMove(e);
});

canvas.addEventListener('pointerup', (e) => {
    const deltas = coordinator.dispatchPointerUp(e);
    if (deltas.length > 0) {
        undoManager.push(deltas);
        autoSave.addChanges(deltas);
    }
});

canvas.addEventListener('wheel', (e) => {
    coordinator.dispatchWheel(e);
});
```

### 3. 键盘事件

```typescript
document.addEventListener('keydown', (e) => {
    if (e.key === 'Shift') coordinator.onShiftChange(true);
    if (e.key === 'Control') coordinator.onCtrlChange(true);
    if (e.key === 's' || e.key === 'S') coordinator.onCrosshairToggle();
    if (e.key === 'ArrowUp') coordinator.dispatchArrowKey('up');
    if (e.key === 'ArrowDown') coordinator.dispatchArrowKey('down');
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') coordinator.onShiftChange(false);
    if (e.key === 'Control') coordinator.onCtrlChange(false);
});
```

### 4. GUI 工具切换

```typescript
// Vue 组件中
function onToolSelect(tool: 'pencil' | 'brush' | 'eraser' | 'sphere' | 'calculator') {
    coordinator.setGuiTool(tool);
}
```

### 5. 状态变化监听

```typescript
coordinator.onStateChange = (allowed, guiTool, crosshairEnabled) => {
    // 更新 UI 按钮状态
    undoButton.disabled = !allowed.has('undoRedo');
    zoomSlider.disabled = !allowed.has('zoom');
    crosshairIndicator.active = crosshairEnabled;
    activeToolLabel.text = guiTool;
};
```

### 6. 查询当前状态

```typescript
// 检查某个交互是否允许
if (coordinator.canUse('draw')) {
    showDrawingCursor();
}

// 获取全部允许的交互
const allowed = coordinator.getAllowed();
console.log('Currently allowed:', [...allowed]);
```

---

## Next Steps

After user confirms:
→ Proceed to **Phase 7: Integration** (SegmentationManager, StateManager, Vue component updates)
