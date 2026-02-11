/**
 * DragSliceTool - Drag-based slice navigation
 *
 * Extracted from DragOperator.ts:
 * - updateIndex
 * - drawDragSlice
 * - drawMaskToLayerCtx
 * - cleanCanvases
 * - updateShowNumDiv / updateCurrentContrastSlice
 */

import { BaseTool } from "./BaseTool";
import type { ToolContext } from "./BaseTool";
import type { IPaintImage, IPaintImages } from "../coreTools/coreType";

export interface DragSliceCallbacks {
  setSyncsliceNum: () => void;
  setIsDrawFalse: (target: number) => void;
  flipDisplayImageByAxis: () => void;
  setEmptyCanvasSize: (axis?: "x" | "y" | "z") => void;
  filterDrawedImage: (
    axis: "x" | "y" | "z",
    sliceIndex: number,
    paintedImages: IPaintImages
  ) => IPaintImage;
}

interface IDragEffectCanvases {
  drawingCanvasLayerMaster: HTMLCanvasElement;
  drawingCanvasLayerOne: HTMLCanvasElement;
  drawingCanvasLayerTwo: HTMLCanvasElement;
  drawingCanvasLayerThree: HTMLCanvasElement;
  displayCanvas: HTMLCanvasElement;
  [key: string]: HTMLCanvasElement;
}

export class DragSliceTool extends BaseTool {
  private callbacks: DragSliceCallbacks;
  private showDragNumberDiv: HTMLDivElement;
  private dragEffectCanvases: IDragEffectCanvases;

  constructor(
    ctx: ToolContext,
    callbacks: DragSliceCallbacks,
    showDragNumberDiv: HTMLDivElement,
    dragEffectCanvases: IDragEffectCanvases
  ) {
    super(ctx);
    this.callbacks = callbacks;
    this.showDragNumberDiv = showDragNumberDiv;
    this.dragEffectCanvases = dragEffectCanvases;
  }

  setShowDragNumberDiv(div: HTMLDivElement): void {
    this.showDragNumberDiv = div;
  }

  // ===== Update Index =====

  updateIndex(move: number): void {
    let sliceModifyNum = 0;
    let contrastModifyNum = 0;
    const nrrd = this.ctx.nrrd_states;

    if (nrrd.showContrast) {
      contrastModifyNum = move % this.ctx.protectedData.displaySlices.length;
      nrrd.contrastNum += contrastModifyNum;
      if (move > 0) {
        if (nrrd.currentIndex <= nrrd.maxIndex) {
          sliceModifyNum = Math.floor(
            move / this.ctx.protectedData.displaySlices.length
          );
          if (nrrd.contrastNum > this.ctx.protectedData.displaySlices.length - 1) {
            sliceModifyNum += 1;
            nrrd.contrastNum -= this.ctx.protectedData.displaySlices.length;
          }
        } else {
          sliceModifyNum = 0;
        }
      } else {
        sliceModifyNum = Math.ceil(
          move / this.ctx.protectedData.displaySlices.length
        );
        if (nrrd.contrastNum < 0) {
          nrrd.contrastNum += this.ctx.protectedData.displaySlices.length;
          sliceModifyNum -= 1;
        }
      }
    } else {
      sliceModifyNum = move;
    }

    let newIndex = nrrd.currentIndex + sliceModifyNum;

    if (newIndex != nrrd.currentIndex || nrrd.showContrast) {
      if (newIndex > nrrd.maxIndex) {
        newIndex = nrrd.maxIndex;
        nrrd.contrastNum = this.ctx.protectedData.displaySlices.length - 1;
      } else if (newIndex < nrrd.minIndex) {
        newIndex = nrrd.minIndex;
        nrrd.contrastNum = 0;
      } else {
        this.ctx.protectedData.mainPreSlices.index = newIndex * nrrd.RSARatio;
        this.callbacks.setSyncsliceNum();

        let isSameIndex = true;
        if (newIndex != nrrd.currentIndex) {
          nrrd.switchSliceFlag = true;
          isSameIndex = false;
        }

        this.cleanCanvases(isSameIndex);

        if (nrrd.changedWidth === 0) {
          nrrd.changedWidth = nrrd.originWidth;
          nrrd.changedHeight = nrrd.originHeight;
        }

        const needToUpdateSlice = this.updateCurrentContrastSlice();
        needToUpdateSlice.repaint.call(needToUpdateSlice);
        nrrd.currentIndex = newIndex;
        this.drawDragSlice(needToUpdateSlice.canvas);
      }

      nrrd.oldIndex = newIndex * nrrd.RSARatio;
      this.updateShowNumDiv(nrrd.contrastNum);
    }
  }

