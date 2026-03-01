# Issue 3: 统一 Callback 接口 — Plan

> **Status:** 🔲 TODO
> **Priority:** MEDIUM
> **Source:** segmentation_architecture_review.md — Issue 3
> **Scope:** `tools/` 目录下所有 `*Callbacks` 接口 + `DrawToolCore.initTools()` + `NrrdTools.initNrrdToolsModules()`

---

## Problem Statement

每个 Tool 定义自己独立的 `*Callbacks` 接口，DrawToolCore 在 `initTools()` 中手动组装 8 组 callback 对象。大部分 callback 是一行转发到 DrawToolCore / CommToolsData / NrrdTools 的方法。

### 现有 Callback 接口清单

| 接口 | 文件 | 方法数 | 使用工具 |
|------|------|--------|---------|
| `SphereCallbacks` | SphereTool.ts | 4 | SphereTool |
| `DrawingCallbacks` | DrawingTool.ts | 7 | DrawingTool |
| `ContrastCallbacks` | ContrastTool.ts | 2 | ContrastTool |
| `ZoomCallbacks` | ZoomTool.ts | 3 | ZoomTool |
| `PanCallbacks` | PanTool.ts | 1 | PanTool |
| `ImageStoreCallbacks` | ImageStoreHelper.ts | 2 | ImageStoreHelper |
| `DragSliceCallbacks` | DragSliceTool.ts | 8 | DragSliceTool |
| `LayerChannelCallbacks` | LayerChannelManager.ts | 3 | LayerChannelManager |
| `SliceRenderCallbacks` | SliceRenderPipeline.ts | 10 | SliceRenderPipeline |
| `DataLoaderCallbacks` | DataLoader.ts | 7 | DataLoader |
| *(无 callbacks)* | CrosshairTool.ts | 0 | CrosshairTool |
| *(无 callbacks)* | EraserTool.ts | 0 | EraserTool |

**总计：10 个独立 Callback 接口，47 个方法签名**

### 重复方法分析

| 方法 | 出现次数 | 涉及接口 |
|------|---------|---------|
| `setEmptyCanvasSize` | 4 | ImageStore, Sphere, DataLoader, DragSlice |
| `setIsDrawFalse` | 3 | Contrast, Zoom, DragSlice |
| `getVolumeForLayer` | 3 | Drawing, LayerChannel, SliceRender |
| `drawImageOnEmptyImage` | 2 | ImageStore, Sphere |
| `setSyncsliceNum` | 2 | Contrast, DragSlice |
| `flipDisplayImageByAxis` | 2 | DragSlice, (NrrdTools) |
| `reloadMasksFromVolume` | 2 | LayerChannel, DataLoader |
| `compositeAllLayers` | 2 | Drawing, SliceRender |
| `renderSliceToCanvas` | 2 | SliceRender, DragSlice |
| `resetZoom` | 1 | DataLoader |
| `refreshSphereOverlay` | 2 | SliceRender, DragSlice |

---

## Solution Design

### 核心思路

创建一个统一的 `ToolHost` 接口，收集所有 tool 需要的宿主方法。每个 Tool 仍然只依赖 `ToolHost` 的子集（通过 TypeScript 的 `Pick<>` 缩窄），但实现端（DrawToolCore / NrrdTools）只需要提供一个 host 对象。

### 方案：ToolHost + Pick 模式

