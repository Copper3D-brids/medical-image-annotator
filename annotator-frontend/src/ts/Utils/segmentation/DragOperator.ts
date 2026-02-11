import { throttle } from "../utils";
import {
  IDragOpts,
  IDragPrameters,
  IDrawingEvents,
  IProtected,
  IGUIStates,
  INrrdStates,
  IPaintImage,
  IPaintImages,
} from "./coreTools/coreType";
import { createShowSliceNumberDiv } from "./coreTools/divControlTools";
import type { EventRouter } from "./eventRouter";
import { DragSliceTool } from "./tools/DragSliceTool";
import type { ToolContext } from "./tools/BaseTool";

export class DragOperator {
  container: HTMLElement;

  private dragPrameters: IDragPrameters = {
    move: 0,
    y: 0,
    h: 0,
    sensivity: 1,
    handleOnDragMouseUp: (ev: MouseEvent) => { },
    handleOnDragMouseDown: (ev: MouseEvent) => { },
    handleOnDragMouseMove: (ev: MouseEvent) => { },
  };
  private drawingPrameters: IDrawingEvents;
  private sensitiveArray: number[] = [];
  private showDragNumberDiv: HTMLDivElement;
  private nrrd_states: INrrdStates;
  private gui_states: IGUIStates;
  private protectedData: IProtected;
  private dragSliceTool!: DragSliceTool;

  private setSyncsliceNum: () => void;
  private setIsDrawFalse: (target: number) => void;
  private flipDisplayImageByAxis: () => void;
  private setEmptyCanvasSize: (axis?: "x" | "y" | "z") => void;
  private filterDrawedImage: (
    axis: "x" | "y" | "z",
    sliceIndex: number,
    paintedImages: IPaintImages
  ) => IPaintImage;

  // EventRouter for centralized event handling
  private eventRouter: EventRouter | null = null;

  constructor(
    container: HTMLElement,
    nrrd_sates: INrrdStates,
    gui_states: IGUIStates,
    protectedData: IProtected,
    drawingPrameters: IDrawingEvents,

    setSyncsliceNum: () => void,
    setIsDrawFalse: (target: number) => void,
    flipDisplayImageByAxis: () => void,
    setEmptyCanvasSize: (axis?: "x" | "y" | "z") => void,
    filterDrawedImage: (
      axis: "x" | "y" | "z",
      sliceIndex: number,
      paintedImages: IPaintImages
    ) => IPaintImage
  ) {
    this.container = container;
    this.drawingPrameters = drawingPrameters;
    this.nrrd_states = nrrd_sates;
    this.gui_states = gui_states;
    this.protectedData = protectedData;

    this.setSyncsliceNum = setSyncsliceNum;
    this.setIsDrawFalse = setIsDrawFalse;
    this.flipDisplayImageByAxis = flipDisplayImageByAxis;
    this.setEmptyCanvasSize = setEmptyCanvasSize;
    this.filterDrawedImage = filterDrawedImage;

    this.showDragNumberDiv = createShowSliceNumberDiv();
    this.init();
  }
  private init() {
    for (let i = 0; i < this.gui_states.max_sensitive; i++) {
      this.sensitiveArray.push((i + 1) / 20);
    }

    const dragEffectCanvases = {
      drawingCanvasLayerMaster:
        this.protectedData.canvases.drawingCanvasLayerMaster,
      drawingCanvasLayerOne: this.protectedData.canvases.drawingCanvasLayerOne,
      drawingCanvasLayerTwo: this.protectedData.canvases.drawingCanvasLayerTwo,
      drawingCanvasLayerThree:
        this.protectedData.canvases.drawingCanvasLayerThree,
      displayCanvas: this.protectedData.canvases.displayCanvas,
    };

    const toolCtx = {
      nrrd_states: this.nrrd_states,
      gui_states: this.gui_states,
      protectedData: this.protectedData,
      cursorPage: {} as any,
    } as ToolContext;

    this.dragSliceTool = new DragSliceTool(
      toolCtx,
      {
        setSyncsliceNum: () => this.setSyncsliceNum(),
        setIsDrawFalse: (target) => this.setIsDrawFalse(target),
        flipDisplayImageByAxis: () => this.flipDisplayImageByAxis(),
        setEmptyCanvasSize: (axis?) => this.setEmptyCanvasSize(axis),
        filterDrawedImage: (axis, sliceIndex, paintedImages) =>
          this.filterDrawedImage(axis, sliceIndex, paintedImages),
      },
      this.showDragNumberDiv,
      dragEffectCanvases
    );
  }

  setShowDragNumberDiv(sliceIndexContainer: HTMLDivElement) {
    this.showDragNumberDiv = sliceIndexContainer;
    this.dragSliceTool.setShowDragNumberDiv(sliceIndexContainer);
  }

