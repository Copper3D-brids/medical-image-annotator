# State Management Refactor — Task List

> **Plan:** [gui_state_api_refactor_plan.md](gui_state_api_refactor_plan.md)
> **Status:** Phase 5 Complete
> **Estimated Duration:** 3-4 weeks (5 phases)

---

## Architecture: State Management Classes

在 Phase 4/5 中，不是简单把 interface 拆开散落各处，而是创建集中管理的 State 类：

```
CommToolsData
  ├── nrrdState: NrrdState          ← 替代旧的 nrrd_states 扁平对象
  │     ├── .image: IImageMetadata       (只读，加载后不变)
  │     ├── .view: IViewState            (视图运行时)
  │     ├── .interaction: IInteractionState (鼠标/光标)
  │     ├── .sphere: ISphereState        (Sphere 工具专属)
  │     └── .flags: IInternalFlags       (内部标志)
  │
  ├── guiState: GuiState            ← 替代旧的 gui_states 扁平对象
  │     ├── .mode: IToolModeState        (工具模式)
  │     ├── .drawing: IDrawingConfig     (绘图参数)
  │     ├── .viewConfig: IViewConfig     (视图配置)
  │     └── .layerChannel: ILayerChannelState (图层/通道)
  │
  └── protectedData: IProtected     ← 结构已合理，不拆分，仅 protected 化
```

**为什么需要类而不只是接口？**

```typescript
// ❌ 仅拆接口 — 散落各处，没有验证，难维护
this.imageMetadata.originWidth = w;  // 任何地方都能改
this.viewState.sizeFoctor = -1;       // 没有验证

// ✅ State 管理类 — 集中管理，有验证，有类型方法
class NrrdState {
  private _image: IImageMetadata;
  private _view: IViewState;

  get image(): Readonly<IImageMetadata> { return this._image; }
  get view(): IViewState { return this._view; }

  /** 只在加载时调一次 */
  initializeImageMetadata(data: IImageMetadata): void { ... }

  /** 带验证的 setter */
  setZoomFactor(factor: number): void {
    this._view.sizeFoctor = Math.max(1, Math.min(8, factor));
  }

  /** 语义化的状态转换 */
  resetSphereState(): void {
    this._sphere.sphereOrigin = { x: [0,0,0], y: [0,0,0], z: [0,0,0] };
    this._sphere.tumourSphereOrigin = null;
    // ... 集中管理所有 sphere 重置逻辑
  }
}
```

**工具通过 ToolContext 访问 State 类：**
```typescript
interface ToolContext {
  state: NrrdState;       // 新的 grouped 访问
  gui: GuiState;          // 新的 grouped 访问
  protectedData: IProtected;
  callbacks: IAnnotationCallbacks;
}

// 工具内部使用
this.ctx.state.view.changedWidth
this.ctx.state.sphere.sphereRadius
this.ctx.gui.drawing.brushColor
```

---

## Phase 1: GUI API Encapsulation (2-3 days, Low Risk)

> 消除 Vue 组件直接访问 `guiSettings.guiState[key]` / `guiSetting[key].onChange()` 的模式

### Task 1.1: 添加类型定义 ✅
- **文件:** `coreType.ts`, `index.ts`
- [x] 定义 `ToolMode` 类型: `"pencil" | "brush" | "eraser" | "sphere" | "calculator"`
- [x] 定义 `IGuiMeta` 接口: `{ [key]: { min, max, step, value } }`
- [x] 从 `index.ts` 导出 `ToolMode` 和 `IGuiMeta`
- [x] TypeScript 编译通过

### Task 1.2: 在 NrrdTools 中存储 gui.ts 闭包回调 ✅
- **文件:** `NrrdTools.ts`
- [x] 定义 `private guiCallbacks` 对象类型
- [x] 在 `setupGUI()` 中, `setupGui()` 返回后, 将 onChange 回调存储到 `guiCallbacks`
- [x] 确认 `guiCallbacks` 包含: `updatePencilState`, `updateEraserState`, `updateBrushAndEraserSize`, `updateSphereState`, `updateCalDistance`, `updateWindowHigh`, `updateWindowLow`, `finishContrastAdjustment`
- [x] TypeScript 编译通过

