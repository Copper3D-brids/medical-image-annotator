import { IToolConfig } from "@/models/apiTypes";

export function useAppConfig() {
    const configStr = localStorage.getItem("app_config");
    const config: IToolConfig | null = configStr ? JSON.parse(configStr) : null;
    return { config };
}