  // ===== Draw Drag Slice =====

  private drawDragSlice(canvas: any): void {
    const nrrd = this.ctx.nrrd_states;

    this.ctx.protectedData.ctxes.displayCtx.save();
    this.callbacks.flipDisplayImageByAxis();
    this.ctx.protectedData.ctxes.displayCtx.drawImage(
      canvas,
      0,
      0,
      nrrd.changedWidth,
      nrrd.changedHeight
    );
    this.ctx.protectedData.ctxes.displayCtx.restore();

    if (
      this.ctx.protectedData.maskData.paintImages.x.length > 0 ||
      this.ctx.protectedData.maskData.paintImages.y.length > 0 ||
      this.ctx.protectedData.maskData.paintImages.z.length > 0
    ) {
      if (nrrd.switchSliceFlag) {
        this.drawMaskToLayerCtx(
          this.ctx.protectedData.maskData.paintImages,
          this.ctx.protectedData.ctxes.drawingLayerMasterCtx
        );
        this.drawMaskToLayerCtx(
          this.ctx.protectedData.maskData.paintImagesLayer1,
          this.ctx.protectedData.ctxes.drawingLayerOneCtx
        );
        this.drawMaskToLayerCtx(
          this.ctx.protectedData.maskData.paintImagesLayer2,
          this.ctx.protectedData.ctxes.drawingLayerTwoCtx
        );
        this.drawMaskToLayerCtx(
          this.ctx.protectedData.maskData.paintImagesLayer3,
          this.ctx.protectedData.ctxes.drawingLayerThreeCtx
        );
        nrrd.switchSliceFlag = false;
      }
    }
  }

  private drawMaskToLayerCtx(
    paintedImages: IPaintImages,
    ctx: CanvasRenderingContext2D
  ): void {
    const paintedImage = this.callbacks.filterDrawedImage(
      this.ctx.protectedData.axis,
      this.ctx.nrrd_states.currentIndex,
      paintedImages
    );

    if (paintedImage?.image) {
      this.callbacks.setEmptyCanvasSize();
      this.ctx.protectedData.ctxes.emptyCtx.putImageData(paintedImage.image, 0, 0);
      ctx.drawImage(
        this.ctx.protectedData.canvases.emptyCanvas,
        0,
        0,
        this.ctx.nrrd_states.changedWidth,
        this.ctx.nrrd_states.changedHeight
      );
    }
  }

  // ===== Canvas Cleanup =====

  private cleanCanvases(flag: boolean): void {
    for (const name in this.dragEffectCanvases) {
      if (flag) {
        if (name === "displayCanvas") {
          this.dragEffectCanvases.displayCanvas.width =
            this.dragEffectCanvases.displayCanvas.width;
        }
      } else {
        this.dragEffectCanvases[name].width =
          this.dragEffectCanvases[name].width;
      }
    }
  }

  // ===== UI Updates =====

  updateShowNumDiv(contrastNum: number): void {
    if (this.ctx.protectedData.mainPreSlices) {
      const nrrd = this.ctx.nrrd_states;
      if (nrrd.currentIndex > nrrd.maxIndex) {
        nrrd.currentIndex = nrrd.maxIndex;
      }
      if (nrrd.showContrast) {
        this.showDragNumberDiv.innerHTML = `ContrastNum: ${contrastNum}/${
          this.ctx.protectedData.displaySlices.length - 1
        } SliceNum: ${nrrd.currentIndex}/${nrrd.maxIndex}`;
      } else {
        this.showDragNumberDiv.innerHTML = `SliceNum: ${nrrd.currentIndex}/${nrrd.maxIndex}`;
      }
    }
  }

  updateCurrentContrastSlice(): any {
    this.ctx.protectedData.currentShowingSlice =
      this.ctx.protectedData.displaySlices[this.ctx.nrrd_states.contrastNum];
    return this.ctx.protectedData.currentShowingSlice;
  }
}