### Task 1.3: 实现 `setMode()` / `getMode()` ✅
- **文件:** `NrrdTools.ts`
- [x] 实现 `setMode(mode: ToolMode): void`
  - [x] 处理 deactivate 前一个模式 (重置 gui_states flags)
  - [x] 处理 activate 新模式 (设置 gui_states flags)
  - [x] 调用对应的 side-effect (`guiCallbacks.updatePencilState/updateEraserState/...`)
  - [x] 处理 sphere → 调用 `enterSphereMode()` / `exitSphereMode()`
  - [x] 处理 calculator 特殊逻辑 (private `_calculatorActive` flag)
- [x] 实现 `getMode(): ToolMode`
  - [x] 根据 gui_states.pencil/Eraser/sphere 等 flags 返回当前模式
- [x] 实现 `isCalculatorActive(): boolean`
- [x] TypeScript 编译通过
- [ ] 手动测试: 模式切换 pencil → brush → eraser → sphere → calculator → pencil
- **依赖:** 1.2

### Task 1.4: 实现 slider 方法 ✅
- **文件:** `NrrdTools.ts`
- [x] `setOpacity(value: number): void` — clamp [0.1, 1], 设置 `gui_states.globalAlpha`
- [x] `getOpacity(): number`
- [x] `setBrushSize(size: number): void` — clamp [5, 50], 设置 `gui_states.brushAndEraserSize`, 调用 `guiCallbacks.updateBrushAndEraserSize()`
- [x] `getBrushSize(): number`
- [x] `setWindowHigh(value: number): void` — 设置 `readyToUpdate=false`, 调用 `guiCallbacks.updateWindowHigh(value)`
- [x] `setWindowLow(value: number): void` — 同上
- [x] `finishWindowAdjustment(): void` — 调用 `guiCallbacks.finishContrastAdjustment()`
- [x] `adjustContrast(type: "windowHigh"|"windowLow", delta: number): void` — 计算新值 + clamp + 调用 setWindowHigh/setWindowLow
- [x] `getSliderMeta(key: string): IGuiMeta | null` — 返回 UI slider 需要的元数据
- [x] TypeScript 编译通过
- [ ] 手动测试: 拖动各 slider 验证效果
- **依赖:** 1.2

### Task 1.5: 扩展 `setActiveSphereType()` 加入颜色 side-effect ✅
- **文件:** `NrrdTools.ts`
- [x] 在现有 `setActiveSphereType()` 中添加 gui.ts `updateCalDistance()` 的颜色更新逻辑
- [x] 根据 `SPHERE_CHANNEL_MAP` 获取 layer + channel
- [x] 从 volume 获取颜色 → 设置 `gui_states.fillColor` 和 `gui_states.brushColor`
- [x] TypeScript 编译通过
- [ ] 手动测试: 切换 sphere type → 颜色变化正确

### Task 1.6: 添加 color + button 方法 ✅
- **文件:** `NrrdTools.ts`
- [x] `setPencilColor(hex: string): void` — 设置 `gui_states.color`
- [x] `getPencilColor(): string`
- [x] `executeAction(action: "undo"|"redo"|"clearActiveSliceMask"|"clearActiveLayerMask"|"resetZoom"|"downloadCurrentMask"): void` — 分发到对应方法
- [x] **重命名:** `clear` → `clearActiveSliceMask`, `clearAll` → `clearActiveLayerMask`
- [x] TypeScript 编译通过

### Task 1.7: 迁移 `OperationCtl.vue` (24 usages) ✅
- **文件:** `OperationCtl.vue`
- [x] `toggleFuncRadios()` → 使用 `nrrdTools.setMode(mode)` + MODE_MAP 映射
  - [x] 保留 emitter.emit("Common:OpenCalculatorBox") 等事件逻辑
  - [x] 删除手动 `guiState["sphere"] = true/false` 等 15+ 行
  - [x] 删除手动 `guiSetting["sphere"].onChange()` 调用
  - [x] 删除 `prebtn` 追踪逻辑 (setMode 内部处理)
