# 事件监听函数分析

本文档记录了 `DrawToolCore.ts` 和 `DragOperator.ts` 中的事件监听函数。

---

## DrawToolCore.ts 中的监听函数

### 1. 键盘事件监听 (在 `initDrawToolCore` 方法中)

| 事件类型 | 监听对象 | 处理函数 | 功能 |
|----------|----------|----------|------|
| `keydown` | `container` | 匿名函数 (L60-82) | 处理绘图模式切换(`draw` 键)、十字光标(`crosshair` 键)、撤销(`Ctrl+Z`) |
| `keyup` | `container` | 匿名函数 (L83-108) | 处理对比度模式切换(`contrast` 键)、绘图模式退出 |

### 2. 画布/指针事件监听 (在 `paintOnCanvas` 方法中)

| 事件类型 | 监听对象 | 处理函数 | 功能 |
|----------|----------|----------|------|
| `wheel` | `drawingCanvas` | `handleMouseZoomSliceWheel` (L290-296) | 鼠标滚轮缩放/切片 |
| `pointerdown` | `drawingCanvas` | `handleOnDrawingMouseDown` (L452-456) | 鼠标按下处理（绘图/拖拽/球形标注等） |
| `pointermove` | `drawingCanvas` | `handleOnDrawingMouseMove` (L405-408) | 绘图时鼠标移动（动态添加/移除） |
| `pointermove` | `drawingCanvas` | `handleOnPanMouseMove` (L443-446) | 平移画板时鼠标移动（动态添加/移除） |
| `pointerup` | `drawingCanvas` | `handleOnDrawingMouseUp` (L401-404, L487-490等) | 鼠标释放处理 |
| `pointerleave` | `drawingCanvas` | 匿名函数 (L710-742) | 鼠标离开画布时清理状态 |
| `mouseover`/`mouseout` | `drawingCanvas` | `handleOnDrawingBrushCricleMove` (L314-335) | 笔刷圆形跟踪 |
| `wheel` | `drawingCanvas` | `handleSphereWheel` (L482-486) | 球形工具滚轮调整（动态添加/移除） |

### 3. 对比度事件监听 (定义在 `contrastEventPrameters` 中)

```typescript
contrastEventPrameters: IContrastEvents = {
  handleOnContrastMouseDown: (ev: MouseEvent) => { },
  handleOnContrastMouseMove: (ev: MouseEvent) => { },
  handleOnContrastMouseUp: (ev: MouseEvent) => { },
  handleOnContrastMouseLeave: (ev: MouseEvent) => { },
}
```

### 4. 绘图事件参数 (定义在 `drawingPrameters` 中)

```typescript
drawingPrameters: IDrawingEvents = {
  handleOnDrawingMouseDown: (ev: MouseEvent) => { },
  handleOnDrawingMouseMove: (ev: MouseEvent) => { },
  handleOnPanMouseMove: (ev: MouseEvent) => { },
  handleOnDrawingMouseUp: (ev: MouseEvent) => { },
  handleOnDrawingMouseLeave: (ev: MouseEvent) => { },
  handleOnDrawingBrushCricleMove: (ev: MouseEvent) => { },
  handleMouseZoomSliceWheel: (e: WheelEvent) => { },
  handleSphereWheel: (e: WheelEvent) => { },
};
```

---

## DragOperator.ts 中的监听函数

### 1. 键盘事件监听 (在 `drag` 方法中)

| 事件类型 | 监听对象 | 处理函数 | 功能 |
|----------|----------|----------|------|
| `keydown` | `container` | 匿名函数 (L168-175) | 按下 `draw` 键时移除拖拽模式 |
| `keyup` | `container` | 匿名函数 (L176-196) | 根据 `contrast`/`draw` 键切换拖拽模式 |

### 2. 拖拽相关事件监听 (在 `drag` 方法和 `configDragMode`/`removeDragMode` 中)

| 事件类型 | 监听对象 | 处理函数 | 功能 |
|----------|----------|----------|------|
| `pointerdown` | `container` | `handleOnDragMouseDown` (L113-129, L399-408) | 开始拖拽，记录初始位置 |
| `pointermove` | `container` | `handleOnDragMouseMove` (L130-150) | 拖拽过程中更新切片索引（动态添加/移除） |
| `pointerup` | `container` | `handleOnDragMouseUp` (L152-164, L404-408) | 结束拖拽，恢复滚轮事件 |

### 3. 拖拽事件参数 (定义在 `dragPrameters` 中)

```typescript
private dragPrameters: IDragPrameters = {
  move: 0,
  y: 0,
  h: 0,
  sensivity: 1,
  handleOnDragMouseUp: (ev: MouseEvent) => {},
  handleOnDragMouseDown: (ev: MouseEvent) => {},
  handleOnDragMouseMove: (ev: MouseEvent) => {},
};
```

### 4. 模式切换方法

- **`configDragMode`** (L397-409): 添加 `pointerdown` 和 `pointerup` 监听
- **`removeDragMode`** (L410-423): 移除 `pointerdown` 和 `pointerup` 监听

---

## 总结

| 文件 | 键盘监听 | 指针/鼠标监听 | 滚轮监听 |
|------|----------|---------------|----------|
| **DrawToolCore.ts** | 2个 (`keydown`, `keyup`) | 6个 (含动态添加/移除) | 2个 (`handleMouseZoomSliceWheel`, `handleSphereWheel`) |
| **DragOperator.ts** | 2个 (`keydown`, `keyup`) | 3个 (`pointerdown`, `pointermove`, `pointerup`) | 0个（内部会移除/添加 DrawToolCore 的滚轮监听） |

---

## 事件流程说明

### DrawToolCore 事件流程

1. **初始化阶段** (`initDrawToolCore`):
   - 绑定键盘 `keydown`/`keyup` 监听到 `container`

2. **绑定绘图事件** (`paintOnCanvas`):
   - 绑定 `wheel` 事件用于缩放/切片
   - 绑定 `pointerdown` 事件用于启动绘图或其他交互
   - 动态添加/移除 `pointermove` 和 `pointerup` 事件

3. **模式切换**:
   - 按住 `Shift` 进入绘图模式
   - 按 `Ctrl` 进入对比度调整模式
   - 按 `C` 切换十字光标模式

### DragOperator 事件流程

1. **初始化阶段** (`drag`):
   - 绑定键盘 `keydown`/`keyup` 监听到 `container`
   - 调用 `configDragMode()` 启用拖拽模式

2. **拖拽过程**:
   - `pointerdown`: 记录起始位置，移除滚轮事件，添加 `pointermove` 监听
   - `pointermove`: 计算移动距离，更新切片索引
   - `pointerup`: 移除 `pointermove` 监听，恢复滚轮事件

3. **模式切换**:
   - 按下 `draw` 键时调用 `removeDragMode()` 禁用拖拽
   - 释放 `draw` 键或 `contrast` 键时调用 `configDragMode()` 启用拖拽