  /**
   * Set the EventRouter reference for centralized event handling.
   * Called by NrrdTools/DrawToolCore after EventRouter is initialized.
   * Subscribes to mode changes to control drag mode.
   */
  setEventRouter(eventRouter: EventRouter): void {
    this.eventRouter = eventRouter;

    // Subscribe to mode changes to control drag/contrast modes
    this.eventRouter.subscribeModeChange((prevMode, newMode) => {
      const prev = prevMode as string;
      const next = newMode as string;

      // When entering draw or contrast mode, remove drag mode
      if (next === 'draw' || next === 'contrast') {
        this.removeDragMode();
      }

      // When leaving draw or contrast mode (returning to idle), restore drag mode
      if ((prev === 'draw' || prev === 'contrast') && next === 'idle') {
        if (!this.gui_states.sphere) {
          this.configDragMode();
        }
      }
    });
  }

  drag(opts?: IDragOpts) {
    this.dragPrameters.h = this.container.offsetHeight;

    this.sensitiveArray.reverse();

    if (opts?.showNumber) {
      this.container.appendChild(this.showDragNumberDiv);
    }

    this.dragPrameters.handleOnDragMouseDown = (ev: MouseEvent) => {
      // before start drag event, remove wheel event.
      this.protectedData.canvases.drawingCanvas.removeEventListener(
        "wheel",
        this.drawingPrameters.handleMouseZoomSliceWheel
      );
      if (ev.button === 0) {
        this.dragPrameters.y = ev.offsetY / this.dragPrameters.h;
        this.container.addEventListener(
          "pointermove",
          this.dragPrameters.handleOnDragMouseMove,
          false
        );
        this.dragPrameters.sensivity =
          this.sensitiveArray[this.gui_states.dragSensitivity - 1];
      }
    };
    this.dragPrameters.handleOnDragMouseMove = throttle((ev: MouseEvent) => {
      if (this.dragPrameters.y - ev.offsetY / this.dragPrameters.h >= 0) {
        this.dragPrameters.move = -Math.ceil(
          ((this.dragPrameters.y - ev.offsetY / this.dragPrameters.h) * 10) /
          this.dragPrameters.sensivity
        );
      } else {
        this.dragPrameters.move = -Math.floor(
          ((this.dragPrameters.y - ev.offsetY / this.dragPrameters.h) * 10) /
          this.dragPrameters.sensivity
        );
      }

      this.updateIndex(this.dragPrameters.move);
      opts?.getSliceNum &&
        opts.getSliceNum(
          this.nrrd_states.currentIndex,
          this.nrrd_states.contrastNum
        );
      this.dragPrameters.y = ev.offsetY / this.dragPrameters.h;
    }, this.dragPrameters.sensivity * 200);

    this.dragPrameters.handleOnDragMouseUp = (ev: MouseEvent) => {
      // after drag, add the wheel event
      this.protectedData.canvases.drawingCanvas.addEventListener(
        "wheel",
        this.drawingPrameters.handleMouseZoomSliceWheel
      );
      this.setSyncsliceNum();
      this.container.removeEventListener(
        "pointermove",
        this.dragPrameters.handleOnDragMouseMove,
        false
      );
    };

    this.configDragMode();

    // If EventRouter is available, mode changes are handled via onModeChange callback in DrawToolCore.
    // Otherwise, fall back to direct keyboard listeners for backwards compatibility.
    if (!this.eventRouter) {
      // Legacy mode: direct keyboard event listeners
      this.container.addEventListener("keydown", (ev: KeyboardEvent) => {
        if (this.nrrd_states.configKeyBoard) return;

        if (ev.key === this.nrrd_states.keyboardSettings.draw) {
          this.removeDragMode();
        }
      });
      this.container.addEventListener("keyup", (ev: KeyboardEvent) => {
        if (this.nrrd_states.configKeyBoard) return;

        if (this.nrrd_states.keyboardSettings.contrast.includes(ev.key)) {
          if (this.protectedData.Is_Ctrl_Pressed) {
            this.removeDragMode();
          } else {
            this.configDragMode();
          }
        }
        if (ev.key === this.nrrd_states.keyboardSettings.draw && !this.gui_states.sphere) {
          if (this.protectedData.Is_Ctrl_Pressed) {
            return
          }
          this.configDragMode();
        }
      });
    }
  }

  updateIndex(move: number) {
    this.dragSliceTool.updateIndex(move);
  }

  updateShowNumDiv(contrastNum: number) {
    this.dragSliceTool.updateShowNumDiv(contrastNum);
  }

  updateCurrentContrastSlice() {
    return this.dragSliceTool.updateCurrentContrastSlice();
  }

  configDragMode = () => {
    this.container.style.cursor = "pointer";
    this.container.addEventListener(
      "pointerdown",
      this.dragPrameters.handleOnDragMouseDown,
      true
    );
    this.container.addEventListener(
      "pointerup",
      this.dragPrameters.handleOnDragMouseUp,
      true
    );
  };
  removeDragMode = () => {
    this.container.style.cursor = "";
    this.container.removeEventListener(
      "pointerdown",
      this.dragPrameters.handleOnDragMouseDown,
      true
    );
    this.container.removeEventListener(
      "pointerup",
      this.dragPrameters.handleOnDragMouseUp,
      true
    );
    this.setIsDrawFalse(1000);
  };

  updateMainSlice(mainPreSlices: any) {
    this.protectedData.mainPreSlices = mainPreSlices;
  }
}
