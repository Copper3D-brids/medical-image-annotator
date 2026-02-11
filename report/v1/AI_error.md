# ⚠️ AI Error Analysis & User Corrections

> [!CAUTION]
> This document records mistakes made by AI during implementation and the correct approach demonstrated by the user.

---

## Phase 0: Data Persistence Strategy

### 我的错误 (AI Mistakes)

| 问题 | 我的做法 (错误) | 正确做法 |
|------|---------------|---------|
| **1. 硬编码文件名** | 直接写死 `"mask.json"`, `"layer1.nii.gz"` 等 | 使用 `Config.OUTPUTS` 循环动态生成 |
| **2. 忽略 sam-X 文件夹结构** | 直接将文件放在 case 文件夹下 | 每个输出类型应放在 `sam-{idx+1}/` 子文件夹 |
| **3. 没有分析现有代码模式** | 自由发挥，没有遵循现有逻辑 | 应仔细分析 `Config.OUTPUTS` 的使用方式 |
| **4. 字段命名不一致** | 使用 `mask_json_path` 而非 `mask_meta_json_path` | 应严格匹配 `Config.OUTPUTS` 命名 |

### 用户修正后的正确代码

```python
# main.py - 正确的文件创建逻辑
for idx, output_type in enumerate(Config.OUTPUTS):
    # 动态生成文件扩展名
    filename = output_type
    if "json" in output_type and not filename.endswith(".json"):
        filename += ".json"
    elif "nii" in output_type and not filename.endswith(".nii.gz"):
        filename += ".nii.gz"
    elif "obj" in output_type and not filename.endswith(".obj"):
        filename += ".obj"

    # 创建 sam-X 子文件夹 (遵循现有结构)
    sam_folder = output_dir / cohort / f"sam-{idx + 1}"
    sam_folder.mkdir(exist_ok=True, parents=True)
    file_path = sam_folder / filename

    # 创建空文件并记录信息
    if not file_path.exists():
        file_path.touch()
    file_info[output_type] = {
        "path": str(file_path),
        "size": file_path.stat().st_size
    }
```

### 正确的文件结构

```
outputs/user-xxx/assay-xxx/medical-image-annotator-outputs/
└── case-name/
    ├── sam-1/
    │   └── mask-meta-json.json       # Config.OUTPUTS[0]
    ├── sam-2/
    │   └── mask-layer1-nii.nii.gz    # Config.OUTPUTS[1]
    ├── sam-3/
    │   └── mask-layer2-nii.nii.gz    # Config.OUTPUTS[2]
    ├── sam-4/
    │   └── mask-layer3-nii.nii.gz    # Config.OUTPUTS[3]
    └── sam-5/
        └── mask-obj.obj              # Config.OUTPUTS[4]
```

### 教训总结

1. **分析现有代码**: 在做 refactor 时，必须先理解现有代码的设计模式
2. **遵循 Config**: 使用 `Config.INPUTS` 和 `Config.OUTPUTS` 定义的结构
3. **保持一致**: 字段命名、文件结构、API 响应都要与 Config 保持一致
4. **不要自由发挥**: Refactor 是改进代码，不是重写代码

---

## Phase 2: Core Data Layer

### 我的错误 (AI Mistakes)

| 问题 | 我的做法 (错误) | 正确做法 |
|------|---------------|---------|
| **1. MaskLayerLoader/DebouncedAutoSave 直接 import 项目 API** | 在 `ts/` npm 包内的这两个模块中直接 `import` 项目级路径 (`@/plugins/api/masks.ts`, `@msgpack/msgpack`, `nifti-reader-js`) | 使用**依赖注入**模式：定义 adapter 接口 (`MaskLoaderAdapter`, `SaveDeltaCallback`)，由项目层提供实现，npm 包内不直接依赖任何项目模块 |
| **2. 过度修正 - 错误地删除模块** | 发现问题后直接删除了 `MaskLayerLoader` 和 `DebouncedAutoSave` 的 export 和文件 | 应保留模块，用依赖注入重写，使其不依赖项目路径。不应擅自删除用户的代码 |
| **3. 没有理解包边界** | 没有区分 "独立 npm 包" 和 "项目应用代码" 的边界 | `ts/` 目录下的所有代码必须自包含，只能使用相对导入和浏览器原生 API，不能依赖 `@/`、项目路由、项目 store 等 |

### 正确做法：依赖注入模式

```typescript
// MaskLayerLoader.ts - 定义 adapter 接口，不直接 import 项目 API
export interface MaskLoaderAdapter {
    fetchAllMasks(caseId: string | number): Promise<LoadedLayerData | null>;
    fetchLayerRaw(caseId: string | number, layerId: LayerId): Promise<ArrayBuffer | null>;
    initLayers(caseId: string | number, dimensions: number[], ...): Promise<boolean>;
}

export class MaskLayerLoader {
    private adapter: MaskLoaderAdapter | null = null;
    setAdapter(adapter: MaskLoaderAdapter): void { ... }
    async loadAllMasks(caseId): Promise<boolean> { ... }
}

// DebouncedAutoSave.ts - 接受 save 回调，不直接 import 项目 API
export type SaveDeltaCallback = (layerId: LayerId, changes: Delta[]) => Promise<void>;

export class DebouncedAutoSave {
    setSaveCallback(fn: SaveDeltaCallback): void { ... }
    addChange(delta: Delta): void { ... }
}
```

### 项目层提供 adapter 实现

```typescript
// 在项目层 (src/plugins/ 或 src/composables/) 中:
import { useGetAllMasks, useApplyMaskDelta } from '@/plugins/api/masks';
import { MaskLayerLoader, DebouncedAutoSave } from 'copper3d/segmentation/core';

// 注入项目 API 实现
loader.setAdapter({
    fetchAllMasks: (caseId) => useGetAllMasks(caseId),
    fetchLayerRaw: (caseId, layerId) => useGetMaskRaw(caseId, layerId),
    initLayers: (caseId, dims) => useInitMaskLayers({ caseId, dimensions: dims }),
});

autoSave.setSaveCallback(async (layerId, changes) => {
    await useApplyMaskDelta({ caseId, layer: layerId, changes });
});
```

### 教训总结

1. **理解包边界**: `ts/` 是独立 npm 包，所有代码必须自包含，不能依赖项目级模块
2. **依赖注入**: 当 npm 包需要网络/API 能力时，定义接口让项目层注入实现
3. **导入方向**: 项目可以 import npm 包，但 npm 包不能 import 项目代码
4. **不要过度修正**: 发现错误时应修复问题本身，不应擅自删除用户的代码模块
