import http from "./client";
import {
    INrrdCaseNames,
    IAuth,
    IRequests,
    ICaseUrls
} from "@/models";

/**
 *
 * @returns Get all cases's names
 */
export async function useNrrdCaseNames(auth: IAuth) {
    const names = http.post<INrrdCaseNames>("/cases", auth);
    return names;
}

export async function useSingleFile(path: string, cacheBust: boolean = false) {
    const params: Record<string, any> = { path };

    // Add timestamp parameter to bypass browser cache if requested
    if (cacheBust) {
        params._t = Date.now();
    }

    const file = http.getBlob<Blob | number>("/single-file", params);
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
