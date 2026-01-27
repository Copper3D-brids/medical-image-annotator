import { ICommXYZ } from "./common";

export interface ISaveSphere {
    caseId: string | number;
    sliceId: number;
    origin: number[];
    spacing: number[];
    sphereRadiusMM: number;
    sphereOriginMM: number[];
}

export interface ISaveTumourPosition {
    case_name: string;
    position: ICommXYZ;
    validate?: boolean;
}

export interface ITumourWindow {
    bounding_box_max_point: {
        x: number;
        y: number;
        z: number
    },
    bounding_box_min_point: {
        x: number;
        y: number;
        z: number
    },
    center: {
        x: number;
        y: number;
        z: number
    }
}

export interface IStudyDetails {
    position: ICommXYZ | null;
    distance: string;
    start: string | number;
    end: string | number;
    duration: string;
}

export interface ITumourStudyClockFace {
    face: "12:00" | "1:00" | "2:00" | "3:00" | "4:00" | "5:00" | "6:00" | "7:00" | "8:00" | "9:00" | "10:00" | "11:00" | "central";
    start: string | number;
    end: string | number;
    duration: string;
}

export interface ITumourStudyReport {
    nipple: IStudyDetails;
    skin: IStudyDetails;
    ribcage: IStudyDetails;
    clock_face: ITumourStudyClockFace;
    start: string | number;
    end: string | number;
    total_duration: string;
    spacing: ICommXYZ | null;
    origin: ICommXYZ | null;
    complete: boolean;
    assisted: boolean;
}

export interface ITumourCenterCaseDetails {
    currentCaseName: string;
    nrrdUrl: string;
    tumourWindow?: ITumourWindow;
    report?: ITumourStudyReport;
}

export interface IRegRquest {
    name: string;
    radius?: number;
    origin?: number[];
}

export interface INipplePoints {
    nodes: {
        right_nipple: number[];
        left_nipple: number[];
    };
    elements: {};
}

export interface IRibSkinPoints {
    Datapoints: number[][];
}

export interface ITumourStudyAssisted {
    tumour_position: ISaveTumourPosition;
    tumour_study_report: ITumourStudyReport;
}

export interface ITumourStudyWindow {
    bounding_box_max_point: ICommXYZ;
    bounding_box_min_point: ICommXYZ;
    center: ICommXYZ;
    validate: boolean;
}

export interface ITumourStudyAppDetail {
    name: string;
    file_path: string;
    tumour_window: ITumourStudyWindow;
    report: ITumourStudyReport;
}

export interface ITumourStudyAppDetails {
    details: ITumourStudyAppDetail[];
}
