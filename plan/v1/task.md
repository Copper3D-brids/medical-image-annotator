# Segmentation Module Refactoring

## Objective
重构 segmentation 模块：3 图层 × 8 通道、Uint8Array 存储、Crosshair/Sphere 跨视图定位、Vitest 测试

---

## Phase 1: Planning & Architecture Design

- [x] Create detailed implementation plan
- [x] Add data persistence strategy (Phase 0)
- [x] Document core interaction features
- [x] Document Pencil vs Brush tool differences
- [x] Document Canvas layer architecture
- [x] Add affected files analysis
- [x] Add GUI refactoring recommendations (StateManager)
- [ ] **🔒 User approval to proceed**

---

## Phase 0: Data Persistence Strategy (准备阶段)

### 0.1 Database Schema 修改
- [x] [MODIFY] `models/db_model.py` CaseOutput:
  - 删除: `mask_nii_path`, `mask_nii_size`
  - 新增: `mask_layer1_nii_path`, `mask_layer1_nii_size`
  - 新增: `mask_layer2_nii_path`, `mask_layer2_nii_size`
  - 新增: `mask_layer3_nii_path`, `mask_layer3_nii_size`
- [x] [MODIFY] `main.py` get_tool_config: 更新 file_info 映射逻辑
- [x] [MODIFY] `router/tumour_segmentation.py` get_cases_infos: 返回新字段
- [ ] 运行数据库迁移 (或重建数据库)

### 0.2 后端 API 重构
- [x] [NEW] `/api/mask/init-layers` - 创建 3 个 NIfTI 文件
- [x] [NEW] `/api/mask/delta` - 增量更新指定 layer 的 NIfTI
- [x] [NEW] `/api/mask/all/{case_id}` - 1 个请求返回全部 3 个 layer (msgpack) ⭐
- [x] [NEW] `/api/mask/raw/{case_id}/{layer_id}` - 返回 Raw Uint8Array
- [x] [NEW] `ws://host/ws/mask/{case_id}` - WebSocket 实时推送 (AI 推理)

### 0.3 前端适配
- [x] 安装依赖: `nifti-reader-js`, `@msgpack/msgpack`
- [x] `MaskLayerLoader.parseNIfTI()` - 从 NIfTI 文件加载
- [x] `MaskLayerLoader.loadFromRaw()` - 从 Raw Uint8Array 加载 ⭐
- [x] `MaskLayerLoader.loadAllMasks()` - 1 个请求加载全部
- [x] WebSocket 接收 mask 更新 (`createMaskWebSocket`)
- [x] Debounced Auto-Save 实现 (`DebouncedAutoSave` class)
- [x] 空 Mask 初始化逻辑 (`MaskLayerLoader.initializeEmptyMasks()`)
- [ ] **🧪 User Testing: 验证后端 API 响应**
- [ ] **🧪 User Testing: 验证新 case 初始化流程**
- [ ] **🧪 User Testing: 验证 NIfTI 和 Raw 两种加载方式**

---

## Phase 2: Core Data Layer

### 2.1 Types & Constants
- [x] `core/types.ts` - 定义 ExportMaskData, Delta, CHANNEL_COLORS

### 2.2 MaskLayer
- [x] `core/MaskLayer.ts` - 单图层 Uint8Array 存储
- [x] 实现 `applyBrush()` - 画笔操作
- [x] 实现 `fillPolygon()` - Pencil 多边形填充 ⭐
- [x] 实现 `erase()` - 橡皮擦
- [x] 实现 `exportSlice()` / `importSlice()` - 数据导入导出

### 2.3 LayerManager
- [x] `core/LayerManager.ts` - 3 图层管理
- [x] 实现 `getActiveLayer()` / `setActiveLayer()`
- [x] 实现 `lockLayer()` / `unlockLayer()`

### 2.4 VisibilityManager
- [x] `core/VisibilityManager.ts` - 通道显示/隐藏
- [x] 实现 `setLayerVisible()` / `setChannelVisible()`
- [x] 实现 `getVisibleLayers()` / `getVisibleChannels()`

### 2.5 UndoManager
- [x] `core/UndoManager.ts` - 每 layer 独立 undo/redo 栈
- [x] 实现 `push(deltas)` / `undo()` / `redo()`
- [x] 实现 `setActiveLayer()` 切换当前操作栈

