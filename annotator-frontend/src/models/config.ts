export interface IToolConfig {
    user_info: {
        uuid: string;
    };
    assay_info: {
        uuid: string;
        name: string;
        cohorts: string[];
        datasets: string[];
    };
    system: {
        minio: {
            public_path: string;
        };
    };
}

export interface IToolConfigResponse {
    status: number;
    assay_uuid: string;
}

export interface IAuth {
    user_uuid: string;
    assay_uuid: string;
}

export interface IKeyboardSettings {
    draw: string;
    undo: string;
    contrast: string[];
    crosshair: string;
    mouseWheel: "Scroll:Zoom" | "Scroll:Slice" | string;
    [key: string]: any;
}

export interface IParams {
    params: unknown;
    responseType?: string;
}

export interface IRequests {
    url: string;
    params: any;
}
