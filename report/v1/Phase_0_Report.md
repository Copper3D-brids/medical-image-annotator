# Phase 0: Data Persistence Strategy - Report

**Completed**: ✅ Full (Backend + Frontend)  
**Date**: 2026-01-30

---

## Summary

Phase 0 implements the data persistence strategy for the segmentation module refactoring. This phase focuses on transitioning from a single JSON-based mask storage to a layer-specific NIfTI file storage system, enabling efficient storage and retrieval of 3D mask volumes.

---

## Tasks Completed

### 0.1 Database Schema Modifications ✅

#### [MODIFY] `models/db_model.py` - CaseOutput Model
- **Removed**: `mask_nii_path`, `mask_nii_size` (single mask path)
- **Added**: 
  - `mask_layer1_nii_path`, `mask_layer1_nii_size`
  - `mask_layer2_nii_path`, `mask_layer2_nii_size`  
  - `mask_layer3_nii_path`, `mask_layer3_nii_size`
- **Retained**: `mask_json_path`, `mask_json_size` for backward compatibility

```python
# New schema structure
class CaseOutput(Base):
    # Legacy JSON mask storage (kept for backward compatibility)
    mask_json_path = Column(String, nullable=True)
    mask_json_size = Column(Integer, nullable=True)
    
    # Layer-specific NIfTI mask storage (Phase 0)
    mask_layer1_nii_path = Column(String, nullable=True)
    mask_layer1_nii_size = Column(Integer, nullable=True)
    mask_layer2_nii_path = Column(String, nullable=True)
    mask_layer2_nii_size = Column(Integer, nullable=True)
    mask_layer3_nii_path = Column(String, nullable=True)
    mask_layer3_nii_size = Column(Integer, nullable=True)
```

#### [MODIFY] `main.py` - get_tool_config Function
- Updated file creation logic to generate layer-specific NIfTI files
- Creates `layer1.nii.gz`, `layer2.nii.gz`, `layer3.nii.gz` in case folder
- Simplified folder structure (removed sam-X subfolders)

#### [MODIFY] `router/tumour_segmentation.py` - get_cases_infos
- Updated API response to include new layer-specific fields
- Frontend can now determine which layers have data by checking `mask_layerX_nii_size`

---

### 0.2 Backend API Refactoring ✅

#### [NEW] Pydantic Models (`models/model.py`)
```python
class MaskDeltaChange(BaseModel):
    x: int      # voxel X coordinate
    y: int      # voxel Y coordinate
    z: int      # voxel Z coordinate (slice index)
    value: int  # channel value (0-8)

class MaskDeltaRequest(BaseModel):
    caseId: Union[int, str]
    layer: str  # 'layer1', 'layer2', or 'layer3'
    changes: List[MaskDeltaChange]

class MaskInitRequest(BaseModel):
    caseId: Union[int, str]
    dimensions: List[int]  # [width, height, depth]
    voxelSpacing: Optional[List[float]] = None
    spaceOrigin: Optional[List[float]] = None
```

#### [NEW] API Endpoints (`router/tumour_segmentation.py`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/mask/all/{case_id}` | GET | Load all 3 layers in single request (msgpack) |
| `/api/mask/raw/{case_id}/{layer_id}` | GET | Get raw NIfTI bytes for specific layer |
| `/api/mask/delta` | POST | Apply incremental voxel changes to layer |
| `/api/mask/init-layers` | POST | Initialize empty NIfTI volumes for new case |
| `/ws/mask/{case_id}` | WebSocket | Real-time mask updates (for AI inference) |

---

### 0.3 Frontend Adaptations ✅

#### Dependencies Installed
```bash
yarn add nifti-reader-js @msgpack/msgpack
```

#### [NEW] TypeScript Interfaces (`models/segmentation.ts`)
```typescript
interface IMaskDeltaChange { x, y, z, value }
interface IMaskDeltaRequest { caseId, layer, changes }
interface IMaskInitLayersRequest { caseId, dimensions, voxelSpacing?, spaceOrigin? }
interface IAllMasksResponse { shape, layer1, layer2, layer3 }
interface ILayerOutput { mask_layer*_nii_path, mask_layer*_nii_size, ... }
```

#### [NEW] API Functions (`plugins/api/masks.ts`)
| Function | Description |
|----------|-------------|
| `useGetAllMasks(caseId)` | Load all 3 layers via msgpack |
| `useGetMaskRaw(caseId, layerId)` | Get raw NIfTI ArrayBuffer |
| `useApplyMaskDelta(delta)` | Send incremental changes |
| `useInitMaskLayers(request)` | Initialize empty NIfTI volumes |
| `createMaskWebSocket(caseId, onMessage)` | WebSocket for real-time updates |

#### [NEW] Core Classes (`ts/Utils/segmentation/core/`)