- [x] `toggleSlider()` → 使用 `nrrdTools.setOpacity/setBrushSize/setWindowHigh/setWindowLow`
- [x] `toggleSliderFinished()` → 使用 `nrrdTools.finishWindowAdjustment()`
- [x] `dragToChangeImageWindow()` → 使用 `nrrdTools.adjustContrast(type, delta)`
- [x] `updateSliderSettings()` → 使用 `nrrdTools.getSliderMeta(key)`
- [x] `onBtnClick()` → 使用 `nrrdTools.executeAction(val)`
- [x] **重命名:** button values `clear` → `clearActiveSliceMask`, `clearAll` → `clearActiveLayerMask`
- [x] 移除 `const guiSettings = ref<any>()` 声明
- [x] 移除 `storeToRefs`, `setTumourStudyPointPosition`, `TGuiSettings` 等未使用导入
- [x] `emitterOnFinishLoadAllCaseImages` 不再需要接收 val 参数
- [x] TypeScript 编译通过
- [ ] 手动测试: 所有 OperationCtl 功能正常
- **依赖:** 1.3, 1.4, 1.6

### Task 1.8: 迁移 `Calculator.vue` (9 usages) ✅
- **文件:** `Calculator.vue`
- [x] 添加 `Core:NrrdTools` emitter handler 获取 nrrdTools 引用
- [x] `toggleCalculatorPickerRadios()` → `nrrdTools.setActiveSphereType(val)`
- [x] `onBtnClick()` → `nrrdTools.setActiveSphereType("tumour")`
- [x] `guiState["calculator"]` 读取 → `nrrdTools.isCalculatorActive()`
- [x] 移除不再需要的 `guiSettings` 引用
- [x] TypeScript 编译通过
- [ ] 手动测试: calculator 面板正常工作
- **依赖:** 1.5

### Task 1.9: 迁移 `OperationAdvance.vue` (5 usages) ✅
- **文件:** `OperationAdvance.vue`
- [x] color 读取 → `nrrdTools.value!.getPencilColor()`
- [x] color 写入 → `nrrdTools.value!.setPencilColor(color)`
- [x] 移除不再需要的 `guiSettings` 引用
- [x] TypeScript 编译通过
- [ ] 手动测试: 颜色选择器正常
- **依赖:** 1.6

### Task 1.10: Phase 1 综合验证 ✅
- [x] `yarn build` — 零新增 TypeScript 错误
- [ ] 模式切换: pencil → brush → eraser → sphere → calculator → pencil
- [ ] Opacity slider: 拖动 → mask 透明度变化
- [ ] Brush size slider: 拖动 → 笔刷大小变化
- [ ] Window high slider: 拖动 → 对比度变化, 松开 → 重绘
- [ ] Window low slider: 同上
- [ ] Contrast drag: 在图像上拖动调整对比度
- [ ] Sphere type: tumour/skin/nipple/ribcage 切换 → 颜色变化
- [ ] Undo/redo: 画 → undo → redo
- [ ] Clear/clearAll: 画 → clear slice → 画 → clear all
- [ ] Reset zoom: zoom in → reset
- [ ] Color picker: 改 pencil color → 绘图使用新颜色
- [ ] dat.gui 面板: 如果可见, 控件仍然同步

---

## Phase 2: Callbacks & Methods Extraction (1-2 days, Low Risk)

> 从 nrrd_states 移出 5 个回调, 从 gui_states 移出 6 个方法

### Task 2.1: 定义 `IAnnotationCallbacks` 接口 ✅
- **文件:** `coreType.ts`
- [x] 定义接口:
  ```
  IAnnotationCallbacks {
    onMaskChanged(sliceData, layerId, channelId, sliceIndex, axis, width, height, clearFlag): void
    onSphereChanged(sphereOrigin, sphereRadius): void
    onCalculatorPositionsChanged(tumour, skin, rib, nipple, axis): void
    onLayerVolumeCleared(layerId): void
    onChannelColorChanged(layerId, channel, color): void
  }
  ```
