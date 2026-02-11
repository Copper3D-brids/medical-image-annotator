# Phase 5: Crosshair & Sphere Tools - Report

**Completed**: True
**Date**: 2026-02-04

---

## AI_error.md Check

AI_error.md 已检查，本 Phase 未违反已记录错误约束：
1. **不硬编码路径**: CrosshairTool 不包含任何硬编码路径，所有外部依赖通过 CrosshairAdapter 注入
2. **不 import 项目级模块**: 仅使用 `../core/types` 和 `./BaseTool` 相对导入，不依赖 `@/` 项目路径
3. **不擅自删除代码**: 仅新增文件和更新导出，未修改或删除现有功能代码
4. **遵循依赖注入模式**: 跨轴坐标转换通过 `CrosshairAdapter` 接口注入，与 SphereAdapter 模式一致

---

## Summary

Phase 5 implements the CrosshairTool for cross-view positioning in the segmentation module. This tool enables users to click on any axis view, record a 3D voxel coordinate, display perpendicular dashed crosshair lines, and navigate to the corresponding position on other axis views via adapter-based coordinate conversion.

SphereTool was already fully implemented in Phase 3 (4 types, scroll radius, 3D application, cross-axis via SphereAdapter). Phase 5 confirms its completeness.

---

## Tasks Completed

### 5.1 CrosshairTool

#### [NEW] `tools/CrosshairTool.ts`

Cross-view positioning tool migrated from DrawToolCore's crosshair logic:

| Method | Description |
|--------|-------------|
| `setAdapter(adapter)` | Inject CrosshairAdapter for cross-axis conversion |
| `toggle()` | Toggle crosshair mode on/off (S key) |
| `enable()` / `disable()` | Explicit enable/disable with state cleanup |
| `isEnabled()` | Check if crosshair mode is active |
| `onPointerDown(e)` | Record 3D coordinate, draw crosshair lines |
| `onPointerMove(e)` | Live tracking - update crosshair position |
| `navigateTo(targetAxis)` | Compute target slice & cursor on another axis view |
| `getTargetSlice(targetAxis)` | Get target slice without triggering navigation callback |
| `getCursorPosition()` | Get stored 3D voxel coordinate (immutable copy) |
| `getCursor2D()` | Get 2D cursor position in original coords |
| `getClickAxis()` | Get the axis of the last click |
| `setLineColor(color)` | Customize crosshair line color |

#### CrosshairAdapter Interface

```typescript
export interface CrosshairAdapter {
    convertCursorPoint(
        fromAxis: AxisType,
        toAxis: AxisType,
        mouseX: number,
        mouseY: number,
        sliceIndex: number
    ): { x: number; y: number; sliceIndex: number } | null;

    getMaxSlice(axis: AxisType): number;

    onCrosshairNavigate?: (
        targetAxis: AxisType,
        sliceIndex: number,
        cursorX: number,
        cursorY: number
    ) => void;
}
```

#### Design Decisions

| Decision | Rationale |
|----------|-----------|
| **CrosshairAdapter pattern** | Same dependency injection approach as SphereAdapter. Cross-axis conversion depends on volume metadata (dimensions, mm distances, ratios) which is project-level data. |
| **Separate from SphereTool** | CrosshairTool and SphereTool serve different purposes: crosshair is for navigation/positioning, sphere is for drawing/marking. They share similar adapter concepts but are independent tools. |
| **Dashed line style** | White dashed lines (`[6, 4]` pattern) for visibility against dark medical images. Color is configurable via `setLineColor()`. |
| **`navigateTo()` vs `getTargetSlice()`** | `navigateTo()` triggers the `onCrosshairNavigate` callback; `getTargetSlice()` is a read-only query for UI display without side effects. |
| **Pointer move tracking** | `onPointerMove()` updates the crosshair in real-time, matching the existing DrawToolCore behavior where crosshair follows cursor. |
| **3D coordinate mapping** | Standard axis mapping: Z(cx,cy,slice), Y(cx,slice,cy), X(slice,cx,cy). Matches the coordinate conventions used throughout the project. |

---

### 5.2 SphereTool Verification

SphereTool was fully implemented in Phase 3 with all Phase 5 requirements:

| Feature | Status | Phase |
|---------|--------|-------|
| 4 sphere types (tumour/skin/nipple/ribcage) | ✅ | Phase 3 |
| Global position storage (not per-layer) | ✅ | Phase 3 |
| Scroll wheel radius adjustment [1, 50] | ✅ | Phase 3 |
| 3D sphere application across slices | ✅ | Phase 3 |
| Cross-axis via SphereAdapter | ✅ | Phase 3 |
| Two decay modes (spherical/linear) | ✅ | Phase 3 |
| Callbacks (onSpherePlaced, onCalculatorPositionsUpdated) | ✅ | Phase 3 |

