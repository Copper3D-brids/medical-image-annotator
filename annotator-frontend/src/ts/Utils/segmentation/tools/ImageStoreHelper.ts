/**
 * ImageStoreHelper - Cross-axis image storage and pixel replacement
 *
 * Extracted from DrawToolCore.ts:
 * - storeAllImages / storeImageToAxis / storeImageToLayer / storeEachLayerImage
 * - sliceArrayH / sliceArrayV
 * - replaceVerticalColPixels / replaceHorizontalRowPixels
 * - checkSharedPlaceSlice / replaceArray / findSliceInSharedPlace
 */

import { BaseTool } from "./BaseTool";
import type { ToolContext } from "./BaseTool";
import type { IPaintImage, IPaintImages } from "../coreTools/coreType";

export interface ImageStoreCallbacks {
  setEmptyCanvasSize: (axis?: "x" | "y" | "z") => void;
  drawImageOnEmptyImage: (canvas: HTMLCanvasElement) => void;
}

export class ImageStoreHelper extends BaseTool {
  private callbacks: ImageStoreCallbacks;

  constructor(ctx: ToolContext, callbacks: ImageStoreCallbacks) {
    super(ctx);
    this.callbacks = callbacks;
  }

  // ===== Store Image To Axis =====

  storeImageToAxis(
    index: number,
    paintedImages: IPaintImages,
    imageData: ImageData,
    axis?: "x" | "y" | "z"
  ): void {
    const temp: IPaintImage = { index, image: imageData };

    let drawedImage: IPaintImage;
    switch (axis ?? this.ctx.protectedData.axis) {
      case "x":
        drawedImage = this.filterDrawedImage("x", index, paintedImages);
        drawedImage
          ? (drawedImage.image = imageData)
          : paintedImages.x?.push(temp);
        break;
      case "y":
        drawedImage = this.filterDrawedImage("y", index, paintedImages);
        drawedImage
          ? (drawedImage.image = imageData)
          : paintedImages.y?.push(temp);
        break;
      case "z":
        drawedImage = this.filterDrawedImage("z", index, paintedImages);
        drawedImage
          ? (drawedImage.image = imageData)
          : paintedImages.z?.push(temp);
        break;
    }
  }

  filterDrawedImage(
    axis: "x" | "y" | "z",
    sliceIndex: number,
    paintedImages: IPaintImages
  ): IPaintImage {
    return paintedImages[axis].filter((item: IPaintImage) => {
      return item.index === sliceIndex;
    })[0];
  }

  // ===== Store All Images (cross-axis sync) =====

  storeAllImages(index: number, layer: string): void {
    const nrrd = this.ctx.nrrd_states;

    if (!nrrd.loadMaskJson && !this.ctx.gui_states.sphere && !this.ctx.gui_states.calculator) {
      this.callbacks.setEmptyCanvasSize();
      this.callbacks.drawImageOnEmptyImage(
        this.ctx.protectedData.canvases.drawingCanvasLayerMaster
      );
    }

    const imageData = this.ctx.protectedData.ctxes.emptyCtx.getImageData(
      0,
      0,
      this.ctx.protectedData.canvases.emptyCanvas.width,
      this.ctx.protectedData.canvases.emptyCanvas.height
    );

    switch (this.ctx.protectedData.axis) {
      case "x":
        this.syncAxisX(index, imageData);
        break;
      case "y":
        this.syncAxisY(index, imageData);
        break;
      case "z":
        this.syncAxisZ(index, imageData);
        break;
    }

    this.storeImageToAxis(
      index,
      this.ctx.protectedData.maskData.paintImages,
      imageData
    );
    if (!nrrd.loadMaskJson && !this.ctx.gui_states.sphere && !this.ctx.gui_states.calculator) {
      this.storeEachLayerImage(index, layer);
    }
  }

  private syncAxisX(index: number, imageData: ImageData): void {
    const nrrd = this.ctx.nrrd_states;
    const maskData = this.checkSharedPlaceSlice(nrrd.nrrd_x_pixel, nrrd.nrrd_y_pixel, imageData);

    const marked_a = this.sliceArrayV(maskData, nrrd.nrrd_y_pixel, nrrd.nrrd_z_pixel);
    const marked_b = this.sliceArrayH(maskData, nrrd.nrrd_y_pixel, nrrd.nrrd_z_pixel);

    this.replaceVerticalColPixels(
      this.ctx.protectedData.maskData.paintImages.z,
      nrrd.dimensions[2], 1, marked_a, nrrd.nrrd_x_pixel, index
    );
    this.replaceVerticalColPixels(
      this.ctx.protectedData.maskData.paintImages.y,
      nrrd.dimensions[1], 1, marked_b, nrrd.nrrd_x_pixel, index
    );
  }