- [x] 导出接口 (`coreType.ts` + `index.ts`)
- [x] TypeScript 编译通过

### Task 2.2: 添加 `annotationCallbacks` 到 DrawToolCore ✅
- **文件:** `CommToolsData.ts`, `DrawToolCore.ts`
- [x] 在 CommToolsData 添加 `protected annotationCallbacks: IAnnotationCallbacks`
- [x] 初始化为 no-op 默认值
- [x] 在 DrawToolCore 的 `draw()` options 处理中赋值到 `this.annotationCallbacks`
- [x] TypeScript 编译通过

### Task 2.3: 更新 ToolContext 添加 callbacks ✅
- **文件:** `tools/BaseTool.ts`
- [x] `ToolContext` 接口添加 `callbacks: IAnnotationCallbacks`
- [x] DrawToolCore 创建 ToolContext 时传入 `this.annotationCallbacks`
- [x] TypeScript 编译通过

### Task 2.4: 迁移回调引用 ✅
- [x] `DrawToolCore.ts`: `this.nrrd_states.getMask(...)` → `this.annotationCallbacks.onMaskChanged(...)` (3处: clearActiveSlice, undoLastPainting, redoLastPainting)
- [x] `DrawToolCore.ts`: `this.nrrd_states.getSphere(...)` → `this.annotationCallbacks.onSphereChanged(...)`
- [x] `DrawToolCore.ts`: `this.nrrd_states.getCalculateSpherePositions(...)` → `this.annotationCallbacks.onCalculatorPositionsChanged(...)`
- [x] `NrrdTools.ts`: `this.nrrd_states.onClearLayerVolume(...)` → `this.annotationCallbacks.onLayerVolumeCleared(...)`
- [x] `NrrdTools.ts`: `this.nrrd_states.onChannelColorChanged(...)` → `this.annotationCallbacks.onChannelColorChanged(...)`
- [x] `tools/ImageStoreHelper.ts`: `this.ctx.nrrd_states.getMask(...)` → `this.ctx.callbacks.onMaskChanged(...)`
- [x] grep 验证: 无遗漏引用
- [x] TypeScript 编译通过
- **注意:** SphereTool 中 getSphere/getCalculateSpherePositions 是在 DrawToolCore 中调用的 (不在 SphereTool 内部)，所以迁移在 DrawToolCore 完成

### Task 2.5: 从 `INrrdStates` 移除回调 ✅
- **文件:** `coreType.ts`, `CommToolsData.ts`
- [x] 从 `INrrdStates` interface 删除: `getMask`, `getSphere`, `getCalculateSpherePositions`, `onClearLayerVolume`, `onChannelColorChanged`
- [x] 从 `CommToolsData.ts` 的 `nrrd_states` 初始化中删除对应字段
- [x] 清理 CommToolsData.ts 中不再需要的 `ICommXYZ`, `IDownloadImageConfig`, `enableDownload` 导入
- [x] TypeScript 编译通过

### Task 2.6: 从 `IGUIStates` 移除方法 ✅
- **文件:** `coreType.ts`, `CommToolsData.ts`, `gui.ts`, `NrrdTools.ts`
- [x] 从 `IGUIStates` interface 删除: `clear()`, `clearAll()`, `undo()`, `redo()`, `downloadCurrentMask()`, `resetZoom()`
- [x] 从 `CommToolsData.ts` 的 `gui_states` 初始化中删除对应方法实现
- [x] NrrdTools 已有替代方法: `executeAction()` 覆盖所有 6 个操作
- [x] `NrrdTools.ts` 中 `this.gui_states.resetZoom()` 2处 → `this.executeAction("resetZoom")`
- [x] 更新 `gui.ts`: 创建本地 `actions` 对象供 dat.gui 绑定 (clear, clearAll, undo, redo, resetZoom, downloadCurrentMask)
- [x] 更新 `IConfigGUI` 添加: `undoLastPainting`, `redoLastPainting`, `resetZoom`, `downloadCurrentMask`
- [x] `NrrdTools.setupGUI()` 传入 4 个新方法
- [x] TypeScript 编译通过