```typescript
// core/types.ts 或 tools/ToolHost.ts (新文件)

import type { MaskVolume } from "../core";
import type { MaskDelta } from "../core";
import type { RGBAColor } from "../core";

/**
 * Unified host interface — all methods that tools may call back into.
 * 
 * Each tool picks only the methods it needs via `Pick<ToolHost, ...>`.
 */
export interface ToolHost {
  // ── Canvas / Rendering ─────────────────────────────────────────
  setEmptyCanvasSize(axis?: "x" | "y" | "z"): void;
  drawImageOnEmptyImage(canvas: HTMLCanvasElement): void;
  compositeAllLayers(): void;
  renderSliceToCanvas(
    layer: string, axis: "x" | "y" | "z", sliceIndex: number,
    buffer: ImageData, targetCtx: CanvasRenderingContext2D,
    scaledWidth: number, scaledHeight: number,
  ): void;
  getOrCreateSliceBuffer(axis: "x" | "y" | "z"): ImageData | null;
  flipDisplayImageByAxis(): void;
  redrawDisplayCanvas(): void;
  refreshSphereOverlay(): void;
  reloadMasksFromVolume(): void;

  // ── Volume ─────────────────────────────────────────────────────
  getVolumeForLayer(layer: string): MaskVolume;

  // ── State / Lifecycle ──────────────────────────────────────────
  setIsDrawFalse(target: number): void;
  setSyncsliceNum(): void;
  resetPaintAreaUIPosition(l?: number, t?: number): void;
  resizePaintArea(moveDistance: number): void;
  resetZoom(): void;
  invalidateSliceBuffer(): void;
  clearUndoHistory(): void;
  
  // ── Drawing-specific ───────────────────────────────────────────
  setCurrentLayer(): { ctx: CanvasRenderingContext2D; canvas: HTMLCanvasElement };
  syncLayerSliceData(index: number, layer: string): void;
  filterDrawedImage(axis: "x" | "y" | "z", index: number):
    { image: ImageData } | undefined;
  pushUndoDelta(delta: MaskDelta): void;
  getEraserUrls(): string[];
  
  // ── Sphere / Crosshair ─────────────────────────────────────────
  enableCrosshair(): void;
  setUpSphereOrigins(mouseX: number, mouseY: number, sliceIndex: number): void;
  zoomActionAfterDrawSphere(): void;
  
  // ── Data Loading ───────────────────────────────────────────────
  setDisplaySlicesBaseOnAxis(): void;
  afterLoadSlice(): void;
  
  // ── GUI / Observer ─────────────────────────────────────────────
  syncGuiParameterSettings(): void;
  repraintCurrentContrastSlice(): void;
  updateShowNumDiv(contrastNum: number): void;
  updateCurrentContrastSlice(): void;
  onChannelColorChanged(layerId: string, channel: number, color: RGBAColor): void;
}
```

每个 Tool 使用 `Pick<>` 只选需要的方法：

```typescript
// SphereTool.ts
type SphereHostDeps = Pick<ToolHost,
  'setEmptyCanvasSize' | 'drawImageOnEmptyImage' | 'enableCrosshair' | 'setUpSphereOrigins'
>;

export class SphereTool extends BaseTool {
  constructor(ctx: ToolContext, host: SphereHostDeps) { ... }
}
```

### 方案优势

1. **单一定义**：所有宿主方法在一处定义，消除重复签名
2. **渐进迁移**：现有 `*Callbacks` 接口可以逐个替换为 `Pick<ToolHost, ...>`，不需要 big-bang 迁移
3. **编译期安全**：`Pick<>` 确保每个 tool 只能访问声明的子集
4. **initTools() 简化**：不再手动为每个 tool 构建独立 callback 对象，传 `this` 即可

### 实现策略

**宿主类实现 `ToolHost`：** DrawToolCore 和 NrrdTools 联合实现 `ToolHost` 接口。由于三级继承 `NrrdTools → DrawToolCore → CommToolsData`，最终 `NrrdTools` 实例拥有所有方法。

**分层划分：**
- DrawToolCore 层工具（SphereTool, DrawingTool, ContrastTool, ZoomTool, PanTool, ImageStoreHelper, EraserTool, CrosshairTool）：host 来源是 DrawToolCore
- NrrdTools 层模块（LayerChannelManager, SliceRenderPipeline, DataLoader）：host 来源是 NrrdTools
- DragOperator 子模块（DragSliceTool）：host 通过 DragOperator 转发

---

## Files to Modify

### 新建文件

| 文件 | 说明 |
|------|------|
| `tools/ToolHost.ts` | 统一 `ToolHost` 接口定义 + 各 Tool 的 `Pick` 类型别名 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `tools/SphereTool.ts` | 删除 `SphereCallbacks`，改用 `Pick<ToolHost, ...>` |
| `tools/DrawingTool.ts` | 删除 `DrawingCallbacks`，改用 `Pick<ToolHost, ...>` |
| `tools/ContrastTool.ts` | 删除 `ContrastCallbacks`，改用 `Pick<ToolHost, ...>` |
| `tools/ZoomTool.ts` | 删除 `ZoomCallbacks`，改用 `Pick<ToolHost, ...>` |
| `tools/PanTool.ts` | 删除 `PanCallbacks`，改用 `Pick<ToolHost, ...>` |
| `tools/ImageStoreHelper.ts` | 删除 `ImageStoreCallbacks`，改用 `Pick<ToolHost, ...>` |
| `tools/DragSliceTool.ts` | 删除 `DragSliceCallbacks`，改用 `Pick<ToolHost, ...>` |
| `tools/LayerChannelManager.ts` | 删除 `LayerChannelCallbacks`，改用 `Pick<ToolHost, ...>` |
| `tools/SliceRenderPipeline.ts` | 删除 `SliceRenderCallbacks`，改用 `Pick<ToolHost, ...>` |
| `tools/DataLoader.ts` | 删除 `DataLoaderCallbacks`，改用 `Pick<ToolHost, ...>` |
| `DrawToolCore.ts` | `initTools()` 简化，传 `this` 作为 host |
| `NrrdTools.ts` | `initNrrdToolsModules()` 简化，传 `this` 作为 host |
| `DragOperator.ts` | 转发 host 到 DragSliceTool |
| `tools/index.ts` | 导出 `ToolHost` 类型 |