No additional SphereTool changes needed for Phase 5.

---

### 5.3 UndoManager Per-Layer Stacks

UndoManager already has per-layer independent stacks, implemented in Phase 2:

| Feature | Status | Phase |
|---------|--------|-------|
| Per-layer undo/redo stacks | ✅ | Phase 2 |
| `setActiveLayer()` switching | ✅ | Phase 2 |
| Max stack size (50) with trimming | ✅ | Phase 2 |
| State change listeners | ✅ | Phase 2 |

No additional UndoManager changes needed for Phase 5.

---

## Files Created

| File | Lines | Description |
|------|-------|-------------|
| `tools/CrosshairTool.ts` | 305 | Cross-view positioning tool with adapter pattern |
| `__tests__/crosshair.test.ts` | 439 | 47 unit tests |

---

## Files Modified

| File | Change |
|------|--------|
| `tools/index.ts` | Added CrosshairTool and CrosshairAdapter exports |
| `core/index.ts` | Added Phase 5 exports for CrosshairTool |
| `plan/task.md` | Marked Phase 5 tasks as completed |
| `plan/implementation_plan.md` | Marked Phase 5 as completed, updated file structure |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   Phase 5: Crosshair & Sphere Tools              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  CrosshairTool                                                    │
│  ├── setAdapter(adapter)      ← CrosshairAdapter injected         │
│  ├── toggle() / enable() / disable()  ← S key activation         │
│  │                                                                │
│  ├── onPointerDown(e)         ← Record 3D coordinate              │
│  │   ├── screenToOriginal(offsetX, offsetY) → data coords        │
│  │   ├── to3DCoord(axis, x, y, slice) → Point3D                  │
│  │   └── drawCrosshair(screenX, screenY) → dashed lines          │
│  │                                                                │
│  ├── onPointerMove(e)         ← Live tracking update              │
│  │                                                                │
│  ├── navigateTo(targetAxis)   ← Cross-view navigation             │
│  │   ├── adapter.convertCursorPoint(from, to, x, y, slice)       │
│  │   ├── Clamp slice to [0, maxSlice]                             │
│  │   └── adapter.onCrosshairNavigate(axis, slice, x, y)          │
│  │                                                                │
│  └── getTargetSlice(axis)     ← Read-only query (no callback)    │
│                                                                   │
│  CrosshairAdapter (interface)                                     │
│  ├── convertCursorPoint()     ← Project layer provides impl      │
│  ├── getMaxSlice()            ← Volume metadata                   │
│  └── onCrosshairNavigate?()   ← Navigation callback              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Adapter Pattern (Consistent with Phase 3)

```
Project Layer (Vue/Canvas)          npm Package (tools/)
┌─────────────────────────┐       ┌─────────────────────────┐
│ Canvas positioning      │◄──────│ PanAdapter               │
│ Zoom rendering          │◄──────│ ZoomAdapter              │
│ NRRD contrast           │◄──────│ ContrastAdapter           │
│ Axis conversion         │◄──────│ SphereAdapter             │
│ Axis conversion         │◄──────│ CrosshairAdapter    [NEW] │
└─────────────────────────┘       └─────────────────────────┘
     Provides implementation          Defines interface
```

---

## Crosshair Data Flow

```
User presses 'S' key
    ↓
KeyboardManager fires 'crosshair' action
    ↓
CrosshairTool.toggle() → enabled = true
    ↓
User clicks on Z-axis view at (40, 60) on slice 10
    ↓
CrosshairTool.onPointerDown(e)
    ├── screenToOriginal(40, 60) → { x: 20, y: 30 }
    ├── to3DCoord('z', 20, 30, 10) → Point3D { x: 20, y: 30, z: 10 }
    └── drawCrosshair(40, 60) → vertical + horizontal dashed lines
    ↓
User switches to Y-axis view
    ↓
CrosshairTool.navigateTo('y')
    ├── adapter.convertCursorPoint('z', 'y', 20, 30, 10)
    │   → { x: targetX, y: targetY, sliceIndex: targetSlice }
    ├── Clamp sliceIndex to [0, maxSlice]
    └── adapter.onCrosshairNavigate('y', targetSlice, targetX, targetY)
         → Project layer switches view to Y axis at targetSlice
```

---

## Test Verification