### Task 2.7: Phase 2 综合验证 ✅
- [x] `yarn build` — 零新增错误
- [x] grep 验证: `nrrd_states` 中不再有 `getMask`, `getSphere` 等回调
- [x] grep 验证: `gui_states` 中不再有 `clear()`, `undo()` 等方法
- [x] 手动测试: Mask 保存到后端正常 (onMaskChanged)
- [x] 手动测试: Sphere 放置通知后端正常 (onSphereChanged)
- [x] 手动测试: Calculator positions 报告正常
- [x] 手动测试: Clear layer 通知后端正常
- [x] 手动测试: Channel color 变更传播正常
- [x] 手动测试: Undo/redo/clear/clearAll 通过 NrrdTools 方法正常
- [x] 手动测试: dat.gui 面板按钮正常

---

## Phase 3: Visibility Enforcement (1 day, Low Risk) ✅

> 将 state 对象改为 protected，堵死外部直接访问

### Task 3.1: 改 visibility 为 `protected` ✅
- **文件:** `CommToolsData.ts`
- [x] `nrrd_states` → `protected nrrd_states`
- [x] `gui_states` → `protected gui_states`
- [x] `protectedData` → `protected protectedData`
- [x] `cursorPage` → `protected cursorPage`
- [x] TypeScript 编译 — 记录所有报错位置 (4 处: useDistanceCalculation.ts × 4)

### Task 3.2: 修复外部违规 (4 refs) ✅
- [x] `useDistanceCalculation.ts:51`: `nrrdTools.nrrd_states.voxelSpacing` → `nrrdTools.getVoxelSpacing()` (已有 getter)
- [x] `useDistanceCalculation.ts:58`: `nrrdTools.nrrd_states.spaceOrigin` → `nrrdTools.getSpaceOrigin()` (已有 getter)
- [x] `useDistanceCalculation.ts:148,151`: `nrrdTools.gui_states.activeSphereType` → `nrrdTools.getActiveSphereType()` (添加 getter)
- [x] `utils.ts:64`: `nrrdTools.nrrd_states.voxelSpacing` → `nrrdTools.getVoxelSpacing()` (已有 getter)
- [x] 添加 `getActiveSphereType(): SphereType` getter 到 NrrdTools
- [x] TypeScript 编译通过 (vue-tsc --noEmit 无 TS2445 错误)

### Task 3.3: 简化 `getGuiSettings()` 返回值 ✅
- **文件:** `NrrdTools.ts`, `useCaseManagement.ts`
- [x] 评估: Phase 1 迁移后无代码需要 `getGuiSettings()` 返回值
  - 唯一调用点 `useCaseManagement.ts` 的 6 个事件监听器全部忽略参数
- [x] 删除 `getGuiSettings()` 公共方法
- [x] 提取副作用为 `private syncGuiParameterSettings()` (更新 windowHigh/Low 的 volume 引用)
- [x] 在 `setupConfigs()` 和 `afterLoadSlice()` 中调用 syncGuiParameterSettings()
- [x] `useCaseManagement.ts`: `tellAllRelevantComponentsImagesLoaded()` 不再传递 guiSettings
- [x] TypeScript 编译通过

### Task 3.4: Phase 3 综合验证 ✅
- [x] `yarn build` — 零错误
- [x] vue-tsc 验证: 无 TS2445 protected 访问违规
- [x] 手动测试: 全部功能正常 (绘图, 平移, sphere, 对比度, undo/redo)

---

## Phase 4: nrrd_states Semantic Split (1-2 weeks, Medium Risk) ✅

> 创建 NrrdState 管理类，将 44 个属性拆分为 5 个语义组

