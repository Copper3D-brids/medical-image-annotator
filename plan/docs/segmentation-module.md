# Segmentation Module Documentation

> Source: `annotator-frontend/src/ts/Utils/segmentation/`

## 1. Architecture Overview

### 1.1 Class Inheritance

```
CommToolsData          ← 基类：Canvas 管理、状态初始化、渲染管线
  └── DrawToolCore     ← 绘画事件处理、Undo/Redo、Tool 管理
       └── NrrdTools   ← 对外暴露的 API 入口，拖拽、数据加载
```

- [CommToolsData.ts](annotator-frontend/src/ts/Utils/segmentation/CommToolsData.ts) — 基类
- [DrawToolCore.ts](annotator-frontend/src/ts/Utils/segmentation/DrawToolCore.ts) — 绘画核心
- [NrrdTools.ts](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts) — 对外 API

### 1.2 Canvas 层级结构

共有 **5 个系统 Canvas** + **N 个 Layer Canvas**（默认 3 个 Layer）。

```
┌──────────────────────────────────┐
│ drawingCanvas (顶层交互层)         │  ← 捕获鼠标/笔事件，实时绘制笔画
├──────────────────────────────────┤
│ drawingSphereCanvas              │  ← 3D Sphere 工具的覆盖层
├──────────────────────────────────┤
│ drawingCanvasLayerMaster (合成层)  │  ← 所有可见 Layer 合成后的结果
│   ├─ layerTargets[layer1].canvas │  ← 隐藏的 per-layer canvas
│   ├─ layerTargets[layer2].canvas │
│   └─ layerTargets[layer3].canvas │
├──────────────────────────────────┤
│ displayCanvas (背景医学图像)       │  ← CT/MRI 切片图像
├──────────────────────────────────┤
│ originCanvas (从 Three.js 获取)   │  ← 缓存 Three.js 渲染的原始切片
├──────────────────────────────────┤
│ emptyCanvas (临时处理用)           │  ← 离屏画布，用于图像处理和格式转换
└──────────────────────────────────┘
```