### 2.6 KeyboardManager
- [x] `core/KeyboardManager.ts` - 可自定义快捷键
- [x] 实现 `register()` / `onAction()` / key event handlers
- [x] 支持 Crosshair/Contrast 可禁用配置

- [x] **🧪 User Testing: 创建 MaskLayer 并验证 Uint8Array 读写** ✅

---

## Phase 3: Tool Abstraction

### 3.1 BaseTool
- [x] `tools/BaseTool.ts` - 抽象接口定义
- [x] `ToolContext` 接口 (layerManager, undoManager, sizeFactor...)
- [x] 坐标转换: `screenToOriginal()` / `originalToScreen()`

### 3.2 PencilTool ⭐
- [x] `tools/PencilTool.ts` - 多边形自动填充
- [x] 拖动时画红色轮廓预览
- [x] 松开时闭合路径并填充

### 3.3 BrushTool
- [x] `tools/BrushTool.ts` - 连续圆形笔刷
- [x] 预览圆形光标
- [x] 拖动时连续填充

### 3.4 EraserTool
- [x] `tools/EraserTool.ts` - 橡皮擦
- [x] 仅擦除当前 layer

### 3.5 PanTool
- [x] `tools/PanTool.ts` - 右键平移画布

### 3.6 ZoomTool
- [x] `tools/ZoomTool.ts` - 滚轮缩放 / Slice 切换

### 3.7 ContrastTool
- [x] `tools/ContrastTool.ts` - Ctrl 调节 window center/width

### 3.8 SphereTool ⭐
- [x] `tools/SphereTool.ts` - 3D 球体放置工具
- [x] 点击放置中心 + 滚轮调节半径 [1, 50]
- [x] 初始半径: 3
- [x] 松开时 3D 球体写入多 slice (spherical / linear 两种衰减模式)
- [x] 4 种类型: tumour / skin / nipple / ribcage 独立位置
- [x] 跨轴坐标转换 via SphereAdapter.convertCursorPoint()
- [x] 回调通知: onSpherePlaced / onCalculatorPositionsUpdated

- [x] **🧪 Unit Tests: 67 tests passed (tools.test.ts)** ✅
- [ ] **🧪 User Testing: Pencil 画闭合区域并验证自动填充** ⏳ 待事件路由接管后测试
- [ ] **🧪 User Testing: Brush 涂抹并验证连续圆形叠加** ⏳ 待事件路由接管后测试
- [ ] **🧪 User Testing: Sphere 放置并验证跨 slice 数据** ⏳ 待事件路由接管后测试

---

## Phase 4: Rendering Pipeline

### 4.1 Canvas Setup
- [x] 精简为 3 个 Canvas: displayCanvas, drawingLayer, maskDisplayCanvas
- [ ] 移除旧的 8 个 Canvas ⚠️ **推迟** — 依赖 NrrdTools 移除 (Phase 7 Step 12 已跳过)

### 4.2 MaskRenderer
- [x] `rendering/MaskRenderer.ts` - 从 Uint8Array 渲染到 Canvas
- [x] 实现 `render()` - 按 visibility 设置渲染
- [x] 实现脏区域追踪优化 (dirtyRects)

### 4.3 Animation Loop
- [x] `requestAnimationFrame` 渲染循环
- [x] 仅在数据变化时重绘

- [x] **🧪 Unit Tests: 45 tests passed (rendering.test.ts)** ✅
- [ ] **🧪 User Testing: 验证 3 层 Canvas 正确显示** ⏳ 待 Canvas 架构切换后测试
- [ ] **🧪 User Testing: 验证缩放后画笔坐标正确** ⏳ 待事件路由接管后测试

---

## Phase 5: Crosshair & Sphere Tools

### 5.1 CrosshairTool
- [x] `tools/CrosshairTool.ts` - 跨视图定位
- [x] 按 S 键启用/禁用 (toggle/enable/disable API)
- [x] 点击记录 3D 坐标 (to3DCoord mapping for all 3 axes)
- [x] 跳转其他视图时同步 mask 显示 (navigateTo + CrosshairAdapter)
- [x] 复用 `convertCursorPoint()` 逻辑 (via CrosshairAdapter interface)

