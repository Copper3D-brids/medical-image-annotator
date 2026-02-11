/**
 * EraserTool - Circular eraser implementation
 *
 * Extracted from DrawToolCore.ts:
 * - useEraser / clearArc
 */

import { BaseTool } from "./BaseTool";

export class EraserTool extends BaseTool {

  /**
   * Create the circular eraser function.
   * Uses recursive clearRect calls to approximate a circular eraser shape.
   * Returns a function that can be called with (x, y, radius) coordinates.
   */
  createClearArc(): (x: number, y: number, radius: number) => void {
    const clearArc = (x: number, y: number, radius: number) => {
      const calcWidth = radius - this.ctx.nrrd_states.stepClear;
      const calcHeight = Math.sqrt(radius * radius - calcWidth * calcWidth);
      const posX = x - calcWidth;
      const posY = y - calcHeight;
      const widthX = 2 * calcWidth;
      const heightY = 2 * calcHeight;

      if (this.ctx.nrrd_states.stepClear <= radius) {
        this.ctx.protectedData.ctxes.drawingLayerMasterCtx.clearRect(
          posX, posY, widthX, heightY
        );
        this.ctx.protectedData.ctxes.drawingLayerOneCtx.clearRect(
          posX, posY, widthX, heightY
        );
        this.ctx.protectedData.ctxes.drawingLayerTwoCtx.clearRect(
          posX, posY, widthX, heightY
        );
        this.ctx.protectedData.ctxes.drawingLayerThreeCtx.clearRect(
          posX, posY, widthX, heightY
        );
        this.ctx.nrrd_states.stepClear += 1;
        clearArc(x, y, radius);
      }
    };
    return clearArc;
  }
}
