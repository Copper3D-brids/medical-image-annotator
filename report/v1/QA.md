# Core Data Layer Q&A

> Phase 2 核心模块的使用方式快速问答

---

## Q1: 从外部接收到 3 层 mask Uint8Array 数据，如何加载？

**方法 A：直接用 LayerManager**

```typescript
import { layerManager } from './core';

const dims = { width: 512, height: 512, depth: 100 };

layerManager.initialize(dims);

layerManager.setLayerData('layer1', layer1Uint8Array);
layerManager.setLayerData('layer2', layer2Uint8Array);
layerManager.setLayerData('layer3', layer3Uint8Array);
```

**方法 B：用 MaskLayerLoader 的便捷方法**

```typescript
import { maskLayerLoader } from './core';

maskLayerLoader.loadFromRaw('layer1', layer1Uint8Array);
maskLayerLoader.loadFromRaw('layer2', layer2Uint8Array);
maskLayerLoader.loadFromRaw('layer3', layer3Uint8Array);
```

---

## Q2: 隐藏 layer2 的 channel3，隐藏整个 layer3，其他都显示？

```typescript
import { visibilityManager } from './core';

visibilityManager.setChannelVisible('layer2', 3, false);  // 隐藏 layer2 的 channel 3
visibilityManager.setLayerVisible('layer3', false);        // 隐藏整个 layer3

// 渲染时判断某个 voxel 是否该画：
const shouldDraw = visibilityManager.shouldRenderVoxel('layer2', channelValue);
```

---

## Q3: 在 slice Z=12 上用 pencil 画笔更新 mask 后，如何同步后端？

```typescript
import { layerManager, undoManager, autoSave } from './core';

// pencil 画完闭合多边形后，填充得到 deltas
const polygon = [{ x: 10, y: 10 }, { x: 50, y: 10 }, { x: 30, y: 40 }];
const deltas = layerManager.fillPolygon(12, polygon, 3);  // slice=12, channel=3

// 推入 undo 栈
undoManager.push(deltas);

// 推入自动保存（debounce 500ms 后触发 saveCallback）
autoSave.addChanges(deltas);
```

后端更新依赖项目层注入的回调，在项目层做一次：

```typescript
autoSave.setSaveCallback(async (layerId, changes) => {
    await useApplyMaskDelta({ caseId, layer: layerId, changes });
});
```

之后每次 `addChanges` 都会自动 debounce 攒批后调用这个回调。

---

## Q4: 如何调用 undo/redo？调用后会不会更新后端数据？

```typescript
// Undo
const undoneDeltas = undoManager.undo();
if (undoneDeltas) {
    layerManager.applyDeltas(undoneDeltas, true);   // reverse=true，回退 voxel 数据
    autoSave.addChanges(undoneDeltas);               // ← 你决定是否同步后端
}

// Redo
const redoneDeltas = undoManager.redo();
if (redoneDeltas) {
    layerManager.applyDeltas(redoneDeltas, false);  // reverse=false，正向重做
    autoSave.addChanges(redoneDeltas);               // ← 你决定是否同步后端
}
```

**Undo/Redo 本身不会自动更新后端。**

- `UndoManager` 只管理 Delta 栈
- `LayerManager.applyDeltas()` 只修改内存中的 Uint8Array
- 是否同步后端完全由调用方决定：喂给 `autoSave.addChanges()` 就会触发后端更新，不喂就不会

---

## Q5: autoSave 与 LayerManager 之间是怎么联系的？

它们之间**没有直接联系**——是完全独立的两个模块。

连接点在**调用方**（将来的 Tool 层或业务层），由调用方手动把 `LayerManager` 返回的 `Delta[]` 喂给 `autoSave`：

```
LayerManager.fillPolygon()  →  返回 Delta[]  →  调用方拿到
                                                    │
                                    调用方手动调用   ↓
                                              autoSave.addChanges(deltas)
```

具体来说：

```typescript
// 调用方（将来的 Tool 层）负责串联
const deltas = layerManager.fillPolygon(12, polygon, 3);  // step 1: 修改内存
undoManager.push(deltas);                                   // step 2: 记录 undo
autoSave.addChanges(deltas);                                // step 3: 同步后端
```

三个模块各自只做一件事：

| 模块 | 职责 | 知道其他模块吗？ |
|------|------|-----------------|
| `LayerManager` | 修改 Uint8Array，返回 Delta[] | 不知道 |
| `UndoManager` | 存储 Delta 栈 | 不知道 |
| `DebouncedAutoSave` | 攒批 Delta，debounce 后调回调 | 不知道 |