```
 ✓ src/ts/Utils/segmentation/__tests__/crosshair.test.ts (47 tests) 16ms

   ✓ CrosshairTool > toggle (6)
     ✓ should start disabled
     ✓ should toggle on
     ✓ should toggle off after toggling on
     ✓ should clear cursor position when toggling off
     ✓ should enable explicitly
     ✓ should disable explicitly and clear state

   ✓ CrosshairTool > onPointerDown (6)
     ✓ should return empty array when disabled
     ✓ should record 3D position when enabled on Z axis
     ✓ should record 3D position when enabled on X axis
     ✓ should record 3D position when enabled on Y axis
     ✓ should return empty deltas (no mask modification)
     ✓ should store click axis and slice

   ✓ CrosshairTool > onPointerMove (3)
     ✓ should return empty array when disabled
     ✓ should update cursor position on move when enabled
     ✓ should return empty deltas on move

   ✓ CrosshairTool > crosshair rendering (5)
     ✓ should draw crosshair lines on pointer down
     ✓ should not draw when disabled
     ✓ should update crosshair lines on pointer move
     ✓ should clear canvas when toggling off
     ✓ should use custom line color

   ✓ CrosshairTool > lifecycle (2)
     ✓ should set cursor style on activate
     ✓ should clear drawing canvas on deactivate

   ✓ CrosshairTool > navigateTo (9)
     ✓ should return null when no cursor position is set
     ✓ should return null when no adapter is set
     ✓ should return current position when navigating to same axis
     ✓ should convert coordinates when navigating z to x
     ✓ should convert coordinates when navigating z to y
     ✓ should clamp slice index to valid range
     ✓ should clamp negative slice index to 0
     ✓ should invoke onCrosshairNavigate callback
     ✓ should not invoke callback when navigating to same axis
     ✓ should return null when adapter conversion fails

   ✓ CrosshairTool > getTargetSlice (3)
     ✓ should return target slice without triggering navigation callback
     ✓ should return null when no cursor position
     ✓ should return current slice for same axis

   ✓ CrosshairTool > 3D coordinate mapping (3)
     ✓ should map Z axis click to correct 3D: (cx, cy, slice)
     ✓ should map Y axis click to correct 3D: (cx, slice, cy)
     ✓ should map X axis click to correct 3D: (slice, cx, cy)

   ✓ CrosshairTool > getCursor2D (1)
     ✓ should return the 2D cursor position in original coords

   ✓ CrosshairTool > navigation from different axes (3)
     ✓ should navigate from X axis to Z axis
     ✓ should navigate from Y axis to X axis
     ✓ should navigate from Y axis to Z axis

   ✓ CrosshairTool > edge cases (5)
     ✓ should handle pointer down at origin (0,0)
     ✓ should handle high sizeFactor
     ✓ should return a copy of cursor position (immutable)
     ✓ should handle rapid toggle cycles
     ✓ should handle multiple pointer downs (overwrite position)
```

### All Tests Summary

```
 Test Files  4 passed (4)
      Tests  205 passed (205)
   Duration  4.19s

   core.test.ts:       46 tests ✅
   tools.test.ts:      67 tests ✅
   rendering.test.ts:  45 tests ✅
   crosshair.test.ts:  47 tests ✅ (NEW)
```

---

## Build Verification

```bash
$ yarn build
✓ built in 13.85s
# dist/my-app.umd.js  2,215.02 kB │ gzip: 682.83 kB
```

Bundle size unchanged from Phase 4 (2,215.02 kB) - new CrosshairTool code is tree-shaken since it's not yet integrated into the main rendering pipeline.

---

## Pre-existing TypeScript Errors (Unrelated to Phase 5)

Same as Phase 2/3/4:
- `node_modules/@msgpack/msgpack`: Uint8Array generic type issue
- `node_modules/@vitejs/plugin-vue`: SFCScriptCompileOptions type mismatch
- `node_modules/vuetify`: GlobalComponents type constraint issues
- `node_modules/copper3d`: Missing three.js type declarations
- `LeftPanelController.vue`: NrrdTools type mismatch between local and package

---

## Code Migration Mapping Update

| 现有功能 | 现有位置 | 新位置 | 状态 |
|---------|---------|--------|------|
| **Crosshair toggle** | `DrawToolCore` keydown `S` → `enableCursorChoose` | `CrosshairTool.toggle()` | ✅ Phase 5 |
| **Crosshair drawing** | `DrawToolCore.start()` → `drawLine()` | `CrosshairTool.drawCrosshair()` | ✅ Phase 5 |
| **Crosshair 3D coord** | `DrawToolCore.enableCrosshair()` → `cursorPage` | `CrosshairTool.to3DCoord()` → `cursorPosition` | ✅ Phase 5 |
| **Cross-view navigation** | `DrawToolCore.convertCursorPoint()` | `CrosshairAdapter.convertCursorPoint()` | ✅ Phase 5 |

