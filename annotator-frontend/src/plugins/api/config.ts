import http from "./client";
import {
    IToolConfig,
    IToolConfigResponse
} from "@/models";

export function useToolConfig(config: IToolConfig) {
    return http.post<IToolConfigResponse>("/tool-config", config);
}
