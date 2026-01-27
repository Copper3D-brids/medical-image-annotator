import http from "./http";
import {
  INrrdCaseNames,
  IExportMask,
  ICaseUrls,
  ICaseRegUrls,
  IExportMasks,
  IReplaceMask,
  ISaveSphere,
  IRegRquest,
  IRequests,
  ISaveTumourPosition,
  ITumourStudyAssisted,
  IToolConfig,
  IToolConfigResponse,
  IAuth
} from "@/models";
import JSZip from "jszip";
/**
 *
 * @returns Get all cases's names
 */
export async function useNrrdCaseNames(auth: IAuth) {
  const names = http.post<INrrdCaseNames>("/cases", auth);
  return names;
}

export async function useSingleFile(path: string) {
  const file = http.getBlob<Blob>("/single-file", { path })
  return file;
}

export async function useNrrdCaseFiles(requests: Array<IRequests>) {
  return new Promise<ICaseUrls>((resolve, reject) => {
    let urls: ICaseUrls = { nrrdUrls: [], jsonUrl: "" };
    http
      .all(requests)
      .then((files) => {
        (files as any[]).forEach((item) => {
          if (item.filename.includes(".json")) {
            urls.jsonUrl = URL.createObjectURL(item.data);
          } else {
            urls.nrrdUrls.push(URL.createObjectURL(item.data));
          }
        });
        resolve(urls);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

/**
 * init the mask data in backend
 * @param body
 * @returns
 */
export async function useInitMasks(body: IExportMasks) {
  const success = http.post<boolean>("/mask/init", body);
  return success;
}

/**
 * replace the specific mask
 * @param body
 * @returns
 */
export async function useReplaceMask(body: IReplaceMask) {
  const success = http.post<boolean>("/mask/replace", body);
  return success;
}

/**
 * Save mask
 * @returns
 */
export async function useSaveMasks(case_id: string | number) {
  const success = http.get<boolean>("/mask/save", { case_id });
  return success;
}

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

export async function useClearMaskMesh(case_id: string | number) {
  let res = http.get<string>("/clearmesh", { case_id });
  return res;
}


export function useToolConfig(config: IToolConfig) {
  return http.post<IToolConfigResponse>("/tool-config", config);
}