---

## Phase Breakdown

### Phase 1 — 创建 ToolHost 接口

1. 新建 `tools/ToolHost.ts`，定义统一 `ToolHost` 接口
2. 为每个 Tool 定义 `Pick<>` 类型别名（如 `SphereHostDeps`、`DrawingHostDeps` 等）
3. 从 `tools/index.ts` 导出
4. 编译检查 — 无新增错误（此阶段未连接）

### Phase 2 — 迁移 DrawToolCore 层工具（6 个）

按以下顺序逐个迁移（每个 tool 是独立且安全的变更）：

1. **ImageStoreHelper**（最简单，2 个 callback）→ 替换 `ImageStoreCallbacks` 为 `Pick<ToolHost, ...>`
2. **PanTool**（1 个 callback）
3. **ContrastTool**（2 个 callback）
4. **ZoomTool**（3 个 callback）
5. **SphereTool**（4 个 callback）
6. **DrawingTool**（7 个 callback，最复杂）

每个迁移步骤：
- Tool 文件：删除旧 `*Callbacks` 接口，import `ToolHost`，构造函数改为接收 `Pick<ToolHost, ...>`
- DrawToolCore `initTools()`：对应的手动 callback 对象替换为 `this`（类型兼容）

编译检查 — 每个 tool 迁移后编译

### Phase 3 — 迁移 NrrdTools 层模块（3 个）

1. **LayerChannelManager**（3 个 callback）
2. **SliceRenderPipeline**（10 个 callback）
3. **DataLoader**（7 个 callback）

每个迁移步骤：
- 模块文件：同 Phase 2
- NrrdTools `initNrrdToolsModules()`：对应的手动 callback 对象替换

### Phase 4 — 迁移 DragSliceTool

- DragSliceTool（8 个 callback）
- DragOperator 需要调整转发方式

### Phase 5 — 清理 + 验证

1. 删除所有已废弃的 `*Callbacks` 接口（确认无残留引用）
2. 全量编译：`npx tsc --noEmit`
3. 引用完整性：`grep -rn "Callbacks" tools/` — 只应存在 `IAnnotationCallbacks`（外部接口，不在此次范围内）

---

## Verification Plan

### 编译验证
```bash
cd annotator-frontend && npx tsc --noEmit
```
- 每个 Phase 后执行
- 零新增错误

### 引用完整性
```bash
grep -rn "interface.*Callbacks" src/ts/Utils/segmentation/tools/
```
- Phase 5 后应只剩 `IAnnotationCallbacks`（在 `core/types.ts` 中，不在 tools/ 下）

### 运行时验证（用户手动）
- `npm run dev` — 项目正常启动
- 所有绘图工具（Pencil/Brush/Eraser/Sphere/Pan/Zoom/Contrast/Crosshair）功能无退化
- 这是纯类型重构 + 方法传递方式变更，不修改任何运行时逻辑

---

## Non-Goals（本次不做）

- 不修改 `ToolContext` 接口（状态对象的注入方式不变）
- 不将 `ToolContext` 合并到 `ToolHost`（两者职责不同：ToolContext = 共享状态引用，ToolHost = 宿主方法调用）
- 不修改 `IAnnotationCallbacks`（这是外部 API 回调，不是工具内部回调）
- 不重构继承链（Issue 5+6 的范围）
- 不修改任何工具的内部逻辑

---

## Risk Assessment

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| `this` 作为 host 传入时，方法引用可能丢失 `this` 绑定 | 中 | 高（运行时错误） | 明确使用 `.bind(this)` 或箭头函数包装；编译无法捕获此类错误，需运行时验证 |
| ToolHost 接口过大，后续维护成本 | 低 | 低 | 使用 `Pick<>` 缩窄确保每个 tool 的依赖仍然最小可见 |
| DragSliceTool 的 host 传递链较长（NrrdTools → DragOperator → DragSliceTool） | 中 | 中（转发方法遗漏） | Phase 4 中逐一检查方法转发完整性 |
| ContrastTool/ZoomTool 构造函数有额外的 `container`/`mainAreaContainer` 参数 | 低 | 低 | 这些 DOM 引用不属于 ToolHost，保持为独立构造参数 |