### Task 4.1: 定义 5 个语义接口 ✅
- **文件:** `coreType.ts`
- [x] 定义 `IImageMetadata` (14 props): originWidth, originHeight, nrrd_x/y/z_mm, nrrd_x/y/z_pixel, dimensions, voxelSpacing, spaceOrigin, RSARatio, ratios, layers
- [x] 定义 `IViewState` (12 props): changedWidth/Height, currentSliceIndex, preSliceIndex, maxIndex, minIndex, contrastNum, sizeFoctor, showContrast, switchSliceFlag, previousPanelL/T
- [x] 定义 `IInteractionState` (7 props): Mouse_Over_x/y, Mouse_Over, cursorPageX/Y, isCursorSelect, drawStartPos
- [x] 定义 `ISphereState` (7 props): sphereOrigin, tumour/skin/rib/nippleSphereOrigin, sphereMaskVolume, sphereRadius
- [x] 定义 `IInternalFlags` (3 props): stepClear, clearAllFlag, loadingMaskData
- [x] `INrrdStates` 改为 `extends` 所有 5 个接口 (向后兼容)
- [x] 导出所有接口
- [x] TypeScript 编译通过

### Task 4.2: 创建 `NrrdState` 管理类 ✅
- **文件:** 新建 `coreTools/NrrdState.ts`
- [x] `class NrrdState` with 5 readonly sub-objects: `image`, `view`, `interaction`, `sphere`, `flags`
- [x] 构造函数接受 `baseCanvasesSize` 和 `layers` 参数
- [x] `setZoomFactor(factor)` — clamp [1, 8]
- [x] `resetSphereState()` — 重置所有 sphere 属性
- [x] TypeScript 编译通过

### Task 4.3: 在 CommToolsData 中集成 NrrdState ✅
- **文件:** `CommToolsData.ts`
- [x] 替换旧 `nrrd_states: INrrdStates = { ... }` (48 行) 为 `nrrd_states = new NrrdState(this.baseCanvasesSize)`
- [x] 更新 7 处内部引用使用 grouped 访问
- [x] TypeScript 编译通过

### Task 4.4: 更新 ToolContext ✅
- **文件:** `tools/BaseTool.ts`
- [x] `ToolContext.nrrd_states` 类型从 `INrrdStates` 改为 `NrrdState`
- [x] TypeScript 编译通过

### Task 4.5-4.8: 迁移所有引用 (~283 refs across 14 files) ✅
- [x] **CommToolsData.ts** (7 refs) — image.layers, image.dimensions, view.changedWidth/Height
- [x] **DrawToolCore.ts** (74 refs) — image(8), view(38), interaction(16), sphere(15), flags(3)
- [x] **NrrdTools.ts** (144 refs) — image(~50), view(~60), interaction(~20), sphere(~8), flags(~4)
- [x] **SphereTool.ts** (42 refs) — image(18), view(5), sphere(19)
- [x] **DrawingTool.ts** (13 refs) — interaction(7), flags(1), view(5)
- [x] **DragSliceTool.ts** (~25 refs) — view(主), image(RSARatio, originWidth/Height)
- [x] **EraserTool.ts** (5 refs) — view.changedWidth/Height, image.layers
- [x] **PanTool.ts** (4 refs) — view.previousPanelL/T
- [x] **CrosshairTool.ts** (~15 refs) — interaction.isCursorSelect, image.dimensions/ratios, sphere.sphereOrigin
- [x] **ZoomTool.ts** (2 refs) — image.originWidth, view.sizeFoctor
- [x] **ImageStoreHelper.ts** (5 refs) — image.layers, flags.loadingMaskData/clearAllFlag, view.currentSliceIndex
- [x] **DragOperator.ts** (2 refs + type migration) — view.currentSliceIndex/contrastNum, INrrdStates → NrrdState
- [x] **gui.ts** (2 refs + type migration) — flags.clearAllFlag, INrrdStates → NrrdState
- [x] **EventRouter.ts** — no code refs (comment only)
- [x] **LeftPanelCore.vue** — 类型从 `Copper.INrrdStates` 改为 `Copper.NrrdState`
- [x] **index.ts** — 导出 `NrrdState` class
- [x] grep 验证: 代码中无 flat `nrrd_states.PROPERTY` 引用 (仅 3 处注释)