它们之间是**松耦合**的，由 Phase 3 的 Tool 层（BaseTool / PencilTool 等）负责编排串联。这也是为什么 Phase 3 Tool Abstraction 排在 Phase 2 之后——Tool 层就是把这些独立模块组合起来的胶水层。

---

## Q6: Core 模块之间的关系和配合使用场景

### 文件依赖关系

```
types.ts  ← 所有模块的基础，定义 LayerId, Delta, ChannelValue 等
   ↑
MaskLayer.ts  ← 单层 Uint8Array 存储，被 LayerManager 使用
   ↑
LayerManager.ts  ← 管理 3 个 MaskLayer，被 MaskLayerLoader 使用
   ↑
MaskLayerLoader.ts  ← 数据加载，内部持有 LayerManager 引用

(以下三个相互独立，都只依赖 types.ts)
VisibilityManager.ts  ← 独立，只读 types
UndoManager.ts        ← 独立，只读 types
DebouncedAutoSave.ts  ← 独立，只读 types
KeyboardManager.ts    ← 完全独立，零 import
```

### 模块职责一句话总结

| 模块 | 一句话 |
|------|--------|
| `types.ts` | 定义所有数据结构 (Delta, LayerId, ChannelValue, 颜色表等) |
| `MaskLayer` | 一个 layer 的 Uint8Array 读写 (brush, polygon, erase) |
| `LayerManager` | 管 3 个 MaskLayer + layer 切换 / 锁定 |
| `MaskLayerLoader` | 从外部加载数据，分发给 LayerManager |
| `VisibilityManager` | 控制 layer / channel 的显示隐藏 |
| `UndoManager` | 每个 layer 独立的 undo/redo Delta 栈 |
| `DebouncedAutoSave` | 攒批 Delta，debounce 后调用回调同步后端 |
| `KeyboardManager` | 快捷键绑定 (Shift=draw, Ctrl+Z=undo 等) |

---

### 场景 1: 初始化 — 打开一个 case，加载已有 mask 数据

参与模块: `MaskLayerLoader` → `LayerManager` → `UndoManager`

```typescript
import { maskLayerLoader, layerManager, undoManager, autoSave } from './core';

// 1. 注入项目层 API (只做一次)
maskLayerLoader.setAdapter(myAdapter);
autoSave.setSaveCallback(mySaveCallback);

// 2. 从后端加载 3 层数据
await maskLayerLoader.loadAllMasks(caseId);
// 内部: adapter.fetchAllMasks() → layerManager.initialize(dims) → setLayerData()

// 3. 清空 undo 栈 (新 case 不需要之前的历史)
undoManager.clearAll();
```

---

### 场景 2: 绘制 — 用户用 Brush 画笔在 slice 上画

参与模块: `KeyboardManager` → `LayerManager` → `UndoManager` → `DebouncedAutoSave`

```typescript
import { layerManager, undoManager, autoSave, keyboardManager } from './core';

// KeyboardManager 检测到 Shift 按下 → 进入 draw 模式
keyboardManager.onAction((action) => {
    if (action === 'draw') { /* 激活画笔 */ }
});

// 用户拖动鼠标，每次 mousemove 调用 brush
const allDeltas: Delta[] = [];

function onMouseMove(x: number, y: number) {
    const deltas = layerManager.applyBrush(sliceIndex, x, y, radius, channel);
    allDeltas.push(...deltas);
    // → 此时 MaskLayer 的 Uint8Array 已经被修改了，可以立即重绘 canvas
}

// mouseup 时，一次性提交整个笔画
function onMouseUp() {
    if (allDeltas.length > 0) {
        undoManager.push(allDeltas);        // 整个笔画作为一次 undo 操作
        autoSave.addChanges(allDeltas);     // 攒批后自动同步后端
    }
    allDeltas.length = 0;
}
```

---

### 场景 3: 渲染 — 把 mask 画到 canvas 上

参与模块: `LayerManager` → `VisibilityManager` → `types.ts (CHANNEL_RGB)`

