/**
 * Mask Operations Composable
 *
 * @description Handles all mask-related operations for the left panel:
 * - Initializing mask data to backend
 * - Loading mask JSON from URL
 * - Setting mask data from backend
 * - Replacing/clearing mask data
 *
 * Phase 7: Added SegmentationManager data sync support
 *
 * @module composables/left-panel/useMaskOperations
 */
import { ref, type Ref } from "vue";
import * as Copper from "@/ts/index";
import {
    IStoredMasks,
    IReplaceMask,
    IToolMaskData,
    IDetails,
    INrrdCaseNames,
    ICaseUrls,
} from "@/models";
import { useSingleFile, useReplaceMask, useClearMaskMesh, useInitMasks, useSaveMasks } from "@/plugins/api/index";
import { convertInitMaskData } from "@/plugins/worker";
import { switchAnimationStatus } from "@/components/viewer/utils";
import emitter from "@/plugins/custom-emitter";

/**
 * Interface for mask operations dependencies
 */
export interface IMaskOperationsDeps {
    nrrdTools: Ref<Copper.NrrdTools | undefined>;
    loadingContainer: Ref<HTMLDivElement | undefined>;
    progress: Ref<HTMLDivElement | undefined>;
    loadBarMain: Ref<Copper.loadingBarType | undefined>;
    currentCaseDetail: Ref<IDetails | undefined>;
    currentCaseName: Ref<string>;
    allCasesDetails: Ref<INrrdCaseNames | undefined>;
    originUrls: ICaseUrls;
    regiterUrls: ICaseUrls;
}

/**
 * Composable for mask operations
 */
export function useMaskOperations(deps: IMaskOperationsDeps) {
    const {
        nrrdTools,
        loadingContainer,
        progress,
        loadBarMain,
        currentCaseDetail,
        currentCaseName,
        allCasesDetails,
        originUrls,
        regiterUrls,
    } = deps;


    /**
     * Sends initial mask data to backend
     */
    const sendInitMaskToBackend = async () => {
        const rawMaskData = nrrdTools.value!.getMaskData();
        const masksData = {
            label1: {},
            label2: {},
            label3: {},
        };
        const dimensions = nrrdTools.value!.getCurrentImageDimension();
        const len = 0
        const width = dimensions[0];
        const height = dimensions[1];
        const voxelSpacing = nrrdTools.value!.getVoxelSpacing();
        const spaceOrigin = nrrdTools.value!.getSpaceOrigin();

        if (len > 0) {
            const result = convertInitMaskData({
                masksData,
                len,
                width,
                height,
                voxelSpacing,
                spaceOrigin,
                msg: "init",
            });
            const body = {
                caseId: currentCaseDetail.value!.id,
                masks: result.masks as IStoredMasks,
            };
            await useInitMasks(body);
        }
    };

    /**
     * Loads mask JSON from URL
     */
    const loadJsonMasks = (url: string) => {
        switchAnimationStatus(loadingContainer.value!, progress.value!, "flex", "Loading masks data......");

        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.responseType = "json";
        xhr.onload = function () {
            if (xhr.status === 200) {
                const data = xhr.response;
                if (data === null) {
                    sendInitMaskToBackend();
                }
                nrrdTools.value!.setMasksData(data, loadBarMain.value);
            }
        };
        xhr.send();
    };

    /**
     * Sets mask data from backend
     */
    const setMaskData = async () => {
        const caseDetail = allCasesDetails.value?.details.find(
            (detail) => detail.name === currentCaseName.value
        );

        if (!!caseDetail) {
            if (Number(caseDetail.output.mask_json_size) > 0) {
                if (!!regiterUrls.jsonUrl) {
                    URL.revokeObjectURL(regiterUrls.jsonUrl);
                }
                if (!!originUrls.jsonUrl) {
                    URL.revokeObjectURL(originUrls.jsonUrl);
                }
                const file = await useSingleFile(caseDetail.output.mask_json_path);

                if (!!file) {
                    const url = URL.createObjectURL(file);
                    regiterUrls.jsonUrl = url;
                    originUrls.jsonUrl = url;
                    loadJsonMasks(url);
                }
            } else {
                sendInitMaskToBackend();
            }
        }
        setTimeout(() => {
            switchAnimationStatus(loadingContainer.value!, progress.value!, "none");
        }, 1000);
    };

    /**
     * Handles mask data from tool events
     */
    const getMaskData = async (res: IToolMaskData) => {
        const { image, sliceId, label, clearAllFlag } = res;
        const copyImage = image.data.slice();

        const mask = [...copyImage];
        const body: IReplaceMask = {
            caseId: currentCaseDetail.value!.id,
            sliceId,
            label,
            mask,
        };

        if (clearAllFlag) {
            await useClearMaskMesh(currentCaseDetail.value!.id);
            sendInitMaskToBackend();
        } else {
            await useReplaceMask(body);
        }
    };

    /**
     * Saves masks and triggers model sync
     */
    const onSaveMask = async (flag: boolean) => {
        if (flag && nrrdTools.value!.protectedData.maskData.paintImages.z.length > 0) {
            switchAnimationStatus(loadingContainer.value!, progress.value!, "flex", "Saving masks data, please wait......");
            await useSaveMasks(currentCaseDetail.value!.id);
            switchAnimationStatus(loadingContainer.value!, progress.value!, "none");
            emitter.emit("Segmentation:SyncTumourModelButtonClicked", true);
        }
    };

    return {
        sendInitMaskToBackend,
        loadJsonMasks,
        setMaskData,
        getMaskData,
        onSaveMask,
    };
}