### Task 4.9: 保留 `nrrd_states` 字段名 (设计决定) ✅
- **注意:** 与原计划不同，保留了 `nrrd_states` 字段名 (不改为 `nrrdState`)
- [x] 字段名保持为 `nrrd_states`，但类型已从 `INrrdStates` 改为 `NrrdState`
- [x] `INrrdStates` 接口保留用于向后兼容 (extends 所有 5 个子接口)
- [x] 减少了改名带来的变更量，同时实现了语义分组的核心目标

### Task 4.10: Phase 4 综合验证 ✅
- [x] `yarn build` — 零新增错误 (built in 12.05s)
- [x] `vue-tsc --noEmit` — 无 segmentation 相关 TS 错误 (仅预存在的 three.js/plugins 错误)
- [x] grep 验证: 所有 flat 引用已迁移为 grouped 访问
- [x] 手动测试: 画图 (pencil, brush, eraser) — 三个轴
- [x] 手动测试: 平移 (右键拖动)
- [x] 手动测试: 缩放 (滚轮 / slider)
- [x] 手动测试: 切片导航 (拖动, 滚轮)
- [x] 手动测试: Sphere 放置 (4 种类型)
- [x] 手动测试: Calculator 模式
- [x] 手动测试: Crosshair (光标位置跨轴同步)
- [x] 手动测试: 对比度调整 (slider + drag)
- [x] 手动测试: Undo/redo
- [x] 手动测试: Mask save/load
- [x] 手动测试: Layer/channel 切换
- [x] 手动测试: Clear slice / clear all

---

## Phase 5: gui_states Cleanup (3-5 days, Medium Risk) ✅

> 创建 GuiState 管理类，将 24 个属性拆分为 4 个语义组

### Task 5.1: 定义 4 个语义接口 ✅
- **文件:** `coreType.ts`
- [x] 定义 `IToolModeState` (4 props): pencil, Eraser, sphere, activeSphereType
- [x] 定义 `IDrawingConfig` (6 props): globalAlpha, lineWidth, color, fillColor, brushColor, brushAndEraserSize
- [x] 定义 `IViewConfig` (6 props): mainAreaSize, dragSensitivity, cursor, defaultPaintCursor, max_sensitive, readyToUpdate
- [x] 定义 `ILayerChannelState` (4 props): layer, activeChannel, layerVisibility, channelVisibility
- [x] `IGUIStates` 改为 `extends` 所有 4 个接口 (向后兼容)
- [x] 导出所有接口
- [x] TypeScript 编译通过

### Task 5.2: 创建 `GuiState` 管理类 ✅
- **文件:** 新建 `coreTools/GuiState.ts`
- [x] `class GuiState` with 4 readonly sub-objects: `mode`, `drawing`, `viewConfig`, `layerChannel`
- [x] 构造函数接受 `defaultPaintCursor`, `defaultFillColor`, `defaultBrushColor`, `layers` 参数
- [x] TypeScript 编译通过

### Task 5.3: 在 CommToolsData 中集成 GuiState + ToolContext ✅
- **文件:** `CommToolsData.ts`, `tools/BaseTool.ts`
- [x] 替换旧 `gui_states: IGUIStates = { ... }` (26 行) 为 `gui_states = new GuiState({...})`
- [x] 更新 6 处 CommToolsData 内部引用使用 grouped 访问
- [x] `ToolContext.gui_states` 类型从 `IGUIStates` 改为 `GuiState`
- [x] TypeScript 编译通过

