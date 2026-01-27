import { useSegmentationCasesStore } from "@/store/app";
import { IToolConfig } from "@/models";

export function useCases() {
    const { getAllCasesDetails } = useSegmentationCasesStore();

    const getCasesInfo = async (config: IToolConfig) => {
        if (config && config.user_info && config.assay_info) {
            return getAllCasesDetails({
                user_uuid: config.user_info.uuid,
                assay_uuid: config.assay_info.uuid
            });
        }
        return Promise.reject("Invalid configuration");
    };

    return { getCasesInfo };
}