  private syncAxisY(index: number, imageData: ImageData): void {
    const nrrd = this.ctx.nrrd_states;
    const maskData = this.checkSharedPlaceSlice(nrrd.nrrd_x_pixel, nrrd.nrrd_y_pixel, imageData);

    const marked_a = this.sliceArrayV(maskData, nrrd.nrrd_z_pixel, nrrd.nrrd_x_pixel);
    const marked_b = this.sliceArrayH(maskData, nrrd.nrrd_z_pixel, nrrd.nrrd_x_pixel);

    this.replaceHorizontalRowPixels(
      this.ctx.protectedData.maskData.paintImages.x,
      nrrd.dimensions[0], 1, marked_a, nrrd.nrrd_z_pixel, index
    );
    this.replaceHorizontalRowPixels(
      this.ctx.protectedData.maskData.paintImages.z,
      nrrd.dimensions[2], 1, marked_b, nrrd.nrrd_x_pixel, index
    );
  }

  private syncAxisZ(index: number, imageData: ImageData): void {
    const nrrd = this.ctx.nrrd_states;
    const maskData = this.checkSharedPlaceSlice(nrrd.nrrd_x_pixel, nrrd.nrrd_y_pixel, imageData);

    const marked_a = this.sliceArrayV(maskData, nrrd.nrrd_y_pixel, nrrd.nrrd_x_pixel);
    const marked_b = this.sliceArrayH(maskData, nrrd.nrrd_y_pixel, nrrd.nrrd_x_pixel);

    this.replaceVerticalColPixels(
      this.ctx.protectedData.maskData.paintImages.x,
      nrrd.dimensions[0], 1, marked_a, nrrd.nrrd_z_pixel, index
    );
    this.replaceHorizontalRowPixels(
      this.ctx.protectedData.maskData.paintImages.y,
      nrrd.dimensions[1], 1, marked_b, nrrd.nrrd_x_pixel, index
    );
  }

  // ===== Store Per-Layer Images =====

  storeImageToLayer(
    index: number,
    canvas: HTMLCanvasElement,
    paintedImages: IPaintImages
  ): ImageData {
    if (!this.ctx.nrrd_states.loadMaskJson) {
      this.callbacks.setEmptyCanvasSize();
      this.callbacks.drawImageOnEmptyImage(canvas);
    }
    const imageData = this.ctx.protectedData.ctxes.emptyCtx.getImageData(
      0,
      0,
      this.ctx.protectedData.canvases.emptyCanvas.width,
      this.ctx.protectedData.canvases.emptyCanvas.height
    );
    this.storeImageToAxis(index, paintedImages, imageData);
    return imageData;
  }

  storeEachLayerImage(index: number, layer: string): void {
    if (!this.ctx.nrrd_states.loadMaskJson) {
      this.callbacks.setEmptyCanvasSize();
    }
    let imageData: ImageData | undefined;
    switch (layer) {
      case "layer1":
        imageData = this.storeImageToLayer(
          index,
          this.ctx.protectedData.canvases.drawingCanvasLayerOne,
          this.ctx.protectedData.maskData.paintImagesLayer1
        );
        break;
      case "layer2":
        imageData = this.storeImageToLayer(
          index,
          this.ctx.protectedData.canvases.drawingCanvasLayerTwo,
          this.ctx.protectedData.maskData.paintImagesLayer2
        );
        break;
      case "layer3":
        imageData = this.storeImageToLayer(
          index,
          this.ctx.protectedData.canvases.drawingCanvasLayerThree,
          this.ctx.protectedData.maskData.paintImagesLayer3
        );
        break;
    }
    if (!this.ctx.nrrd_states.loadMaskJson && this.ctx.protectedData.axis == "z") {
      this.ctx.nrrd_states.getMask(
        imageData as ImageData,
        this.ctx.nrrd_states.currentIndex,
        layer,
        this.ctx.nrrd_states.nrrd_x_pixel,
        this.ctx.nrrd_states.nrrd_y_pixel,
        this.ctx.nrrd_states.clearAllFlag
      );
    }
  }

  // ===== Array Slicing =====

  sliceArrayH(
    arr: Uint8ClampedArray,
    row: number,
    col: number
  ): Uint8ClampedArray[] {
    const arr2D: Uint8ClampedArray[] = [];
    for (let i = 0; i < row; i++) {
      const start = i * col * 4;
      const end = (i + 1) * col * 4;
      arr2D.push(arr.slice(start, end));
    }
    return arr2D;
  }

