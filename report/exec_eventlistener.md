# EventRouter Implementation Walkthrough

## Overview

This document summarizes the EventRouter implementation for the NRRDTools segmentation module. The EventRouter centralizes event handling that was previously scattered across `DrawToolCore.ts` and `DragOperator.ts`.

## Completed Work

### Phase 1: EventRouter Skeleton ✅

Created `segmentation/eventRouter/` directory with:

| File | Purpose |
|------|---------|
| [types.ts](file:///c:/Users/lgao142/Desktop/clinial%20dashboard%20plugin%20work%202025/medical-image-annotator-failed/annotator-frontend/src/ts/Utils/segmentation/eventRouter/types.ts) | Type definitions for `InteractionMode`, handlers, config |
| [EventRouter.ts](file:///c:/Users/lgao142/Desktop/clinial%20dashboard%20plugin%20work%202025/medical-image-annotator-failed/annotator-frontend/src/ts/Utils/segmentation/eventRouter/EventRouter.ts) | Core EventRouter class (~440 lines) |
| [index.ts](file:///c:/Users/lgao142/Desktop/clinial%20dashboard%20plugin%20work%202025/medical-image-annotator-failed/annotator-frontend/src/ts/Utils/segmentation/eventRouter/index.ts) | Barrel export |

render_diffs(file:///c:/Users/lgao142/Desktop/clinial%20dashboard%20plugin%20work%202025/medical-image-annotator-failed/annotator-frontend/src/ts/Utils/segmentation/eventRouter/EventRouter.ts)

---

### Phase 2: DrawToolCore Integration ✅

Modified [DrawToolCore.ts](file:///c:/Users/lgao142/Desktop/clinial%20dashboard%20plugin%20work%202025/medical-image-annotator-failed/annotator-frontend/src/ts/Utils/segmentation/DrawToolCore.ts) to:

1. Import and instantiate `EventRouter` in `initDrawToolCore()`
2. Configure `onModeChange` callback to sync with existing state flags
3. Register keyboard handlers via `setKeydownHandler()` and `setKeyupHandler()`

render_diffs(file:///c:/Users/lgao142/Desktop/clinial%20dashboard%20plugin%20work%202025/medical-image-annotator-failed/annotator-frontend/src/ts/Utils/segmentation/DrawToolCore.ts)

---

### Phase 3: DragOperator Events ✅

Modified [DragOperator.ts](file:///c:/Users/lgao142/Desktop/clinial%20dashboard%20plugin%20work%202025/medical-image-annotator-failed/annotator-frontend/src/ts/Utils/segmentation/DragOperator.ts) to:

1. Add `setEventRouter()` method for EventRouter injection
2. Subscribe to mode changes to control `configDragMode()`/`removeDragMode()`
3. Skip legacy keyboard listeners when EventRouter is available

render_diffs(file:///c:/Users/lgao142/Desktop/clinial%20dashboard%20plugin%20work%202025/medical-image-annotator-failed/annotator-frontend/src/ts/Utils/segmentation/DragOperator.ts)

Modified [NrrdTools.ts](file:///c:/Users/lgao142/Desktop/clinial%20dashboard%20plugin%20work%202025/medical-image-annotator-failed/annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts) to inject EventRouter into DragOperator.

render_diffs(file:///c:/Users/lgao142/Desktop/clinial%20dashboard%20plugin%20work%202025/medical-image-annotator-failed/annotator-frontend/src/ts/Utils/segmentation/NrrdTools.ts)

---

## How Mode Changes Work

```mermaid
sequenceDiagram
    participant User
    participant EventRouter
    participant DrawToolCore
    participant DragOperator

    User->>EventRouter: Press Shift (keydown)
    EventRouter->>EventRouter: setMode('draw')
    EventRouter->>DrawToolCore: onModeChange(idle → draw)
    DrawToolCore->>DrawToolCore: Is_Shift_Pressed = true
    EventRouter->>DragOperator: subscriber(idle → draw)
    DragOperator->>DragOperator: removeDragMode()

    User->>EventRouter: Release Shift (keyup)
    EventRouter->>EventRouter: setMode('idle')
    EventRouter->>DrawToolCore: onModeChange(draw → idle)
    DrawToolCore->>DrawToolCore: Is_Shift_Pressed = false
    EventRouter->>DragOperator: subscriber(draw → idle)
    DragOperator->>DragOperator: configDragMode()
```

---

## Phase 4: Pointer Events (Partial) ✅

Routed main `pointerdown` through EventRouter in `paintOnCanvas()`:

render_diffs(file:///c:/Users/lgao142/Desktop/clinial%20dashboard%20plugin%20work%202025/medical-image-annotator-failed/annotator-frontend/src/ts/Utils/segmentation/DrawToolCore.ts)

> [!WARNING]
> Wheel events kept as direct `addEventListener` due to dynamic switching in `handleOnDrawingMouseUp` (5 occurrences switch between zoom wheel and sphere wheel).

---

## Build Status

✅ Compilation passes - no new errors from EventRouter integration

Pre-existing errors (unrelated to this work):
- `@types/three` module resolution
- `view-utils/utils-right.ts` property errors
