# Issue 5+6: 继承→组合重构 — Task List

> **Status:** 🔲 TODO
> **Plan:** [issue5_6_composition_refactor_plan.md](issue5_6_composition_refactor_plan.md)
> **Target:** `NrrdTools → DrawToolCore → CommToolsData` 三级继承 → 组合关系
> **前置:** Issue 3 + Issue 4 应先完成

---

## Phase 1 — 提取 CanvasState

### 1.1 新建 `CanvasState.ts`
- [ ] 创建 `CanvasState` 类
- [ ] 移入状态字段：
  - [ ] `baseCanvasesSize`
  - [ ] `nrrd_states` (NrrdState 实例)
  - [ ] `gui_states` (GuiState 实例)
  - [ ] `protectedData` (IProtected)
  - [ ] `cursorPage` (ICursorPage)
  - [ ] `annotationCallbacks` (IAnnotationCallbacks)
  - [ ] `_configKeyBoard` 
  - [ ] `_keyboardSettings` (IKeyBoardSettings)
- [ ] 移入构造函数初始化逻辑：
  - [ ] 层列表处理、layerVisibility/channelVisibility 初始化
  - [ ] `generateSystemCanvases()` 私有方法
  - [ ] `generateLayerTargets()` 私有方法
  - [ ] `protectedData` 对象构建（canvas 创建、MaskVolume 占位初始化）

### 1.2 CommToolsData 过渡态
- [ ] CommToolsData 构造函数改为委托给 `CanvasState`
- [ ] CommToolsData 暴露 `state: CanvasState` 只读属性
- [ ] 所有字段访问暂通过 `this.state.xxx` 转发
- [ ] 编译检查：`npx tsc --noEmit`

---

## Phase 2 — 提取 RenderingUtils

### 2.1 新建 `RenderingUtils.ts`
- [ ] 创建 `RenderingUtils` 类，构造函数接收 `CanvasState`
- [ ] 移入渲染方法：
  - [ ] `getVolumeForLayer(layer): MaskVolume`
  - [ ] `getCurrentVolume(): MaskVolume`
  - [ ] `getAllVolumes(): INewMaskData`
  - [ ] `filterDrawedImage(axis, sliceIndex)`
  - [ ] `getOrCreateSliceBuffer(axis): ImageData | null`
  - [ ] `renderSliceToCanvas(...)`
  - [ ] `compositeAllLayers()`
  - [ ] `applyMaskFlipForAxis(...)`
  - [ ] `invalidateSliceBuffer()`
- [ ] 移入私有缓冲区字段：
  - [ ] `_reusableSliceBuffer`, `_reusableBufferWidth`, `_reusableBufferHeight`

### 2.2 CommToolsData 过渡态
- [ ] CommToolsData 暴露 `renderer: RenderingUtils` 只读属性
- [ ] 原方法改为转发到 `this.renderer.xxx()`
- [ ] 编译检查：`npx tsc --noEmit`

---

## Phase 3 — DrawToolCore 去继承

### 3.1 修改类声明
- [ ] 移除 `extends CommToolsData`
- [ ] 添加字段：`readonly state: CanvasState`, `readonly renderer: RenderingUtils`
- [ ] 构造函数改为接收 `CanvasState`（或由构造函数创建）

### 3.2 替换继承字段引用
- [ ] 所有 `this.nrrd_states` → `this.state.nrrd_states`
- [ ] 所有 `this.gui_states` → `this.state.gui_states`
- [ ] 所有 `this.protectedData` → `this.state.protectedData`
- [ ] 所有 `this.cursorPage` → `this.state.cursorPage`
- [ ] 所有 `this.annotationCallbacks` → `this.state.annotationCallbacks`
- [ ] 所有 `this._configKeyBoard` → `this.state.configKeyBoard`
- [ ] 所有 `this._keyboardSettings` → `this.state.keyboardSettings`
- [ ] 所有 `this.baseCanvasesSize` → `this.state.baseCanvasesSize`

### 3.3 替换渲染方法引用
- [ ] `this.getVolumeForLayer(...)` → `this.renderer.getVolumeForLayer(...)`
- [ ] `this.getCurrentVolume()` → `this.renderer.getCurrentVolume()`
- [ ] `this.getAllVolumes()` → `this.renderer.getAllVolumes()`
- [ ] `this.filterDrawedImage(...)` → `this.renderer.filterDrawedImage(...)`
- [ ] `this.getOrCreateSliceBuffer(...)` → `this.renderer.getOrCreateSliceBuffer(...)`
- [ ] `this.renderSliceToCanvas(...)` → `this.renderer.renderSliceToCanvas(...)`
- [ ] `this.compositeAllLayers()` → `this.renderer.compositeAllLayers()`
- [ ] `this.invalidateSliceBuffer()` → `this.renderer.invalidateSliceBuffer()`

### 3.4 处理 ToolContext 构建
- [ ] `initTools()` 中的 `ToolContext` 从 `this.state` 获取字段
- [ ] 确保所有 Tool 仍接收正确的状态引用

### 3.5 编译检查
- [ ] `npx tsc --noEmit` — 无新增错误

---

## Phase 4 — NrrdTools 去继承

### 4.1 修改类声明
- [ ] 移除 `extends DrawToolCore`
- [ ] 添加字段：`private state: CanvasState`, `private drawCore: DrawToolCore`
- [ ] 构造函数中创建 `CanvasState` → 传给 `DrawToolCore`

