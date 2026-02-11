# Medical Image Annotator

## Project Overview

A full-stack medical image annotation tool with AI-driven 3D segmentation capabilities. Built with Vue 3 + TypeScript frontend and FastAPI Python backend.

## Architecture

```
medical-image-annotator-failed/
├── annotator-frontend/    # Vue 3 + TypeScript + Vuetify 3 (UMD library build)
├── annotator-backend/     # FastAPI + SQLAlchemy + nnInteractive AI model
├── plan/                  # Implementation plans & task tracking
└── report/                # Phase reports and documentation
```

### Frontend Stack
- **Framework**: Vue 3 (Composition API with `<script setup>`)
- **Language**: TypeScript 5.0 (strict mode)
- **Build**: Vite 6.3 (UMD library output → `my-app.umd.js`)
- **UI**: Vuetify 3.8 (Material Design)
- **State**: Pinia 2.0
- **3D Engine**: Copper3D (custom medical imaging renderer)
- **Package Manager**: Yarn

### Backend Stack
- **Framework**: FastAPI (Python) on Uvicorn
- **Database**: SQLite + SQLAlchemy ORM
- **AI Model**: nnInteractive 1.1.2 (3D promptable segmentation)
- **Storage**: MinIO (S3-compatible)
- **Medical Libraries**: nibabel, SimpleITK, pynrrd, scikit-image

## Common Commands

### Frontend
```bash
cd annotator-frontend
yarn dev          # Dev server with hot reload
yarn build        # Production build (UMD format)
yarn test         # Run tests (Vitest)
yarn test:watch   # Watch mode
yarn test:ui      # Interactive test UI
yarn lint         # ESLint with auto-fix
```

### Backend
```bash
cd annotator-backend
uvicorn main:app --port 8082    # Start server
docker-compose up               # Docker (port 8002 → 8082)
```

## Code Conventions

- **Indent**: 2 spaces (JS/TS/Vue), per `.editorconfig`
- **Naming**: camelCase for variables/functions, PascalCase for components/classes
- **Components**: Vue 3 Composition API (`<script setup lang="ts">`)
- **Path alias**: `@/` maps to `src/`
- **Linting**: ESLint with `vue3-essential` + TypeScript rules
- **Multi-word component names rule**: disabled

## Supported Medical Image Formats

NRRD, NIfTI (.nii/.nii.gz), DICOM, VTK, OBJ, GLTF

## Important Notes

- Frontend builds as a UMD library (not a standalone SPA). Vue, Vuetify, Pinia are external globals.
- Core TypeScript modules under `src/ts/` are excluded from the Vite build and loaded separately.
- The `src/ts/Utils/segmentation/` directory contains the core drawing/annotation logic.
- Backend serves on port 8082 internally, mapped to 8002 via Docker.
