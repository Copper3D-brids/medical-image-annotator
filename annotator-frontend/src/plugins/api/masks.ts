import http from "./client";
import {
    IExportMasks,
    IReplaceMask,
} from "@/models";

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

export async function useClearMaskMesh(case_id: string | number) {
    let res = http.get<string>("/clearmesh", { case_id });
    return res;
}