### 4.2 删除 16 个伪抽象方法
- [ ] 删除从 CommToolsData 继承的占位方法：
  - [ ] `clearActiveSlice()` — 改为直接在 NrrdTools 实现
  - [ ] `undoLastPainting()` — 代理到 `this.drawCore.undoLastPainting()`
  - [ ] `redoLastPainting()` — 代理到 `this.drawCore.redoLastPainting()`
  - [ ] `clearActiveLayer()` — 直接实现
  - [ ] `resizePaintArea()` — 代理到 `this.sliceRenderPipeline`
  - [ ] `setIsDrawFalse()` — 代理到 `this.sliceRenderPipeline`
  - [ ] `updateOriginAndChangedWH()` — 代理到 `this.sliceRenderPipeline`
  - [ ] `flipDisplayImageByAxis()` — 代理到 `this.sliceRenderPipeline`
  - [ ] `resetPaintAreaUIPosition()` — 代理到 `this.sliceRenderPipeline`
  - [ ] `setEmptyCanvasSize()` — 代理到 `this.sliceRenderPipeline`
  - [ ] `convertCursorPoint()` — 代理到 `this.drawCore.crosshairTool`
  - [ ] `resetLayerCanvas()` — 直接实现
  - [ ] `enterSphereMode()` — 直接实现
  - [ ] `exitSphereMode()` — 直接实现
  - [ ] `setSyncsliceNum()` — 代理到 `this.sliceRenderPipeline`
  - [ ] `redrawDisplayCanvas()` — 代理到 `this.sliceRenderPipeline`

### 4.3 代理公共 API 方法
- [ ] `setMode()` — 保持，访问 `this.state.gui_states`
- [ ] `getMode()` — 保持
- [ ] `setOpacity()` / `getOpacity()` — 保持
- [ ] `setBrushSize()` / `getBrushSize()` — 保持
- [ ] `setWindowHigh()` / `setWindowLow()` / `finishWindowAdjustment()` — 保持
- [ ] `adjustContrast()` — 保持
- [ ] `getSliderMeta()` — 保持
- [ ] `setPencilColor()` / `getPencilColor()` — 保持
- [ ] `executeAction()` — 代理到 `this.drawCore`/`this.sliceRenderPipeline`
- [ ] `undo()` / `redo()` — 代理到 `this.drawCore`
- [ ] `enterKeyboardConfig()` / `exitKeyboardConfig()` — 修改 `this.state`
- [ ] `setKeyboardSettings()` / `getKeyboardSettings()` — 修改 `this.state`
- [ ] `drag()` — 代理到 `this.dragOperator`
- [ ] `draw()` — 代理到 `this.drawCore`
- [ ] `setupGUI()` — 调整参数来源
- [ ] `setSliceOrientation()` — 保持（使用 `this.state` + `this.drawCore`）
- [ ] 层/通道公共 API — 代理到 `this.layerChannelManager`
- [ ] 数据加载 API — 代理到 `this.dataLoader`
- [ ] Sphere API — 代理到 `this.drawCore.sphereTool`

### 4.4 处理 setupGui() 参数
- [ ] `guiOptions` 对象中的所有 `this.xxx` 引用改为显式代理
- [ ] 确保方法绑定正确（`.bind(this)` 或箭头函数）

### 4.5 编译检查
- [ ] `npx tsc --noEmit` — 无新增错误

---

## Phase 5 — 删除 CommToolsData + 清理

### 5.1 删除
- [ ] 删除 `CommToolsData.ts`
- [ ] 更新 `tools/index.ts`（如有 CommToolsData 导出）

### 5.2 Import 清理
- [ ] 更新 `DragOperator.ts` — 从 `CanvasState` 获取状态
- [ ] 更新 `tools/BaseTool.ts` — `ToolContext` 引用检查
- [ ] 更新 `coreTools/gui.ts` — 参数来源
- [ ] 更新 `src/ts/index.ts` — 移除 CommToolsData 相关（如有）
- [ ] `grep -rn "CommToolsData" src/` — 应返回零结果

### 5.3 编译检查
- [ ] `npx tsc --noEmit` — 零错误

---

## Phase 6 — 验证

### 6.1 编译
- [ ] `npx tsc --noEmit` — 零错误，零警告新增

### 6.2 现有单元测试
- [ ] `npx vitest run src/ts/Utils/segmentation/core/__tests__/` — MaskVolume 测试全部通过

### 6.3 引用完整性
- [ ] `grep -rn "extends CommToolsData" src/` — 零匹配
- [ ] `grep -rn "extends DrawToolCore" src/` — 零匹配
- [ ] `grep -rn "CommToolsData" src/` — 零匹配（文件已删除）

### 6.4 公共 API 完整性
- [ ] 对比 `src/ts/index.ts` 导出列表 — 所有类型仍可正常导出
- [ ] `NrrdTools` 实例仍可调用所有现有公共方法

### 6.5 运行时验证（用户手动）
- [ ] `npm run dev` — 项目正常启动
- [ ] 切片拖拽浏览正常
- [ ] Pencil / Brush / Eraser 绘制正常
- [ ] Undo / Redo 正常
- [ ] Sphere 放置正常
- [ ] Calculator 距离测量正常
- [ ] Layer / Channel 切换正常
- [ ] Channel 可见性切换正常
- [ ] Contrast 调节正常
- [ ] 轴向切换正常
- [ ] Zoom / Pan 正常
- [ ] Crosshair 正常
- [ ] NRRD 加载正常
- [ ] NIfTI mask 加载正常
- [ ] Mask 数据回调 (`getMaskData`) 正常触发
