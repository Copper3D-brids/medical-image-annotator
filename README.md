# 2025-team-D-sparc-plugins-medical-image-annotation

## Table of contents
* [Summary of functionality](#summary-of-functionality)
* [How to use the plugin](#how-to-use-the-plugin)
* [Summary of technical implementation](#summary-of-technical-implementation)


## Summary of functionality

As one of the most fundamental tasks in computer-assisted clinical decision support, medical image segmentation forms the basis for numerous downstream applications ranging from diagnosis, therapeutic planning, to post-treatment monitoring and outcome evaluation. To accurately and efficiently segment anatomical structures in medical images, an AI-driven promptable segmentation plugin is introduced in this project. It integrates a state-of-the-art framework for 3D promptable segmentation: nnInteractive [1] and a web-based user interface, supporting positive and negative point prompts across multiple imaging modalities (CT, MR, PET, etc.). This model has been trained on 120+ diverse volumetric 3D datasets (CT, MRI, PET, 3D Microscopy, etc.), enabling full 3D segmentation from intuitive 2D interactions with accuracy, adaptability, and usability.

[1] Isensee, F.*, Rokuss, M.*, Krämer, L.*, Dinkelacker, S., Ravindran, A., Stritzke, F., Hamm, B., Wald, T., Langenberg, M., Ulrich, C., Deissler, J., Floca, R., & Maier-Hein, K. (2025). nnInteractive: Redefining 3D Promptable Segmentation. https://arxiv.org/abs/2503.08373
*: equal contribution

## How to use the plugin

### Prerequisites

- A running instance of the clinical dashboard that hosts the plugin
- A MinIO (S3-compatible) server with medical image data accessible via a public path
- Docker and Docker Compose (for backend deployment)

### Starting the backend

```bash
cd annotator-backend

# Option 1 — Docker (recommended)
docker-compose up

# Option 2 — Local development
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8082
```

The backend will be available at `http://localhost:8082` (Docker maps this to port 8002 externally).

### Running the frontend (development)

```bash
cd annotator-frontend
yarn install
yarn dev        # Standalone dev server with hot reload
```

To build the plugin for embedding in the dashboard:

```bash
yarn build:plugin   # Produces dist/my-app.umd.js
```

### Annotation workflow

1. **Load a case** — The dashboard passes the tool configuration (user UUID, assay UUID, dataset names, cohort names) to the plugin. The backend validates the MinIO paths and resolves the image URLs.

2. **View images** — Multi-contrast medical images (CT/MR/PET) are rendered in synchronized 2D slice panels (axial, coronal, sagittal) and a 3D volume viewer.

3. **Annotate** — Use the toolbar to select an annotation tool:
   - **Paint** — freehand brush on the current 2D slice
   - **Erase** — remove annotation on the current slice
   - **Sphere Brush** — place a 3D spherical annotation across multiple slices simultaneously; scroll the mouse wheel to resize
   - **Gaussian Smooth** — apply 3D Gaussian smoothing to the current layer mask
   - **Contrast** / **Zoom** / **Pan** — image navigation controls

4. **Manage layers** — Switch between annotation layers (up to 4) and channels using the layer/channel selector. Each layer can be toggled on/off and styled independently.

5. **Undo / Redo** — Full undo/redo history, including grouped multi-slice operations from the Sphere Brush and Gaussian Smooth tools.

6. **Export** — Save the annotation masks (NIfTI format, per layer) and generate 3D meshes (OBJ/GLB). Trigger SPARC SDS dataset generation for downstream sharing.

### Supported image formats

NRRD, NIfTI (`.nii` / `.nii.gz`), DICOM, VTK, OBJ, GLB, GLTF


## Summary of technical implementation

### Architecture overview

```
annotator-frontend (Vue 3 + TypeScript)
    │
    ├── Vue components & composables (src/)
    │       UI, state management (Pinia), API calls
    │
    └── Core annotation engine (src/ts/)  ← loaded separately, not Vite-bundled
            Drawing tools, MaskVolume, GaussianSmoother, UndoManager, 3D rendering

annotator-backend (FastAPI + Python)
    │
    ├── REST API — tool config, mask upload, SDS generation
    ├── WebSocket — real-time notifications (OBJ/GLB conversion progress)
    ├── SQLite + SQLAlchemy — User, Assay, Case, Input, Output records
    ├── MinIO — S3-compatible storage for input images and output results
    └── nnInteractive — AI model for 3D promptable segmentation
```

### Frontend

The frontend is built with **Vue 3** (Composition API) and **Vuetify 3**, and can be deployed either as a standalone SPA or as a **UMD library plugin** embedded in a host dashboard. In plugin mode (`BUILD_AS_PLUGIN=true`), Vue, Vuetify, Pinia, and vue-toastification are treated as external globals injected by the host.

The core annotation engine lives under `src/ts/` and is deliberately excluded from the Vite bundle to allow independent versioning and loading. Key modules:

| Module | Description |
|--------|-------------|
| `MaskVolume` | 3D volumetric mask stored as a `Uint8Array` of shape `width × height × depth × numChannels`. Provides voxel-level read/write and per-slice `ImageData` rendering. |
| `GaussianSmoother` | 3D separable Gaussian blur optimised with direct array indexing and branch-free convolution. Supports anisotropic voxel spacing. |
| `UndoManager` | Undo/redo stack with `pushGroup()` for atomic multi-slice operations (e.g. Sphere Brush, Gaussian Smooth). |
| `DrawingTool` / `EraserTool` | Per-slice 2D freehand annotation on HTML Canvas. |
| `SphereBrushTool` | 3D sphere that writes to the active layer's `MaskVolume` across all intersected slices in a single grouped undo entry. |
| `DrawToolCore` | Rendering loop compositing annotation layers onto the slice canvas with per-layer opacity. |
| `CanvasState` | Central state container unifying `NrrdState` (image metadata, voxel spacing) and `GuiState` (active tool, drawing parameters). |

3D volume rendering uses the **copper3D** library (a Three.js-based medical imaging renderer) and supports multi-format loading (NRRD, NIfTI, DICOM, VTK, OBJ, GLB, GLTF).

### Backend

The backend is a **FastAPI** application serving two roles:

1. **Data coordination** — On startup of a case, the frontend calls `POST /api/tool-config`. The backend validates image paths on MinIO, resolves pre-signed URLs, and synchronises User / Assay / Case records in SQLite. The response carries all resolved input URLs needed by the frontend to load images directly from MinIO.

2. **Output processing** — Annotation masks are stored as NIfTI files (one per layer). An async background task converts them to 3D OBJ/GLB meshes using trimesh and pygltflib, and optionally packages everything as a **SPARC SDS dataset** via sparc_me. Progress is broadcast to the frontend over WebSocket.

The AI segmentation model (**nnInteractive 1.1.2**) is integrated into the backend for prompt-driven automatic 3D segmentation, complementing the manual annotation tools.

### Data flow

```
Host dashboard
  └─ passes config (user UUID, assay UUID, datasets, cohorts)
        │
        ▼
Frontend plugin
  ├─ POST /api/tool-config → resolve MinIO URLs → load images via copper3D
  ├─ User annotates → MaskVolume updated → UndoManager tracks history
  ├─ POST /api/... → upload mask layers (NIfTI) to backend
  └─ WebSocket ← notified when OBJ/GLB/SDS outputs are ready
        │
        ▼
Backend
  ├─ SQLite: User, Assay, Case, CaseInput, CaseOutput
  ├─ MinIO: input images (read) + output results (write)
  └─ Async tasks: NIfTI → OBJ/GLB conversion, SPARC SDS packaging
```
