import * as Copper from "copper3d";
import * as THREE from "three";

export interface IExportMask {
    caseName?: string;
    sliceIndex?: number;
    dataFormat?: string;
    width?: number;
    height?: number;
    voxelSpacing?: number[];
    spaceOrigin?: number[];
    data?: number[];
    [proName: string]: any;
}

export interface IStoredMasks {
    label1: IExportMask[];
    label2: IExportMask[];
    label3: IExportMask[];
    hasData: false;
}

export interface IExportMasks {
    caseId: string | number;
    masks: IStoredMasks;
}

export interface IReplaceMask {
    caseId: string | number;
    sliceId: number;
    label: string;
    mask: number[];
}

export interface ITumourPositionNNMask {
    caseId: string | number;
    position: Array<number>;
}

export interface IMaskTumourObjData {
    maskTumourObjUrl?: string;
    meshVolume?: number;
}

export interface ILoadedMeshes {
    x: THREE.Mesh;
    y: THREE.Mesh;
    z: THREE.Mesh;
    order: number;
}

export interface ILeftRightData {
    maskNrrdMeshes: Copper.nrrdMeshesType;
    maskSlices: Copper.nrrdSliceType;
    url: string;
    register: boolean;
}
