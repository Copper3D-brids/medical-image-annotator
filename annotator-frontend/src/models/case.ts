interface IInput {
    contrast_pre: string;
    contrast_1: string;
    contrast_2: string;
    contrast_3: string;
    contrast_4: string;
    registration_pre: string;
    registration_1: string;
    registration_2: string;
    registration_3: string;
    registration_4: string;
}

interface IOutput {
    mask_json_path: string;
    mask_json_size: string | number;
    mask_obj_path: string;
    mask_obj_size: string | number;
}

export interface IDetails {
    id: string | number;
    name: string;
    assay_uuid: string;
    input: IInput;
    output: IOutput;
}

export interface INrrdCaseNames {
    names: string[];
    details: Array<IDetails>;
    [proName: string]: any;
}

export interface ICaseUrls {
    nrrdUrls: Array<string>;
    jsonUrl?: string;
}

export interface ICaseRegUrls {
    nrrdUrls: Array<string>;
}

export interface ICaseDetails {
    currentCaseName: string;
    currentCaseId: string;
    details: Array<IDetails>;
    maskNrrd: string;
}

export interface ILoadUrls {
  [proName: string]: any;
}