---

## Known Issues

None specific to Phase 5.

---

## External Usage Examples

### 1. 初始化 CrosshairTool

```typescript
import {
    CrosshairTool,
    CrosshairAdapter,
} from '@/ts/Utils/segmentation/core';
// 或直接从 tools 目录引入:
// import { CrosshairTool, CrosshairAdapter } from '@/ts/Utils/segmentation/tools';

// 构建 ToolContext（与所有 tool 共享同一上下文）
const toolContext: ToolContext = {
    layerManager,
    undoManager,
    visibilityManager,
    keyboardManager,
    currentChannel: 1,
    currentSlice: 10,
    currentAxis: 'z',
    brushSize: 5,
    sizeFactor: 2,          // 画布缩放倍数
    globalAlpha: 0.6,
    drawingCtx: drawingCanvas.getContext('2d'),
    drawingCanvas: drawingCanvas,
    requestRender: () => { /* 触发 mask 重新渲染 */ },
};

// 创建 CrosshairTool 实例
const crosshairTool = new CrosshairTool(toolContext);
```

### 2. 注入 CrosshairAdapter（必须）

```typescript
// 项目层提供 CrosshairAdapter 具体实现
const crosshairAdapter: CrosshairAdapter = {
    /**
     * 将一个轴视图上的光标坐标转换到另一个轴视图。
     * 需要访问 volume 的 dimensions、voxelSpacing 等元数据。
     */
    convertCursorPoint(fromAxis, toAxis, mouseX, mouseY, sliceIndex) {
        // 示例：Z → Y 的转换逻辑
        if (fromAxis === 'z' && toAxis === 'y') {
            return {
                x: mouseX,           // X 坐标保持不变
                y: sliceIndex,       // Z slice 变成 Y 视图的 Y 坐标
                sliceIndex: mouseY,  // 原来的 Y 变成 Y 轴的 slice
            };
        }
        // 示例：Z → X 的转换逻辑
        if (fromAxis === 'z' && toAxis === 'x') {
            return {
                x: mouseY,           // 原 Y 变成 X 视图的 X 坐标
                y: sliceIndex,       // Z slice 变成 X 视图的 Y 坐标
                sliceIndex: mouseX,  // 原 X 变成 X 轴的 slice
            };
        }
        // ... 其他轴转换组合
        return null;
    },

    /** 返回指定轴方向的最大 slice 索引 */
    getMaxSlice(axis) {
        switch (axis) {
            case 'x': return volumeDimensions.width - 1;
            case 'y': return volumeDimensions.height - 1;
            case 'z': return volumeDimensions.depth - 1;
        }
    },

    /** 导航回调 - 当 crosshair 触发跨视图跳转时执行 */
    onCrosshairNavigate(targetAxis, sliceIndex, cursorX, cursorY) {
        // 切换到目标轴视图
        switchActiveAxis(targetAxis);
        // 跳转到目标 slice
        setCurrentSlice(sliceIndex);
        // 更新光标位置（可选：在新视图上显示标记）
        console.log(`Navigate to ${targetAxis} axis, slice ${sliceIndex}, cursor (${cursorX}, ${cursorY})`);
    },
};

crosshairTool.setAdapter(crosshairAdapter);
```

### 3. 开启/关闭 Crosshair 模式

```typescript
// 方式 1: Toggle（按 S 键时调用）
crosshairTool.toggle();

// 方式 2: 显式开启
crosshairTool.enable();

// 方式 3: 显式关闭（同时清除光标状态和画布）
crosshairTool.disable();

// 查询当前状态
if (crosshairTool.isEnabled()) {
    console.log('Crosshair mode is active');
}
```

### 4. 处理鼠标事件（绑定到 canvas）

