import http from "./client";
import {
    ISaveSphere,
    ISaveTumourPosition,
} from "@/models";

/**
 * sava sphere origin and raduis in mm
 * @param body
 * @returns
 */
export async function useSaveSphere(body: ISaveSphere) {
    const success = http.post<boolean>("/sphere/save", body);
    return success;
}

/**
 * sava tumour origin
 * @param body
 * @returns
 */
export async function useSaveTumourPosition(body: ISaveTumourPosition) {
    const success = http.post<boolean>("/save_tumour_position", body);
    return success;
}

export async function useBreastPointsJson(name: string, filename: string) {
    return new Promise((resolve, reject) => {
        http
            .get("/breast_points", { name, filename })
            .then((data) => {
                resolve(data);
            })
            .catch((error) => {
                reject(error);
            });
    });
}

export async function useMaskObjMesh(name: string) {
    return new Promise((resolve, reject) => {
        http
            .getBlob("/mask_tumour_mesh", { name })
            .then((res) => {

                if (res === 404) {
                    resolve(false);
                } else {
                    const maskTumourObjUrl = URL.createObjectURL(
                        new Blob([(res as any).data as BlobPart])
                    );

                    resolve(
                        Object.assign({
                            maskTumourObjUrl,
                            meshVolume: (res as any).x_header_obj.volume,
                        })
                    );
                }
            })
            .catch((error) => {
                reject(error);
            });
    });
}

export async function useBreastObjMesh(name: string) {
    return new Promise<string>((resolve, reject) => {
        http
            .getBlob("/breast_model", { name })
            .then((res) => {
                const breastMeshObjUrl = URL.createObjectURL(
                    new Blob([res as BlobPart])
                );
                resolve(breastMeshObjUrl);
            })
            .catch((error) => {
                reject(error);
            });
    });
}