### 5.2 SphereTool
- [x] `tools/SphereTool.ts` - 4 个全局位置标记 (Phase 3 已完成)
- [x] tumour / skin / nipple / ribcage (Phase 3 已完成)
- [x] 滚轮调整半径 (Phase 3 已完成)

- [x] **🧪 Unit Tests: 47 tests passed (crosshair.test.ts)** ✅
- [ ] **🧪 User Testing: 在 Z 视图点击后切换到 Y 视图验证 Crosshair 同步** ⏳ 待事件路由接管后测试

---

## Phase 6: Tool Coordination (ToolCoordinator)

### 6.1 ToolCoordinator 核心
- [x] `tools/ToolCoordinator.ts` - 工具互斥与事件路由
- [x] 两级模式系统: GUI Tool Selection (Level 1) + Interaction State (Level 2)
- [x] `canUse(interaction)` - 查询当前是否允许某交互
- [x] `getAllowed()` - 返回当前所有允许的交互集合
- [x] `onStateChange` 回调 - 状态变化时通知 UI 层

### 6.2 互斥规则实现
- [x] Drawing Tools 规则 (Pencil/Brush/Eraser):
  - [x] Shift 按下时: 只允许 draw, 禁止其他全部 (含 arrowSlice)
  - [x] Shift 松开时: 允许 zoom, sliceChange, arrowSlice, pan, crosshair(S), contrast(Ctrl)
  - [x] Ctrl 按下时: 只允许 contrast + arrowSlice, 禁止其他
  - [x] Crosshair ON 时: 禁止 shift, ctrl, draw, contrast, sphere, sliceChange(left-drag); 允许 arrowSlice
- [x] Sphere 规则:
  - [x] 禁止 draw, crosshair, contrast (永久)
  - [x] 左键按下时: 也禁止 zoom, pan, sliceChange, **arrowSlice**
  - [x] 左键未按下时: 允许 zoom, pan, sliceChange, arrowSlice
- [x] Calculator 规则: 同 Sphere，但左键按下时仍允许 arrowSlice
- [x] **arrowSlice (Arrow ↑/↓)**: 仅 Shift 按下和 Sphere+左键按下时禁止，其他全允许

### 6.3 状态转换
- [x] 键盘事件: S(crosshair toggle), Shift(draw), Ctrl(contrast), Ctrl+Z/Y(undo/redo)
- [x] GUI 工具切换: 自动重置 Level 2 状态, 调用 deactivate()/activate()
- [x] Drawing 工具间切换 (Pencil↔Brush↔Eraser): 不影响 Level 2 状态

### 6.4 事件路由
- [x] `dispatchPointerDown()` - 根据当前状态路由到正确工具
- [x] `dispatchPointerMove()` - 持续操作路由
- [x] `dispatchPointerUp()` - 结束操作路由
- [x] `dispatchWheel()` - 滚轮事件路由 (zoom/slice/sphere-radius)
- [x] `dispatchArrowKey()` - Arrow ↑/↓ 键切换 slice

### 6.5 导出更新
- [x] `tools/index.ts` - 导出 ToolCoordinator, GuiTool, InteractionType
- [x] `core/index.ts` - 导出 Phase 6 新增内容

- [x] **🧪 Unit Tests: coordinator.test.ts (84 tests)** ✅
- [ ] **🧪 User Testing: 验证工具互斥规则与现有 DrawToolCore 行为一致** ⏳ 待事件路由接管后测试

---

## Phase 7A: Integration (Vue 组件集成层) ✅

> **架构说明**: Phase 7A 采用 **one-way sync (同步影子)** 模式 —— NrrdTools 仍为核心引擎驱动渲染和交互，
> SegmentationManager 作为同步层接收状态，为后续完全替换做准备。
> 详细的 Step 1-12 执行记录见 `vue_migration_task.md`。

### 7A.1 SegmentationManager
- [x] `SegmentationManager.ts` - 统一管理入口
- [x] 实现 `getMaskData()` / `setMasksData()` 兼容现有 API
- [x] 整合所有 managers 和 tools
- [x] 新增 `setCalculatorTarget()` / `getCalculatorTarget()` (Step 9)
- [x] 新增 4 个 Manager getter: `getLayerManager()`, `getUndoManager()`, `getVisibilityManager()`, `getKeyboardManager()` (Step 7)
- [x] 新增 `getRegisteredTools()` 方法 (Step 7)