  sliceArrayV(
    arr: Uint8ClampedArray,
    row: number,
    col: number
  ): number[][] {
    const arr2D: number[][] = [];
    const base = col * 4;
    for (let i = 0; i < col; i++) {
      const temp: number[] = [];
      for (let j = 0; j < row; j++) {
        const index = base * j + i * 4;
        temp.push(arr[index]);
        temp.push(arr[index + 1]);
        temp.push(arr[index + 2]);
        temp.push(arr[index + 3]);
      }
      arr2D.push(temp);
    }
    return arr2D;
  }

  // ===== Cross-Axis Pixel Replacement =====

  replaceVerticalColPixels(
    paintImageArray: IPaintImage[],
    length: number,
    ratio: number,
    markedArr: number[][] | Uint8ClampedArray[],
    targetWidth: number,
    convertIndex: number
  ): void {
    for (let i = 0, len = length; i < len; i++) {
      const index = Math.floor(i * ratio);
      const convertImageArray = paintImageArray[i].image.data;
      const mark_data = markedArr[index];
      const base_a = targetWidth * 4;

      for (let j = 0, len2 = mark_data.length; j < len2; j += 4) {
        const start = (j / 4) * base_a + convertIndex * 4;
        convertImageArray[start] = mark_data[j];
        convertImageArray[start + 1] = mark_data[j + 1];
        convertImageArray[start + 2] = mark_data[j + 2];
        convertImageArray[start + 3] = mark_data[j + 3];
      }
    }
  }

  replaceHorizontalRowPixels(
    paintImageArray: IPaintImage[],
    length: number,
    ratio: number,
    markedArr: number[][] | Uint8ClampedArray[],
    targetWidth: number,
    convertIndex: number
  ): void {
    for (let i = 0, len = length; i < len; i++) {
      const index = Math.floor(i * ratio);
      const convertImageArray = paintImageArray[i].image.data;
      const mark_data = markedArr[index] as number[];
      const start = targetWidth * convertIndex * 4;
      for (let j = 0, len2 = mark_data.length; j < len2; j++) {
        convertImageArray[start + j] = mark_data[j];
      }
    }
  }

  // ===== Shared Place Utils =====

  checkSharedPlaceSlice(
    width: number,
    height: number,
    imageData: ImageData
  ): Uint8ClampedArray {
    let maskData = this.ctx.protectedData.ctxes.emptyCtx.createImageData(
      width,
      height
    ).data;

    if (
      this.ctx.nrrd_states.sharedPlace.z.includes(this.ctx.nrrd_states.currentIndex)
    ) {
      const sharedPlaceArr = this.findSliceInSharedPlace();
      sharedPlaceArr.push(imageData);
      if (sharedPlaceArr.length > 0) {
        for (let i = 0; i < sharedPlaceArr.length; i++) {
          this.replaceArray(maskData, sharedPlaceArr[i].data);
        }
      }
    } else {
      maskData = imageData.data;
    }
    return maskData;
  }

  replaceArray(
    mainArr: number[] | Uint8ClampedArray,
    replaceArr: number[] | Uint8ClampedArray
  ): void {
    for (let i = 0, len = replaceArr.length; i < len; i++) {
      if (replaceArr[i] === 0 || mainArr[i] !== 0) {
        continue;
      } else {
        mainArr[i] = replaceArr[i];
      }
    }
  }

  findSliceInSharedPlace(): ImageData[] {
    const sharedPlaceImages: ImageData[] = [];
    const base = Math.floor(
      this.ctx.nrrd_states.currentIndex *
        this.ctx.nrrd_states.ratios[this.ctx.protectedData.axis]
    );

    for (let i = 1; i <= 3; i++) {
      const index = this.ctx.nrrd_states.currentIndex - i;
      if (index < this.ctx.nrrd_states.minIndex) {
        break;
      } else {
        const newIndex = Math.floor(
          index * this.ctx.nrrd_states.ratios[this.ctx.protectedData.axis]
        );
        if (newIndex === base) {
          sharedPlaceImages.push(
            this.ctx.protectedData.maskData.paintImages[this.ctx.protectedData.axis][index].image
          );
        }
      }
    }

    for (let i = 1; i <= 3; i++) {
      const index = this.ctx.nrrd_states.currentIndex + i;
      if (index > this.ctx.nrrd_states.maxIndex) {
        break;
      } else {
        const newIndex = Math.floor(
          index * this.ctx.nrrd_states.ratios[this.ctx.protectedData.axis]
        );
        if (newIndex === base) {
          sharedPlaceImages.push(
            this.ctx.protectedData.maskData.paintImages[this.ctx.protectedData.axis][index].image
          );
        }
      }
    }
    return sharedPlaceImages;
  }
}