**Canvas 创建位置:**
- 系统 Canvas: [CommToolsData.ts:351-358](annotator-frontend/src/ts/Utils/segmentation/CommToolsData.ts#L351-L358) `generateSystemCanvases()`
- Layer Canvas: [CommToolsData.ts:361-369](annotator-frontend/src/ts/Utils/segmentation/CommToolsData.ts#L361-L369) `generateLayerTargets(layerIds)`
- Canvas 注释说明: [CommToolsData.ts:244-283](annotator-frontend/src/ts/Utils/segmentation/CommToolsData.ts#L244-L283)

### 1.3 Layer 与 MaskVolume 对应关系

每个 Layer 对应一个独立的 `MaskVolume` 实例：

```
protectedData.maskData.volumes = {
  "layer1": MaskVolume(width, height, depth, 1),
  "layer2": MaskVolume(width, height, depth, 1),
  "layer3": MaskVolume(width, height, depth, 1),
}
```

- 初始化（1x1x1 占位）: [CommToolsData.ts:236-241](annotator-frontend/src/ts/Utils/segmentation/CommToolsData.ts#L236-L241)
- 用实际 NRRD 尺寸重新初始化: [NrrdTools.ts:474-481](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L474-L481)

---

## 2. NrrdTools 暴露的 API

### 2.1 Layer & Channel 管理

| 方法 | 签名 | 行号 | 说明 |
|------|------|------|------|
| `setActiveLayer` | `(layerId: string): void` | [L173-178](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L173-L178) | 设置当前活跃 Layer，同时更新 fillColor/brushColor |
| `setActiveChannel` | `(channel: ChannelValue): void` | [L183-188](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L183-L188) | 设置当前活跃 Channel (1-8)，更新画笔颜色 |
| `getActiveLayer` | `(): string` | [L193-195](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L193-L195) | 获取当前 Layer ID |
| `getActiveChannel` | `(): number` | [L200-202](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L200-L202) | 获取当前 Channel 值 |
| `setLayerVisible` | `(layerId, visible): void` | [L207-210](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L207-L210) | 设置 Layer 可见性，触发 `reloadMasksFromVolume()` |
| `isLayerVisible` | `(layerId): boolean` | [L215-217](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L215-L217) | 检查 Layer 是否可见 |
| `setChannelVisible` | `(layerId, channel, visible): void` | [L222-227](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L222-L227) | 设置某 Layer 下某 Channel 可见性，触发重渲染 |
| `isChannelVisible` | `(layerId, channel): boolean` | [L232-234](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L232-L234) | 检查 Channel 是否可见 |
| `getLayerVisibility` | `(): Record<string, boolean>` | [L239-241](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L239-L241) | 获取所有 Layer 可见性副本 |
| `getChannelVisibility` | `(): Record<string, Record<number, boolean>>` | [L246-252](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L246-L252) | 获取所有 Channel 可见性副本 |
| `hasLayerData` | `(layerId): boolean` | [L270-276](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L270-L276) | 检查 Layer 是否有非零数据 |

### 2.2 Keyboard & History

| 方法 | 签名 | 行号 | 说明 |
|------|------|------|------|
| `undo` | `(): void` | [L292-294](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L292-L294) | 撤销上一次绘画操作 |
| `redo` | `(): void` | [L308-310](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L308-L310) | 重做上一次撤销的操作 |
| `enterKeyboardConfig` | `(): void` | [L326-328](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L326-L328) | 进入键盘配置模式（抑制所有快捷键） |
| `exitKeyboardConfig` | `(): void` | [L338-340](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L338-L340) | 退出键盘配置模式 |
| `setContrastShortcutEnabled` | `(enabled: boolean): void` | [L363-365](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L363-L365) | 启用/禁用 Contrast 快捷键 |
| `isContrastShortcutEnabled` | `(): boolean` | [L370-372](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L370-L372) | Contrast 快捷键是否启用 |
| `setKeyboardSettings` | `(settings: Partial<IKeyBoardSettings>): void` | [L397-407](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L397-L407) | 更新键盘快捷键绑定 |
| `getKeyboardSettings` | `(): IKeyBoardSettings` | [L423-425](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L423-L425) | 获取当前键盘设置快照 |

### 2.3 Data Loading

| 方法 | 签名 | 行号 | 说明 |
|------|------|------|------|
| `setAllSlices` | `(allSlices: Array<nrrdSliceType>): void` | [L452-501](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L452-L501) | **入口函数**：加载 NRRD 切片，初始化 MaskVolume |
| `setMasksData` | `(masksData, loadingBar?): void` | [L521-583](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L521-L583) | 旧版加载方法（Legacy） |
| `setMasksFromNIfTI` | `(layerVoxels: Map<string, Uint8Array>, loadingBar?): void` | [L594-635](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L594-L635) | 从 NIfTI 文件加载 mask 到 MaskVolume |

### 2.4 Display & Rendering

| 方法 | 签名 | 行号 | 说明 |
|------|------|------|------|
| `resizePaintArea` | `(factor: number): void` | [L1215-1260](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L1215-L1260) | 调整画布缩放 |
| `reloadMasksFromVolume` | `(): void` (private) | [L1266-1297](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L1266-L1297) | **核心重渲染**：从 MaskVolume 重新渲染所有 Layer 到 Canvas |
| `flipDisplayImageByAxis` | `(): void` | [L1308-1329](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L1308-L1329) | 翻转 CT 图像以正确显示 |
| `redrawDisplayCanvas` | `(): void` | [L1371-1396](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L1371-L1396) | 重绘 contrast 图像到 displayCanvas |
| `setEmptyCanvasSize` | `(axis?): void` | [L1342-1363](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L1342-L1363) | 根据 axis 设置 emptyCanvas 尺寸 |

### 2.5 其他 API

| 方法 | 行号 | 说明 |
|------|------|------|
| `drag(opts?)` | [L81-83](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L81-L83) | 启用拖拽切片功能 |
| `setBaseDrawDisplayCanvasesSize(size)` | [L89-97](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L89-L97) | 设置 Canvas 基础尺寸 (1-8) |
| `setupGUI(gui)` | [L115-152](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L115-L152) | 设置 dat.gui 面板 |
| `enableContrastDragEvents(callback)` | [L107-109](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L107-L109) | 启用 contrast 拖拽事件 |
| `getCurrentImageDimension()` | [L641-643](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L641-L643) | 获取图像尺寸 |
| `getVoxelSpacing()` | [L645-647](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L645-L647) | 获取体素间距 |

---

## 3. States（状态）

### 3.1 nrrd_states (INrrdStates)

定义位置: [CommToolsData.ts:40-105](annotator-frontend/src/ts/Utils/segmentation/CommToolsData.ts#L40-L105)

| 字段 | 类型 | 说明 |
|------|------|------|
| `dimensions` | `[width, height, depth]` | 体素维度 |
| `currentIndex` | `number` | 当前切片索引 |
| `maxIndex` / `minIndex` | `number` | 切片索引范围 |
| `axis` | — | ⚠️ 注意：axis 存在 `protectedData.axis` 中 |
| `nrrd_x_pixel` / `y` / `z` | `number` | 各轴像素数 |
| `changedWidth` / `changedHeight` | `number` | 当前 Canvas 显示尺寸 |
| `layers` | `string[]` | Layer ID 列表，默认 `["layer1","layer2","layer3"]` |
| `sizeFoctor` | `number` | 缩放因子 |
| `voxelSpacing` | `number[]` | 体素间距 |
| `spaceOrigin` | `number[]` | 空间原点 |

### 3.2 gui_states (IGUIStates)

定义位置: [CommToolsData.ts:128-189](annotator-frontend/src/ts/Utils/segmentation/CommToolsData.ts#L128-L189)

| 字段 | 类型 | 说明 |
|------|------|------|
| `layer` | `string` | 当前活跃 Layer (默认 `"layer1"`) |
| `activeChannel` | `number` | 当前活跃 Channel (1-8) |
| `layerVisibility` | `Record<string, boolean>` | Layer 可见性，[L183](annotator-frontend/src/ts/Utils/segmentation/CommToolsData.ts#L183) |
| `channelVisibility` | `Record<string, Record<number, boolean>>` | Channel 可见性，[L184-188](annotator-frontend/src/ts/Utils/segmentation/CommToolsData.ts#L184-L188) |
| `fillColor` / `brushColor` | `string` | 当前画笔颜色 (Hex) |
| `brushAndEraserSize` | `number` | 画笔/橡皮擦大小 |
| `globalAlpha` | `number` | 全局透明度 (0.6) |
| `pencil` / `Eraser` / `sphere` / `calculator` | `boolean` | 工具激活状态 |

### 3.3 protectedData (IProtected)

定义位置: [CommToolsData.ts:223-293](annotator-frontend/src/ts/Utils/segmentation/CommToolsData.ts#L223-L293)

| 字段 | 说明 |
|------|------|
| `axis` | 当前视图轴 `"x"` / `"y"` / `"z"` |
| `maskData.volumes` | `Record<string, MaskVolume>` — 每个 Layer 对应的 3D 体积 |
| `layerTargets` | `Map<string, ILayerRenderTarget>` — 每个 Layer 的 canvas+ctx |
| `canvases` | 5 个系统 Canvas |
| `ctxes` | 对应的 2D Context |
| `Is_Shift_Pressed` / `Is_Ctrl_Pressed` / `Is_Draw` | 交互状态标志 |

---

## 4. Callbacks

### 4.1 getMask (后端同步)

定义: [CommToolsData.ts:91-100](annotator-frontend/src/ts/Utils/segmentation/CommToolsData.ts#L91-L100)

```ts
getMask: (
  sliceData: Uint8Array,    // 当前切片的原始体素数据
  layerId: string,          // layer 名
  channelId: number,        // active channel
  sliceIndex: number,       // 切片索引
  axis: "x" | "y" | "z",   // 当前轴
  width: number,            // 切片宽度
  height: number,           // 切片高度
  clearFlag: boolean        // 是否为清除操作
) => void
```

**调用时机**: 每次绘画结束（mouseup）、undo/redo 之后。

### 4.2 onClearLayerVolume

定义: [CommToolsData.ts:101](annotator-frontend/src/ts/Utils/segmentation/CommToolsData.ts#L101)

```ts
onClearLayerVolume: (layerId: string) => void
```

### 4.3 getSphere / getCalculateSpherePositions

定义: [CommToolsData.ts:102-103](annotator-frontend/src/ts/Utils/segmentation/CommToolsData.ts#L102-L103)

---

## 5. MaskVolume 存储与渲染

### 5.1 内存布局

**文件**: [core/MaskVolume.ts](annotator-frontend/src/ts/Utils/segmentation/core/MaskVolume.ts)

```
内存布局: [z][y][x][channel]
index = z * bytesPerSlice + y * width * channels + x * channels + channel
bytesPerSlice = width * height * channels
```

底层数据结构: 单一连续 `Uint8Array`

### 5.2 各轴切片维度

定义: [MaskVolume.ts:1117-1126](annotator-frontend/src/ts/Utils/segmentation/core/MaskVolume.ts#L1117-L1126)

| 轴 | 切片宽度 | 切片高度 | 说明 |
|----|---------|---------|------|
| z (Axial) | width | height | 最常用，连续内存 |
| y (Coronal) | width | depth | 按行提取 |
| x (Sagittal) | depth | height | 逐像素提取，最慢 |

对应 emptyCanvas 尺寸设置: [NrrdTools.ts:1342-1363](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L1342-L1363)

### 5.3 切片提取 (读取 Mask)

**`getSliceUint8(sliceIndex, axis)`** — [MaskVolume.ts:1019-1058](annotator-frontend/src/ts/Utils/segmentation/core/MaskVolume.ts#L1019-L1058)

返回原始 `Uint8Array`，用于：
- 后端同步 (`getMask` callback)
- Undo/Redo 快照

各轴实现：
- **Z 轴** [L1032-1035](annotator-frontend/src/ts/Utils/segmentation/core/MaskVolume.ts#L1032-L1035): 连续内存 `subarray` 批量复制（最快）
- **Y 轴** [L1036-1042](annotator-frontend/src/ts/Utils/segmentation/core/MaskVolume.ts#L1036-L1042): 按行迭代复制
- **X 轴** [L1043-1055](annotator-frontend/src/ts/Utils/segmentation/core/MaskVolume.ts#L1043-L1055): 逐像素提取（最慢）

### 5.4 切片写入

**`setSliceUint8(sliceIndex, data, axis)`** — [MaskVolume.ts:1072-1108](annotator-frontend/src/ts/Utils/segmentation/core/MaskVolume.ts#L1072-L1108)

`getSliceUint8` 的逆操作，用于 Undo/Redo 恢复。

**`setSliceLabelsFromImageData(sliceIndex, imageData, axis, activeChannel, channelVisible?)`** — [MaskVolume.ts:575-661](annotator-frontend/src/ts/Utils/segmentation/core/MaskVolume.ts#L575-L661)

Canvas→Volume 写入，将 RGBA 像素转换为 channel label (1-8)。
- 构建 RGB→Channel 映射 [L593](annotator-frontend/src/ts/Utils/segmentation/core/MaskVolume.ts#L593)
- ALPHA_THRESHOLD = 128 [L601](annotator-frontend/src/ts/Utils/segmentation/core/MaskVolume.ts#L601) 避免抗锯齿边缘

### 5.5 渲染到 Canvas

**核心渲染方法: `renderLabelSliceInto()`** — [MaskVolume.ts:695-770](annotator-frontend/src/ts/Utils/segmentation/core/MaskVolume.ts#L695-L770)

```ts
renderLabelSliceInto(
  sliceIndex: number,
  axis: 'x' | 'y' | 'z',
  target: ImageData,              // 预分配的 ImageData buffer
  channelVisible?: Record<number, boolean>,  // Channel 可见性
  opacity: number = 1.0
): void
```

渲染逻辑 [L742-769](annotator-frontend/src/ts/Utils/segmentation/core/MaskVolume.ts#L742-L769):
1. 读取 label 值 (0-8)
2. `label === 0` → 透明 (RGBA 全 0)
3. `channelVisible && !channelVisible[label]` → 隐藏该 Channel → 透明
4. 否则 → 从 `MASK_CHANNEL_COLORS` 取颜色，应用 opacity

### 5.6 渲染管线完整流程

**入口: `reloadMasksFromVolume()`** — [NrrdTools.ts:1266-1297](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L1266-L1297)

```
reloadMasksFromVolume()
  │
  ├─ getOrCreateSliceBuffer(axis)          → 获取/创建可复用的 ImageData buffer
  │   [CommToolsData.ts:543-568]
  │
  ├─ FOR EACH layer:
  │   ├─ target.ctx.clearRect(...)         → 清空 layer canvas
  │   └─ renderSliceToCanvas(layerId, axis, sliceIndex, buffer, target.ctx, w, h)
  │       [CommToolsData.ts:585-616]
  │       │
  │       ├─ volume.renderLabelSliceInto(sliceIndex, axis, buffer, channelVis)
  │       │   [MaskVolume.ts:695-770]      → 渲染体素到 buffer
  │       │
  │       ├─ emptyCtx.putImageData(buffer) → 放到 emptyCanvas
  │       │   [CommToolsData.ts:604]
  │       │
  │       └─ targetCtx.drawImage(emptyCanvas, ...) → 绘制到 layer canvas
  │           [CommToolsData.ts:609-612]
  │           ⚠️ 注意：Mask 不做翻转！[L605-607]
  │
  └─ compositeAllLayers()                  → 合成到 master canvas
      [CommToolsData.ts:666-680]
      │
      ├─ masterCtx.clearRect(...)
      └─ FOR EACH layer:
          ├─ if !layerVisibility[layerId] → skip  [L676]
          └─ masterCtx.drawImage(layerCanvas)      [L678]
```

---

## 6. 翻转 (Flip) 机制

### 6.1 Display 翻转（仅 CT/MRI 图像）

**`flipDisplayImageByAxis()`** — [NrrdTools.ts:1308-1329](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L1308-L1329)

因为 Three.js 渲染的切片不在正确的 2D 位置，需要翻转 displayCanvas：

| 轴 | 翻转方式 | 代码行 |
|----|---------|--------|
| x (Sagittal) | `scale(-1, -1)` + `translate(-w, -h)` | [L1309-1315](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L1309-L1315) |
| y (Coronal) | `scale(1, -1)` + `translate(0, -h)` | [L1322-1327](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L1322-L1327) |
| z (Axial) | `scale(1, -1)` + `translate(0, -h)` | [L1316-1321](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L1316-L1321) |

调用位置: `redrawDisplayCanvas()` → [NrrdTools.ts:1385](annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts#L1385)

### 6.2 Mask 不翻转

**重要**: `renderSliceToCanvas()` 中 Mask 渲染**不做翻转** — [CommToolsData.ts:605-607](annotator-frontend/src/ts/Utils/segmentation/CommToolsData.ts#L605-L607)

```ts
// No flip: MaskVolume stores in source coordinates matching the Three.js
// slice convention. Applying a display flip here would invert cross-axis
// slice indices (e.g. coronal 220 → 228 for a 448-slice volume).
```

### 6.3 applyMaskFlipForAxis（辅助方法）

[CommToolsData.ts:640-660](annotator-frontend/src/ts/Utils/segmentation/CommToolsData.ts#L640-L660) — 提供相同的翻转变换，但目前在 mask 渲染路径中**未使用**（翻转是自逆的）。

---

## 7. Tools（工具）

位置: `annotator-frontend/src/ts/Utils/segmentation/tools/`

所有 Tool 继承自 `BaseTool`:

**BaseTool** — [tools/BaseTool.ts](annotator-frontend/src/ts/Utils/segmentation/tools/BaseTool.ts)

```ts
interface ToolContext {
  nrrd_states: INrrdStates;
  gui_states: IGUIStates;
  protectedData: IProtected;
  cursorPage: ICursorPage;
}
abstract class BaseTool {
  constructor(ctx: ToolContext)
  setContext(ctx: ToolContext): void
}
```

### 7.1 Tool 列表

| Tool | 文件 | 说明 |
|------|------|------|
| **SphereTool** | [tools/SphereTool.ts](annotator-frontend/src/ts/Utils/segmentation/tools/SphereTool.ts) | 3D 球形标注工具 |
| **CrosshairTool** | [tools/CrosshairTool.ts](annotator-frontend/src/ts/Utils/segmentation/tools/CrosshairTool.ts) | 十字准星位置标记 |
| **ContrastTool** | [tools/ContrastTool.ts](annotator-frontend/src/ts/Utils/segmentation/tools/ContrastTool.ts) | 窗位/窗宽调节 |
| **ZoomTool** | [tools/ZoomTool.ts](annotator-frontend/src/ts/Utils/segmentation/tools/ZoomTool.ts) | 缩放/平移 |
| **EraserTool** | [tools/EraserTool.ts](annotator-frontend/src/ts/Utils/segmentation/tools/EraserTool.ts) | 橡皮擦 |
| **ImageStoreHelper** | [tools/ImageStoreHelper.ts](annotator-frontend/src/ts/Utils/segmentation/tools/ImageStoreHelper.ts) | Canvas↔Volume 同步 |
| **DragSliceTool** | [tools/DragSliceTool.ts](annotator-frontend/src/ts/Utils/segmentation/tools/DragSliceTool.ts) | 拖拽切换切片 |

Tool 初始化: [DrawToolCore.ts](annotator-frontend/src/ts/Utils/segmentation/DrawToolCore.ts) `initTools()` 方法

### 7.2 ImageStoreHelper（关键工具）

**`storeAllImages(index, layer)`** — [ImageStoreHelper.ts:116-178](annotator-frontend/src/ts/Utils/segmentation/tools/ImageStoreHelper.ts#L116-L178)

Canvas → Volume 同步流程:
1. 将 layer canvas 绘制到 emptyCanvas [L124]
2. 从 emptyCanvas 获取 ImageData [L127-132]
3. 调用 `volume.setSliceLabelsFromImageData()` [L142-148] 写入 MaskVolume
4. 提取切片通知后端 [L161]

**`filterDrawedImage(axis, sliceIndex)`** — [ImageStoreHelper.ts:85-107](annotator-frontend/src/ts/Utils/segmentation/tools/ImageStoreHelper.ts#L85-L107)

Volume → Canvas 读取，调用 `volume.renderLabelSliceInto()`.

---

## 8. EventRouter（事件路由）

**文件**: [eventRouter/EventRouter.ts](annotator-frontend/src/ts/Utils/segmentation/eventRouter/EventRouter.ts)

### 8.1 交互模式

| Mode | 触发条件 | 说明 |
|------|---------|------|
| `idle` | 默认 | 无交互 |
| `draw` | Shift 按住 | 绘画模式 |
| `drag` | 垂直拖拽 | 切片导航 |
| `contrast` | Ctrl/Meta 按住 | 窗位/窗宽调节 |
| `crosshair` | S 键 | 十字准星 |

### 8.2 默认键盘设置

定义: [CommToolsData.ts:31-38](annotator-frontend/src/ts/Utils/segmentation/CommToolsData.ts#L31-L38)

```ts
IKeyBoardSettings = {
  draw: "Shift",
  undo: "z",
  redo: "y",
  contrast: ["Control", "Meta"],
  crosshair: "s",
  mouseWheel: "Scroll:Zoom",   // 或 "Scroll:Slice"
}
```

---

## 9. Undo/Redo 系统

**文件**: [core/UndoManager.ts](annotator-frontend/src/ts/Utils/segmentation/core/UndoManager.ts)

### Delta 结构

```ts
interface MaskDelta {
  layerId: string;
  axis: "x" | "y" | "z";
  sliceIndex: number;
  oldSlice: Uint8Array;   // 操作前的切片数据
  newSlice: Uint8Array;   // 操作后的切片数据
}
```

- 每个 Layer 独立的 undo/redo 栈
- MAX_STACK_SIZE = 50

### Undo 流程

```
DrawToolCore.undoLastPainting()
  → UndoManager.undo() → MaskDelta
  → vol.setSliceUint8(delta.sliceIndex, delta.oldSlice, delta.axis)
  → applyUndoRedoToCanvas(layerId)
    → getOrCreateSliceBuffer(axis)
    → renderSliceToCanvas(...)
    → compositeAllLayers()
  → getMask(sliceData, ...) → 通知后端
```

---

## 10. DragOperator

**文件**: [DragOperator.ts](annotator-frontend/src/ts/Utils/segmentation/DragOperator.ts)

负责拖拽交互（切片导航）。

| 方法 | 说明 |
|------|------|
| `drag(opts?)` | 启用拖拽模式 |
| `configDragMode()` | 绑定拖拽监听器 |
| `removeDragMode()` | 移除拖拽监听器 |
| `updateIndex(move)` | 委托给 DragSliceTool |
| `setEventRouter(eventRouter)` | 订阅模式变化 |

---

## 11. Channel 颜色定义

**文件**: [core/types.ts](annotator-frontend/src/ts/Utils/segmentation/core/types.ts)

| Channel | 颜色 | Hex | RGBA |
|---------|------|-----|------|
| 0 | 透明 | `#000000` | `(0,0,0,0)` |
| 1 | 绿色 (Primary/Tumor) | `#00ff00` | `(0,255,0,255)` |
| 2 | 红色 (Secondary/Edema) | `#ff0000` | `(255,0,0,255)` |
| 3 | 蓝色 (Tertiary/Necrosis) | `#0000ff` | `(0,0,255,255)` |
| 4 | 黄色 (Enhancement) | `#ffff00` | `(255,255,0,255)` |
| 5 | 品红 (Vessel/Boundary) | `#ff00ff` | `(255,0,255,255)` |
| 6 | 青色 (Additional) | `#00ffff` | `(0,255,255,255)` |
| 7 | 橙色 (Auxiliary) | `#ff8000` | `(255,128,0,255)` |
| 8 | 紫色 (Extended) | `#8000ff` | `(128,0,255,255)` |

定义位置:
- RGBA: [types.ts:94-104](annotator-frontend/src/ts/Utils/segmentation/core/types.ts#L94-L104) `MASK_CHANNEL_COLORS`
- CSS: [types.ts:109-119](annotator-frontend/src/ts/Utils/segmentation/core/types.ts#L109-L119) `MASK_CHANNEL_CSS_COLORS`
- Hex: [types.ts:142-152](annotator-frontend/src/ts/Utils/segmentation/core/types.ts#L142-L152) `CHANNEL_HEX_COLORS`