### 7A.2 StateManager (GUI 解耦)
- [x] `core/StateManager.ts` - Vue 组件状态管理
- [x] 替代现有 `guiSettings.guiState` / `guiSetting.onChange()` 模式
- [x] 提供类型安全的状态更新 API

### 7A.3 Vue Component Integration (Step 1-10b)
- [x] **Step 1**: 创建 SegmentationManager 实例 (LeftPanelCore + LeftPanelController)
- [x] **Step 2**: 配置 RenderingAdapter (LeftPanelCore)
- [x] **Step 3**: 配置 DimensionAdapter + 初始化 (LeftPanelController)
- [x] **Step 4**: 迁移 useMaskOperations — 加载后同步 mask 到 SegmentationManager
- [x] **Step 5**: 迁移 useDistanceCalculation — 优先使用 SegmentationManager 获取 voxelSpacing/spaceOrigin
- [x] **Step 6**: 迁移 useSliceNavigation — 添加 segmentationManager 参数 (导航仍用 NrrdTools)
- [x] **Step 7**: 注册 8 个工具到 SegmentationManager (PencilTool, BrushTool, EraserTool, PanTool, ZoomTool, ContrastTool, SphereTool, CrosshairTool)
- [x] **Step 8**: 迁移 OperationCtl.vue — 同步工具选择 + 笔刷大小到 SegmentationManager
- [x] **Step 9**: 迁移 Calculator.vue — 同步测距目标到 SegmentationManager
- [x] **Step 10**: 迁移 OperationAdvance.vue — 接收 SegmentationManager (颜色 API 待扩展)
- [x] **Step 10b**: 🆕 新增 Layer/Channel 选择 UI (LayerChannelSelector.vue + useLayerChannel.ts)

### 7A.4 Event Bus Migration
- [x] 新增 `Core:SegmentationManager` emitter 事件 (Step 8)
- [x] 保留 `Core:NrrdTools` 事件 (NrrdTools 未移除)
- [x] 保留 `Segmentation:FinishLoadAllCaseImages` 事件
- [x] 验证所有 emitter 事件正常注册和清理 (Step 11)

### 7A.5 测试与清理 (Step 11-12)
- [x] **Step 11**: 全面测试 — TypeScript 0 新错误, 289 单元测试通过, 26 API 方法验证 ✅
- [—] **Step 12**: 移除 NrrdTools — ⚠️ **跳过** (需先完成 Phase 7B)

### 7A.6 导出更新
- [x] `@/ts/index.ts` — 导出 SegmentationManager, StateManager, 8 工具类, CHANNEL_COLORS
- [x] 类型导出: RenderingAdapter, DimensionAdapter, ToolContext, GuiTool, LayerId, ChannelValue, ImportMaskData, ExportMaskData
- [x] `composables/left-panel/index.ts` — 导出 useLayerChannel

- [x] **📖 Migration Guide: Vue 组件迁移指南已生成**
- [x] **🧪 User Testing: 验证 Vue 组件与新 API 正常交互** ✅ (Step 11 手动验证)

---

## Phase 7B: Event Routing Takeover (事件路由接管) ⏳

> [!IMPORTANT]
> **核心目标**: 将 Canvas 事件从 NrrdTools/DrawToolCore 迁移到 SegmentationManager 的 ToolCoordinator，
> 使 SegmentationManager 成为真正的核心引擎，而非仅接收同步。

### 7B.1 Canvas 事件绑定迁移
- [ ] [MODIFY] `LeftPanelCore.vue` - 将 pointer/keyboard 事件绑定到 SegmentationManager
  - [ ] `pointerdown` → `segmentationManager.dispatchPointerDown()`
  - [ ] `pointermove` → `segmentationManager.dispatchPointerMove()`
  - [ ] `pointerup` → `segmentationManager.dispatchPointerUp()`
  - [ ] `wheel` → `segmentationManager.dispatchWheel()`
  - [ ] `keydown/keyup` → `segmentationManager.onShiftChange()`, `onCtrlChange()`, `onCrosshairToggle()`
  - [ ] Arrow ↑/↓ → `segmentationManager.dispatchArrowKey()`

