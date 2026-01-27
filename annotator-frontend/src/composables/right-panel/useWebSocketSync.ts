/**
 * WebSocket Sync Composable
 *
 * @description Manages WebSocket connection for tumour model synchronization:
 * - Connects to backend WebSocket for case-specific updates
 * - Handles OBJ reload notifications
 * - Handles mesh deletion notifications
 *
 * @module composables/right-panel/useWebSocketSync
 */
import { ref, type Ref } from "vue";
import { useSingleFile } from "@/plugins/api/index";
import { switchAnimationStatus } from "@/components/viewer/utils";
import * as Copper from "copper3d";
import * as THREE from "three";
import { IDetails } from "@/models";

const base_url = import.meta.env.VITE_PLUGIN_API_URL;
const port = import.meta.env.VITE_PLUGIN_API_PORT;
const { hostname } = new URL(base_url);

/**
 * Interface for WebSocket dependencies
 */
export interface IWebSocketDeps {
    loadingContainer: Ref<HTMLDivElement | undefined>;
    progress: Ref<HTMLDivElement | undefined>;
    copperScene: Ref<Copper.copperScene | undefined>;
    currentCaseDetails: Ref<IDetails | undefined>;
    maskTumourObj: Ref<string | undefined>;
    preTumourSphere: Ref<THREE.Mesh | undefined>;
    segementTumour3DModel: Ref<THREE.Group | THREE.Mesh | undefined>;
    openLoading: Ref<boolean>;
    tumourVolume: Ref<number>;
    loadSegmentTumour: (url: string) => void;
    initPanelValue: () => void;
}

/**
 * Composable for WebSocket synchronization
 */
export function useWebSocketSync(deps: IWebSocketDeps) {
    const {
        loadingContainer,
        progress,
        copperScene,
        currentCaseDetails,
        maskTumourObj,
        preTumourSphere,
        segementTumour3DModel,
        openLoading,
        tumourVolume,
        loadSegmentTumour,
        initPanelValue,
    } = deps;

    let socket: WebSocket | null = null;

    /**
     * Initializes WebSocket connection for a case
     */
    function initSocket(caseId: string) {
        if (socket) {
            socket.close();
        }
        socket = new WebSocket(`ws://${hostname}:${port}/ws/${caseId}`);
        socket.onopen = function (e) {
            console.log(`WebSocket connected for case: ${caseId}`);
        };
        socket.onmessage = handleWebSocketMessage;
        socket.onclose = function (e) {
            console.log(`WebSocket closed for case: ${caseId}`);
        };
    }

    /**
     * Handles WebSocket messages
     */
    async function handleWebSocketMessage(event: MessageEvent) {
        try {
            const data = JSON.parse(event.data);

            if (data.status === "complete" && data.action === "reload_obj") {
                console.log("Received OBJ reload notification:", data);

                if (data.volume) {
                    tumourVolume.value = Math.ceil(data.volume) / 1000;
                }

                const objUrl = currentCaseDetails.value?.output.mask_obj_path;
                if (objUrl) {
                    const file = await useSingleFile(objUrl);
                    if (file) {
                        if (maskTumourObj.value) {
                            URL.revokeObjectURL(maskTumourObj.value);
                        }
                        maskTumourObj.value = URL.createObjectURL(file);
                        loadSegmentTumour(maskTumourObj.value);
                    }
                }

                if (preTumourSphere.value && copperScene.value) {
                    copperScene.value.scene.remove(preTumourSphere.value);
                    preTumourSphere.value = undefined;
                }

                switchAnimationStatus(loadingContainer.value!, progress.value!, "none");
                openLoading.value = false;
            } else if (data.status === "delete" || event.data === "delete") {
                tumourVolume.value = 0;
                if (segementTumour3DModel.value && copperScene.value) {
                    copperScene.value.scene.remove(segementTumour3DModel.value);
                }
                segementTumour3DModel.value = undefined;
                initPanelValue();
                openLoading.value = false;
            }
        } catch (e) {
            console.log("Received non-JSON message:", event.data);
            openLoading.value = false;
        }
    }

    /**
     * Closes WebSocket connection
     */
    function closeSocket() {
        if (socket) {
            socket.close();
            socket = null;
        }
    }

    return {
        initSocket,
        closeSocket,
    };
}