**MaskLayerLoader.ts**
- `loadAllMasks()` - Load all layers in single request
- `loadLayerRaw()` - Load specific layer NIfTI
- `parseNIfTI()` - Parse NIfTI ArrayBuffer to Uint8Array  
- `loadFromRaw()` - Load from raw Uint8Array (AI inference)
- `initializeEmptyMasks()` - Initialize empty volumes for new case
- `getSlice()` / `getLayerData()` - Retrieve cached data
- `connectWebSocket()` - Real-time mask updates

**DebouncedAutoSave.ts**
- Collects delta changes per layer
- Debounced saving (500ms default)
- Max batch size trigger (1000 changes)
- `beforeUnload()` - Uses sendBeacon for reliability

#### [NEW] Type Declarations
- `ts/types/nifti-reader-js.d.ts` - TypeScript types for nifti-reader-js

---

## Files Modified

| File | Change Type | Description |
|------|-------------|-------------|
| `annotator-backend/models/db_model.py` | MODIFY | Added layer-specific NIfTI columns |
| `annotator-backend/models/model.py` | MODIFY | Added MaskDelta*/MaskInit* models |
| `annotator-backend/main.py` | MODIFY | Updated CaseOutput creation |
| `annotator-backend/router/tumour_segmentation.py` | MODIFY | Added 5 new mask API endpoints |
| `annotator-backend/requirements.txt` | MODIFY | Added msgpack |
| `annotator-frontend/package.json` | MODIFY | Added nifti-reader-js, @msgpack/msgpack |
| `annotator-frontend/src/models/segmentation.ts` | MODIFY | Added Phase 0 interfaces |
| `annotator-frontend/src/plugins/api/masks.ts` | MODIFY | Added 5 new API functions |
| `plan/task.md` | MODIFY | Marked completed items |

---

## Files Created

| File | Description |
|------|-------------|
| `report/Phase_0_Report.md` | This report |
| `annotator-frontend/src/ts/Utils/segmentation/core/MaskLayerLoader.ts` | Core mask loading utility |
| `annotator-frontend/src/ts/Utils/segmentation/core/DebouncedAutoSave.ts` | Auto-save with debouncing |
| `annotator-frontend/src/ts/Utils/segmentation/core/index.ts` | Core module exports |
| `annotator-frontend/src/ts/types/nifti-reader-js.d.ts` | Type declarations |

---

## Build Verification ✅

```bash
$ yarn build
✓ built in 18.12s
# dist/my-app.umd.js  2,215.02 kB │ gzip: 682.83 kB
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
├─────────────────────────────────────────────────────────────────┤
│  MaskLayerLoader (singleton)                                     │
│  ├── loadAllMasks() ──────── GET /api/mask/all/{id} (msgpack)   │
│  ├── loadLayerRaw() ──────── GET /api/mask/raw/{id}/{layer}     │
│  ├── parseNIfTI() ────────── nifti-reader-js                     │
│  └── initializeEmptyMasks() ── POST /api/mask/init-layers       │
│                                                                  │
│  DebouncedAutoSave                                               │
│  └── addChange() ─────────── POST /api/mask/delta (debounced)   │
│                                                                  │
│  createMaskWebSocket() ────── WS /ws/mask/{id} (real-time AI)   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend                                  │
├─────────────────────────────────────────────────────────────────┤
│  CaseOutput (DB)                                                 │
│  ├── mask_layer1_nii_path/size                                   │
│  ├── mask_layer2_nii_path/size                                   │
│  └── mask_layer3_nii_path/size                                   │
│                                                                  │
│  File System                                                     │
│  └── outputs/{user}/{assay}/medical-image-annotator-outputs/    │
│      └── {case}/                                                │
│          ├── layer1.nii.gz                                       │
│          ├── layer2.nii.gz                                       │
│          └── layer3.nii.gz                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Testing Required

The following tests should be performed before proceeding to Phase 1:

- [ ] **🧪 验证后端 API 响应**: Test all 5 new endpoints with Postman/curl
- [ ] **🧪 验证新 case 初始化流程**: Create new case, verify layer files created
- [ ] **🧪 验证 NIfTI 和 Raw 两种加载方式**: Test both loading paths

---

## File Structure

Output files match `Config.OUTPUTS` exactly:
```
outputs/user-xxx/assay-xxx/medical-image-annotator-outputs/
└── case-name/
    ├── mask-meta-json.json       # [0] Mask metadata (legacy)
    ├── mask-layer1-nii.nii.gz    # [1] Layer 1 NIfTI
    ├── mask-layer2-nii.nii.gz    # [2] Layer 2 NIfTI
    ├── mask-layer3-nii.nii.gz    # [3] Layer 3 NIfTI
    └── mask-obj.obj              # [4] 3D mesh
```

---

## Next Steps

After user confirms testing passes:
→ Proceed to **Phase 1: Core Data Layer** (or as defined in plan)