### 7B.2 Tool Adapters 实现与注入
- [ ] [MODIFY] `LeftPanelController.vue` - 创建并注入 Tool Adapters
  - [ ] `PanAdapter`: 实现 `getCanvasLeft/Top()`, `setCanvasPosition()`
  - [ ] `ZoomAdapter`: 实现 `getSizeFactor()`, `setSizeFactor()`, `getCurrentSlice()`, `setCurrentSlice()`, `getMaxSlice()`
  - [ ] `ContrastAdapter`: 实现 `getWindowCenter/Width()`, `setWindowCenter/Width()`, `refreshDisplay()`
  - [ ] `SphereAdapter`: 实现 `convertCursorPoint()`, `getMaxSlice()`, 回调 `onSpherePlaced`, `onCalculatorPositionsUpdated`
  - [ ] `CrosshairAdapter`: 实现 `navigateTo()`, `convertCursorPoint()`

### 7B.3 Drawing 事件接管
- [ ] [MODIFY] `LeftPanelCore.vue` - 将绘图预览从 NrrdTools 切换到 SegmentationManager
  - [ ] Pencil 红色轮廓预览 → `PencilTool.onPointerMove()` 绘制到 `drawingCanvas`
  - [ ] Brush 圆形光标预览 → `BrushTool.onPointerMove()` 绘制到 `drawingCanvas`
  - [ ] Eraser 虚线圆形预览 → `EraserTool.onPointerMove()` 绘制到 `drawingCanvas`

### 7B.4 Mask 渲染接管
- [ ] [MODIFY] `LeftPanelCore.vue` - 将 Mask 显示从 NrrdTools 切换到 MaskRenderer
  - [ ] 绑定 `MaskRenderer` 到 `maskDisplayCanvas`
  - [ ] 触发渲染: 绘图完成后调用 `segmentationManager.render()`
  - [ ] Visibility 控制: Layer/Channel 显示/隐藏通过 `VisibilityManager` 驱动渲染

### 7B.5 渲染循环接管
- [ ] [MODIFY] `LeftPanelCore.vue` - 将 `requestAnimationFrame` 循环迁移到 SegmentationManager
  - [ ] 实现 `RenderingAdapter.requestRender()` 驱动的渲染循环
  - [ ] 脏区域追踪: 仅重绘变化的区域 (MaskRenderer.dirtyRects)
  - [ ] 与 NrrdTools 的 NRRD slice 渲染协调 (NRRD 显示层仍需 NrrdTools)

### 7B.6 状态同步双向化
- [ ] [MODIFY] 将 one-way sync 改为 SegmentationManager 驱动
  - [ ] 工具选择: UI → SegmentationManager → (可选) NrrdTools
  - [ ] 笔刷大小: UI → SegmentationManager → 工具
  - [ ] Layer/Channel 选择: UI → SegmentationManager → 渲染
  - [ ] undo/redo: SegmentationManager 驱动，通知 UI 更新

### 7B.7 测试验证
- [ ] **🧪 Unit Tests**: 验证事件路由逻辑 (ToolCoordinator.dispatch* 方法)
- [ ] **🧪 Integration Test**: 验证 Canvas 事件正确触发工具响应
- [ ] **🧪 User Testing**: 验证基本交互 (点击、拖动、滚轮) 正常工作

---

## Phase 7C: Feature Verification (功能验证) ⏳

> [!IMPORTANT]
> **前置条件**: Phase 7B 完成后，所有绘图和渲染由 SegmentationManager 驱动。
> 此阶段验证所有工具功能与原有 NrrdTools/DrawToolCore 行为一致。

### 7C.1 Drawing Tools 验证
- [ ] **🧪 Pencil**: 画闭合区域 → 自动填充多边形内区域
- [ ] **🧪 Brush**: 涂抹 → 连续圆形叠加
- [ ] **🧪 Eraser**: 擦除 → 仅擦除当前 layer
- [ ] **🧪 坐标转换**: 缩放后画笔坐标正确 (sizeFactor)

### 7C.2 Navigation Tools 验证
- [ ] **🧪 Pan**: 右键拖动平移画布
- [ ] **🧪 Zoom**: 滚轮定点缩放 (1x-8x)
- [ ] **🧪 Slice Navigation**: 滚轮/左键拖动/Arrow ↑↓ 切换 slice
- [ ] **🧪 Contrast**: Ctrl + 拖动调节 window center/width