```typescript
import { layerManager, visibilityManager, CHANNEL_RGB } from './core';
import type { LayerId, ChannelValue } from './core';

function renderMaskToCanvas(ctx: CanvasRenderingContext2D, sliceIndex: number) {
    const imageData = ctx.createImageData(width, height);
    const pixels = imageData.data;

    const layers: LayerId[] = ['layer1', 'layer2', 'layer3'];

    for (const layerId of layers) {
        const sliceData = layerManager.getSlice(layerId, sliceIndex);

        for (let i = 0; i < sliceData.length; i++) {
            const channel = sliceData[i] as ChannelValue;

            // VisibilityManager 决定是否渲染这个 voxel
            if (!visibilityManager.shouldRenderVoxel(layerId, channel)) continue;

            // 用 CHANNEL_RGB 颜色表写入像素
            const [r, g, b, a] = CHANNEL_RGB[channel];
            const px = i * 4;
            pixels[px] = r;
            pixels[px + 1] = g;
            pixels[px + 2] = b;
            pixels[px + 3] = a;
        }
    }

    ctx.putImageData(imageData, 0, 0);
}
```

---

### 场景 4: Undo/Redo — 用户按 Ctrl+Z / Ctrl+Y

参与模块: `KeyboardManager` → `UndoManager` → `LayerManager` → `DebouncedAutoSave`

```typescript
keyboardManager.onAction((action) => {
    if (action === 'undo') {
        const deltas = undoManager.undo();
        if (deltas) {
            layerManager.applyDeltas(deltas, true);   // reverse=true 回退
            autoSave.addChanges(deltas);               // 同步后端
            renderMaskToCanvas(ctx, currentSlice);      // 重绘
        }
    }
    if (action === 'redo') {
        const deltas = undoManager.redo();
        if (deltas) {
            layerManager.applyDeltas(deltas, false);  // 正向重做
            autoSave.addChanges(deltas);
            renderMaskToCanvas(ctx, currentSlice);
        }
    }
});
```

---

### 场景 5: 切换 layer — 用户切到 layer2 编辑

参与模块: `LayerManager` → `UndoManager`

```typescript
const targetLayer = 'layer2';

// 两个 manager 都要同步切换
const success = layerManager.setActiveLayer(targetLayer);  // 如果 locked 会返回 false
if (success) {
    undoManager.setActiveLayer(targetLayer);
    // 之后所有 applyBrush/fillPolygon 都作用于 layer2
    // undo/redo 也只影响 layer2 的栈
}
```

---

### 场景 6: 页面关闭 — 确保未保存的数据不丢失

参与模块: `DebouncedAutoSave`

```typescript
window.addEventListener('beforeunload', () => {
    autoSave.beforeUnload();  // 用 sendBeacon 把剩余的 pending changes 发出去
});
```

---

### 完整数据流

```
┌──────────────────────────────────────────────────────────────────┐
│                        用户交互层                                  │
│  KeyboardManager: Shift→draw, Ctrl+Z→undo, Ctrl+Y→redo          │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Tool 层 (Phase 3)                             │
│  PencilTool / BrushTool / EraserTool (将来实现)                    │
│  负责: 坐标转换, 调用 LayerManager, 分发 Delta                     │
└──────┬──────────────┬──────────────┬────────────────────────────┘
       │              │              │
       ▼              ▼              ▼
  LayerManager   UndoManager   DebouncedAutoSave
  修改 Uint8Array  存 Delta 栈    攒批 → 回调
       │                              │
       ▼                              ▼
  VisibilityManager              项目层 API
  + CHANNEL_RGB                  (依赖注入)
  → Canvas 渲染                  → 后端同步
```

---

## Q7: Delta 的 prev 和 next 存的是什么？

存的是**单个 voxel 的 channel 值 (0-8)**，不是整个 slice 的数据。

参考 `types.ts:54-61`：

```typescript
export interface Delta {
    layer: LayerId;   // 哪个 layer
    axis: AxisType;   // 哪个轴
    slice: number;    // 第几个 slice
    idx: number;      // 这个 slice 内的 1D 索引 (y * width + x)
    prev: number;     // 修改前这个 voxel 的 channel 值 (0-8)
    next: number;     // 修改后这个 voxel 的 channel 值 (0-8)
}
```

一个 Delta 就是**一个像素点的变更记录**。实际赋值过程 (`MaskLayer.ts:120-133`)：

```typescript
const prev = sliceData[idx];          // 改之前：比如 0 (透明)
sliceData[idx] = channel;             // 改之后：比如 3 (蓝色)
deltas.push({
    layer: this.id,
    axis: this.currentAxis,
    slice,
    idx,                              // 比如 idx = 100*512+200 = 51400
    prev,                             // 0
    next: channel,                    // 3
});
```

一次 brush 操作会产生**很多个 Delta**（圆形范围内每个被改变的 voxel 各一个）。Undo 时逐个把 `sliceData[idx]` 从 `next` 恢复成 `prev`。