```typescript
// 在 canvas 上监听鼠标事件，将 PointerEvent 传给 CrosshairTool
drawingCanvas.addEventListener('pointerdown', (e: PointerEvent) => {
    // 确保 toolContext 中的 currentAxis / currentSlice 是最新的
    crosshairTool.setContext({
        ...toolContext,
        currentAxis: currentAxis,   // 当前视图轴
        currentSlice: currentSlice, // 当前 slice
    });

    // 传入 PointerEvent，工具会：
    //   1. 将屏幕坐标转为原始坐标
    //   2. 根据轴方向计算 3D 坐标 (Point3D)
    //   3. 在 drawingCanvas 上绘制十字虚线
    const deltas = crosshairTool.onPointerDown(e);
    // CrosshairTool 不修改 mask 数据，deltas 始终为 []
});

drawingCanvas.addEventListener('pointermove', (e: PointerEvent) => {
    // 实时跟踪 - 十字线跟随鼠标移动
    crosshairTool.onPointerMove(e);
});
```

### 5. 跨视图导航

```typescript
// 场景：用户在 Z 轴视图点击后，点击界面上的 "查看 Y 轴" 按钮

// navigateTo() 会：
//   1. 通过 adapter.convertCursorPoint() 计算目标坐标
//   2. Clamp slice 到 [0, maxSlice] 有效范围
//   3. 触发 adapter.onCrosshairNavigate() 回调
//   4. 返回 { sliceIndex, cursorX, cursorY }
const result = crosshairTool.navigateTo('y');
if (result) {
    console.log(`Jump to Y-axis, slice ${result.sliceIndex}`);
    console.log(`Cursor position: (${result.cursorX}, ${result.cursorY})`);
}

// 如果只想查询目标 slice，不触发回调和视图切换：
const targetSlice = crosshairTool.getTargetSlice('x');
if (targetSlice !== null) {
    console.log(`Crosshair points to X-axis slice ${targetSlice}`);
}
```

### 6. 读取 Crosshair 状态

```typescript
// 获取上次点击的 3D 坐标（返回不可变副本）
const pos3D = crosshairTool.getCursorPosition();
if (pos3D) {
    console.log(`3D voxel: (${pos3D.x}, ${pos3D.y}, ${pos3D.z})`);
}

// 获取当前 2D 光标位置（原始坐标系）
const pos2D = crosshairTool.getCursor2D();
console.log(`2D cursor: (${pos2D.x}, ${pos2D.y})`);

// 获取点击发生的轴
const axis = crosshairTool.getClickAxis();
console.log(`Clicked on ${axis} axis`);
```

### 7. 自定义十字线颜色

```typescript
// 默认为白色 '#FFFFFF'，可在深色/亮色医学图像间切换
crosshairTool.setLineColor('#FF0000');   // 红色十字线
crosshairTool.setLineColor('#00FF00');   // 绿色十字线
crosshairTool.setLineColor('#FFFFFF');   // 恢复默认白色
```

### 8. 与 KeyboardManager 集成（Phase 6 预览）

```typescript
// Phase 6 Integration 中将通过 KeyboardManager 绑定快捷键:
keyboardManager.register('crosshair', 's', () => {
    crosshairTool.toggle();
});
```

### 9. 完整调用流程示意

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. 创建实例                                                         │
│    const tool = new CrosshairTool(toolContext);                      │
│    tool.setAdapter(adapter);                                        │
│                                                                     │
│ 2. 用户按 S 键                                                      │
│    tool.toggle();                          // enabled = true        │
│                                                                     │
│ 3. 用户在 Z 轴 slice=10 上点击 (40, 60)                              │
│    tool.setContext({ ...ctx, currentAxis: 'z', currentSlice: 10 }); │
│    tool.onPointerDown(pointerEvent);                                │
│    ├── screenToOriginal(40, 60) → { x: 20, y: 30 }                 │
│    ├── to3DCoord('z', 20, 30, 10) → { x: 20, y: 30, z: 10 }       │
│    └── drawCrosshair(40, 60) → 十字虚线绘制到 drawingCanvas          │
│                                                                     │
│ 4. 获取 3D 坐标                                                     │
│    tool.getCursorPosition() → { x: 20, y: 30, z: 10 }              │
│                                                                     │
│ 5. 导航到 Y 轴视图                                                   │
│    tool.navigateTo('y')                                             │
│    ├── adapter.convertCursorPoint('z', 'y', 20, 30, 10)            │
│    │   → { x: 20, y: 10, sliceIndex: 30 }                          │
│    ├── clamp(30, 0, maxSlice)                                       │
│    └── adapter.onCrosshairNavigate('y', 30, 20, 10) → 视图跳转      │
│                                                                     │
│ 6. 用户再按 S 键关闭                                                 │
│    tool.toggle();                          // enabled = false       │
│    ├── cursorPosition = null                                        │
│    └── clearDrawingCanvas()                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Next Steps

After user confirms:
→ Proceed to **Phase 6: Integration** (SegmentationManager, StateManager, Vue component updates)