### 7C.3 Crosshair 验证
- [ ] **🧪 Toggle**: S 键启用/禁用
- [ ] **🧪 Click**: 在 Z 视图点击后显示十字虚线
- [ ] **🧪 Cross-View Sync**: 切换到 Y/X 视图时 Crosshair 位置正确同步

### 7C.4 Sphere 验证
- [ ] **🧪 Place**: 左键点击放置球心
- [ ] **🧪 Radius**: 滚轮调节半径 [1, 50]
- [ ] **🧪 3D Render**: 球体跨多个 slice 正确显示
- [ ] **🧪 Calculator**: tumour/skin/nipple/ribcage 4 个位置标记

### 7C.5 Data Persistence 验证
- [ ] **🧪 Save**: 绘制后数据通过 `/api/mask/delta` 增量保存
- [ ] **🧪 Load**: 加载 case 时通过 `/api/mask/all` 获取全部 layer 数据
- [ ] **🧪 NIfTI Format**: 验证 NIfTI 文件格式正确

### 7C.6 Undo/Redo 验证
- [ ] **🧪 Undo**: Ctrl+Z 撤销当前 layer 操作
- [ ] **🧪 Redo**: Ctrl+Y 重做
- [ ] **🧪 Per-Layer Stack**: 切换 layer 后 undo/redo 栈独立

### 7C.7 Tool Coordination 验证
- [ ] **🧪 互斥规则**: 验证 ToolCoordinator `canUse()` 与原有 DrawToolCore 行为一致
- [ ] **🧪 状态转换**: Shift/Ctrl 按键正确切换模式
- [ ] **🧪 GUI 工具切换**: Pencil↔Brush↔Eraser↔Sphere↔Calculator 切换正常

- [ ] **🎉 Phase 7C 完成后**: 达成 **SegmentationManager Mask 操作接管** 里程碑

---

## Phase 7D: Rendering Coordination (渲染协调) ⏳

> [!IMPORTANT]
> **架构决策**: 采用协作模式
> - **SegmentationManager**: 负责 Mask 绘制、渲染、Layer/Channel 管理
> - **NrrdTools**: 保留负责 NRRD slice 显示、Slice 导航、Zoom/Pan (NRRD 层)
> - 两者通过事件和回调协同工作

### 7D.1 职责边界定义

| 模块 | 职责 | 事件/API |
|------|------|---------|
| **SegmentationManager** | Mask 绘制 | `dispatchPointer*()` (Shift + 左键) |
| **SegmentationManager** | Mask 渲染 | `MaskRenderer.render()` |
| **SegmentationManager** | Layer/Channel | `setActiveLayer()`, `setActiveChannel()` |
| **SegmentationManager** | 工具互斥 | `ToolCoordinator.canUse()` |
| **SegmentationManager** | Undo/Redo | `UndoManager.undo()`, `redo()` |
| **NrrdTools** | NRRD slice 渲染 | `displaySlice()` |
| **NrrdTools/DragOperator** | Slice 导航 | 左键拖动 / 滚轮 / Arrow ↑↓ |
| **NrrdTools** | Zoom/Pan (NRRD 层) | 滚轮 / 右键拖动 |
| **NrrdTools** | Contrast 调节 | Ctrl + 拖动 |

### 7D.2 事件路由协调

**事件路由优先级**:
```
PointerEvent
    ↓
SegmentationManager.ToolCoordinator.canUse() 检查
    ↓
    ├─ 是绘图事件 (shiftHeld + leftButton) → SegmentationManager
    ├─ 是 Crosshair 事件 (crosshairEnabled) → SegmentationManager
    ├─ 是 Sphere/Calculator 事件 → SegmentationManager
    └─ 其他 (slice drag, pan, zoom) → NrrdTools/DragOperator
```

- [ ] [NEW] 创建 `EventRouter` 或在 `LeftPanelCore.vue` 实现路由逻辑
- [ ] [MODIFY] 根据 `ToolCoordinator.canUse()` 决定事件分发目标

### 7D.3 Slice 变化回调

**问题**: 当 slice 通过 NrrdTools 变化时，SegmentationManager 需要更新 Mask 显示

- [ ] [NEW] 实现 `SliceChangeCallback` 接口
  ```typescript
  interface SliceChangeCallback {
    onSliceChange(axis: 'x' | 'y' | 'z', sliceIndex: number): void;
  }
  ```