### Task 5.4: 迁移所有引用 (~158 refs across 11 files) ✅
- [x] **NrrdTools.ts** (52 refs) — mode(16), drawing(14), viewConfig(4), layerChannel(17), dynamic(1)
- [x] **DrawToolCore.ts** (34 refs) — mode(17), drawing(6), viewConfig(7), layerChannel(4)
- [x] **gui.ts** (29 refs) — dat.gui bindings updated to use sub-groups, callbacks updated
- [x] **DrawingTool.ts** (18 refs) — mode(4), drawing(6), viewConfig(1), layerChannel(5)
- [x] **ImageStoreHelper.ts** (5 refs) — mode(2), layerChannel(3)
- [x] **SphereTool.ts** (2 refs) — mode.activeSphereType
- [x] **DragSliceTool.ts** (3 refs) — mode.sphere(2), layerChannel.layerVisibility(1)
- [x] **EraserTool.ts** (3 refs) — layerChannel(3)
- [x] **DragOperator.ts** (3 refs + type) — viewConfig.max_sensitive, mode.sphere, viewConfig.dragSensitivity, IGUIStates → GuiState
- [x] **PanTool.ts** (1 ref) — mode.sphere
- [x] **index.ts** — 导出 `GuiState` class
- [x] grep 验证: 代码中无 flat `gui_states.PROPERTY` 引用 (仅注释)

### Task 5.5: 保留 `gui_states` 字段名 (设计决定) ✅
- **注意:** 与 Phase 4 同策略，保留 `gui_states` 字段名，类型从 `IGUIStates` 改为 `GuiState`
- [x] `IGUIStates` 接口保留用于向后兼容 (extends 所有 4 个子接口)

### Task 5.6: Phase 5 综合验证 ✅
- [x] `yarn build` — 零新增错误 (built in 18.51s)
- [x] `vue-tsc --noEmit` — 无 segmentation 相关新 TS 错误
- [x] grep 验证: 所有 flat 引用已迁移为 grouped 访问
- [ ] 手动测试: 画图 (pencil, brush, eraser) — 三个轴
- [ ] 手动测试: 平移 (右键拖动)
- [ ] 手动测试: 缩放 (滚轮 / slider)
- [ ] 手动测试: 切片导航 (拖动, 滚轮)
- [ ] 手动测试: Sphere 放置 (4 种类型)
- [ ] 手动测试: Calculator 模式
- [ ] 手动测试: Crosshair
- [ ] 手动测试: 对比度调整 (slider + drag)
- [ ] 手动测试: Undo/redo
- [ ] 手动测试: dat.gui 面板正常工作
- [ ] 手动测试: Layer/channel 切换
- [ ] 手动测试: Clear slice / clear all

---

## Final Cleanup

### Task F.1: 命名修正 (可选, 低优先级)
- [ ] `sizeFoctor` → `sizeFactor` (typo)
- [ ] `Mouse_Over_x/y` → `mouseOverX/Y`
- [ ] `Is_Draw` → `isDrawing`
- [ ] `Eraser` → `eraser` (大小写一致性)
- [ ] 每个重命名后编译通过 + grep 验证

### Task F.2: 文档更新
- [ ] 更新 `CLAUDE.md` 中的架构说明
- [ ] 更新 `overall_plan.md` 状态为 Completed
- [ ] 在 plan/ 下记录最终的 state 架构

---

## Summary

| Phase | Tasks | Checkboxes | Internal Refs | Risk | Duration |
|-------|-------|------------|---------------|------|----------|
| **1: GUI API** | 10 | 52 | 0 (additive) | Low | 2-3 days |
| **2: Callbacks/Methods** | 7 | 34 | ~42 | Low | 1-2 days |
| **3: Visibility** | 4 | 16 | ~4 | Low | 1 day |
| **4: nrrd_states → NrrdState** | 10 | 62 | ~500 | Medium | 1-2 weeks |
| **5: gui_states → GuiState** | 6 | 30 | ~136 | Medium | 3-5 days |
| **Final** | 2 | 10 | ~15 | Low | 1 day |
| **Total** | **39** | **204** | **~697** | | **3-4 weeks** |

Decision gate after Phase 3: 评估是否继续 Phase 4, 或根据项目优先级推迟。

---

**Last Updated:** 2026-02-28