- [ ] [MODIFY] NrrdTools/DragOperator 在 slice 变化时调用回调
- [ ] [MODIFY] SegmentationManager 响应回调，调用 `MaskRenderer.render()`

### 7D.4 Zoom 变化回调

**问题**: 当缩放通过 NrrdTools 变化时，MaskRenderer 需要同步缩放

- [ ] [NEW] 实现 `ZoomChangeCallback` 接口
  ```typescript
  interface ZoomChangeCallback {
    onZoomChange(sizeFactor: number): void;
  }
  ```
- [ ] [MODIFY] NrrdTools 在缩放变化时调用回调
- [ ] [MODIFY] MaskRenderer 响应回调，重新渲染

### 7D.5 Canvas 层级协调

**Canvas 叠加顺序** (从底到顶):
```
┌─────────────────────────────────────────────────────────┐
│ Layer 3: maskDisplayCanvas (SegmentationManager)        │  z-index: 3
│   - MaskRenderer.render()                               │
├─────────────────────────────────────────────────────────┤
│ Layer 2: drawingCanvas (SegmentationManager)            │  z-index: 2
│   - 工具预览 (Pencil 轮廓, Brush 光标, Crosshair)         │
├─────────────────────────────────────────────────────────┤
│ Layer 1: displayCanvas (NrrdTools)                      │  z-index: 1
│   - NRRD slice 渲染                                     │
└─────────────────────────────────────────────────────────┘
```

- [ ] 确认 Canvas 层级 z-index 正确
- [ ] 确认 Mask 透明度正确 (globalAlpha)

### 7D.6 测试验证

- [ ] **🧪 Slice 同步**: 拖动切换 slice 后 Mask 正确更新
- [ ] **🧪 Zoom 同步**: 缩放后 Mask 与 NRRD 对齐
- [ ] **🧪 事件路由**: Shift+绘图 和 普通拖动 正确分流
- [ ] **🧪 工具切换**: 切换工具后事件路由正确

- [ ] **🎉 Phase 7D 完成后**: 达成 **协作模式完整运行** 里程碑

---

## Phase 7 完成标准

> [!NOTE]
> Phase 7A + 7B + 7C + 7D 全部完成后，前端 Mask 模块迁移工作完成。
> 
> **最终架构**:
> - SegmentationManager: Mask 操作的核心引擎
> - NrrdTools: NRRD 显示的核心引擎 (保留，精简后)
> - 两者通过回调协同，共用 Canvas 容器

---

## Phase 8: Testing (Vitest) ✅ (289 tests passing)

### 8.1 Setup
- [x] 安装 `vitest @vitest/ui jsdom` ✅
- [x] 配置 `vitest.config.ts` ✅

### 8.2 Unit Tests (已完成，按模块分布)
- [x] `core.test.ts` — 46 tests ✅ (MaskLayer, LayerManager, UndoManager, VisibilityManager, KeyboardManager)
- [x] `tools.test.ts` — 67 tests ✅ (PencilTool, BrushTool, EraserTool, PanTool, ZoomTool, ContrastTool, SphereTool)
- [x] `rendering.test.ts` — 45 tests ✅ (MaskRenderer)
- [x] `crosshair.test.ts` — 47 tests ✅ (CrosshairTool)
- [x] `coordinator.test.ts` — 84 tests ✅ (ToolCoordinator 互斥规则, 事件路由, 状态转换)

### 8.3 Integration Tests
- [ ] Vue 组件与 SegmentationManager 集成测试 (待实现)
- [ ] 端到端: 绘制 → 保存 → 加载 完整流程测试 (待实现)

- [x] **🧪 User Testing: 运行 `npx vitest run` 验证所有 289 测试通过** ✅

---

## Phase 9: Cleanup & Documentation

> [!WARNING]
> **前置条件**: Phase 7B + 7C + 7D 完成后才能执行。
> 
> **架构决策**: NrrdTools 保留负责 NRRD 显示，SegmentationManager 负责 Mask。
> 仅删除已被替代的功能代码，不完全删除 NrrdTools。

### 9.1 精简 NrrdTools (保留 NRRD 显示功能)

> [!NOTE]
> NrrdTools 保留以下核心功能，其他功能已迁移到 SegmentationManager

**保留的功能**:
- ✅ NRRD slice 渲染 (`displaySlice()`)
- ✅ Slice 导航 (drag, scroll)
- ✅ Zoom/Pan (NRRD 层)
- ✅ Contrast 调节
- ✅ DragOperator (`drag()`, `drawDragSlice()`)

**需移除的功能** (已迁移到 SegmentationManager):
- [ ] [DELETE] `NrrdTools.getMaskData()` / `setMasksData()` → SegmentationManager
- [ ] [DELETE] `NrrdTools` 中的绘图相关代码 → tools/
- [ ] [DELETE] `NrrdTools` 中的 Layer 管理代码 → LayerManager
- [ ] [DELETE] `NrrdTools` 中的 Undo 相关代码 → UndoManager

**事件清理**:
- [ ] [MODIFY] `Core:NrrdTools` emitter 事件内容精简 (仅传递 slice/zoom 相关)
- [ ] [KEEP] NrrdTools 实例仍然保留在 `LeftPanelCore.vue`

### 9.2 删除/评估旧代码

#### 9.2.1 确定删除
- [ ] [DELETE] `CommToolsData.ts` (状态已迁移到 SegmentationManager)
- [ ] [DELETE] `DrawToolCore.ts` (功能已拆分到 tools/)

#### 9.2.2 `DragOperator.ts` — **部分保留**
> Slice drag 功能与 NRRD 渲染紧密耦合，需评估每个功能。

| 功能 | 迁移状态 | 决定 |
|------|---------|------|
| `drag()` — 左键拖动切换 slice | ⏳ 待迁移 | 迁移到 `SliceDragAdapter` 或 `ZoomTool` |
| `updateIndex()` — 更新 slice 索引 | ⏳ 待迁移 | → `SegmentationManager.setCurrentSlice()` |
| `drawDragSlice()` — 拖动时绘制 slice | 🔒 保留 | 依赖 NrrdTools slice 渲染 |
| `drawMaskToLabelCtx()` — 绘制 mask | ✅ 已替代 | 已被 `MaskRenderer.render()` 替代 |
| `cleanCanvases()` — 清理 canvas | ⏳ 部分迁移 | → `MaskRenderer.clear()` |
| `updateShowNumDiv()` — 更新 slice 编号 | 🔒 保留 | UI 辅助功能 |

- [ ] [EVALUATE] 确认 `drag()` 是否迁移到 `SegmentationManager`
- [ ] [EVALUATE] 确认 `drawDragSlice()` 是否可抽取为 adapter
- [ ] [PARTIAL-DELETE] 删除已被替代的方法 (`drawMaskToLabelCtx`)

#### 9.2.3 `coreTools/` 目录

| 文件 | 大小 | 决定 | 理由 |
|------|------|------|------|
| `coreType.ts` | 10KB | ✅ 可删除 | 类型已迁移到 `core/types.ts` |
| `gui.ts` | 16KB | 🔒 暂保留 | dat.gui 控制面板仍在使用 |
| `divControlTools.ts` | 2KB | 🔒 保留 | slice 编号 div 辅助功能 |
| `archive.ts` | 1KB | ❓ 待确认 | 需确认是否仍在使用 |

- [ ] [DELETE] `coreTools/coreType.ts` — 类型已完全迁移
- [ ] [EVALUATE] `coreTools/gui.ts` — 评估 dat.gui 是否仍需要:
  - [ ] 如果 Vue 组件完全取代 dat.gui 控制面板 → 删除
  - [ ] 如果仍需 dat.gui 控制面板 → 保留并简化
- [ ] [KEEP] `coreTools/divControlTools.ts` — slice 编号显示功能
- [ ] [EVALUATE] `coreTools/archive.ts` — 确认是否仍在使用

### 9.3 文档更新
- [ ] 更新 README 添加新架构说明
- [ ] 添加 SegmentationManager API 文档
- [ ] 添加迁移指南 (从 NrrdTools 到 SegmentationManager)

### 9.4 代码审查
- [ ] 代码审查: SegmentationManager 核心逻辑
- [ ] 代码审查: Tool 类实现
- [ ] 代码审查: Vue 组件集成

- [ ] **🎉 Final User Acceptance Testing**

---

## Legend

- `[ ]` 未开始
- `[/]` 进行中
- `[x]` 已完成
- `🔒` 需要用户批准
- `🧪` 用户测试检查点
- `⭐` 核心功能
