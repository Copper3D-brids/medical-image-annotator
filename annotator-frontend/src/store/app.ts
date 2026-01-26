import { defineStore } from "pinia";
import { ref } from "vue";
import {
  useNrrdCaseNames,
  useMaskObjMesh,
  useBreastObjMesh,
  useBreastPointsJson,
  useNrrdCaseFiles,
  useSaveSphere,
} from "@/plugins/api";
import {
  INrrdCaseNames,
  IExportMask,
  ICaseUrls,
  ICaseRegUrls,
  IExportMasks,
  IReplaceMask,
  ISaveSphere,
  IMaskTumourObjData,
  IRegRquest,
  INipplePoints,
  IRibSkinPoints,
  ITumourWindow,
  IRequests,
  IAuth
} from "@/models/apiTypes";
export const useSegmentationCasesStore = defineStore("allSegmentationCasesDetails", () => {
  const allCasesDetails = ref<INrrdCaseNames>();
  const getAllCasesDetails = async (auth: IAuth) => {
    allCasesDetails.value = await useNrrdCaseNames(auth);
  };
  return {
    allCasesDetails,
    getAllCasesDetails,
  };
});
export const useNrrdCaseFileUrlsWithOrderStore = defineStore(
  "getCaseFileUrlOrdered",
  () => {
    const caseUrls = ref<ICaseUrls>();
    const getNrrdAndJsonFileUrls = async (requests: Array<IRequests>) => {
      caseUrls.value = await useNrrdCaseFiles(requests);
    };
    return {
      caseUrls,
      getNrrdAndJsonFileUrls,
    };
  }
);


export const useSaveSphereStore = defineStore("saveSphere", () => {
  const success = ref<boolean>(false);
  const sendSaveSphere = async (body: ISaveSphere) => {
    success.value = await useSaveSphere(body);
  };
  return {
    success,
    sendSaveSphere,
  };
});


export const useNipplePointsStore = defineStore("getNipplePoints", () => {
  const nipplePoints = ref<INipplePoints | Boolean>();
  const getNipplePoints = async (name: string) => {
    nipplePoints.value = (await useBreastPointsJson(name, "nipple_points")) as
      | INipplePoints
      | boolean;
  };
  return {
    nipplePoints,
    getNipplePoints,
  };
});

export const useSkinPointsStore = defineStore("getSkinPoints", () => {
  const skinPoints = ref<IRibSkinPoints | Boolean>();
  const getSkinPoints = async (name: string) => {
    skinPoints.value = (await useBreastPointsJson(name, "skin_mesh_surface_points")) as
      | IRibSkinPoints
      | boolean;
  };
  return {
    skinPoints,
    getSkinPoints,
  };
});

export const useRibPointsStore = defineStore("getRibPoints", () => {
  const ribPoints = ref<IRibSkinPoints | Boolean>();
  const getRibPoints = async (name: string) => {
    ribPoints.value = (await useBreastPointsJson(name, "outer_rib_mesh_surface_points")) as
      | IRibSkinPoints
      | boolean;
  };
  return {
    ribPoints,
    getRibPoints,
  };
});

export const useTumourWindowStore = defineStore("getTumourWindow", () => {
  const tumourWindow = ref<ITumourWindow | Boolean>();
  const getTumourWindowChrunk = async (name: string) => {
    tumourWindow.value = (await useBreastPointsJson(name, "tumour_window")) as
      | ITumourWindow
      | boolean;
  };
  return {
    tumourWindow,
    getTumourWindowChrunk,
  };
});


export const useMaskTumourObjDataStore = defineStore("getMaskTumourObjUrl", () => {
  const maskTumourObjData = ref<IMaskTumourObjData>({});
  const getMaskTumourObjData = async (name: string) => {
    maskTumourObjData.value = (await useMaskObjMesh(name)) as IMaskTumourObjData;
  };
  return {
    maskTumourObjData,
    getMaskTumourObjData,
  };
});

export const useBreastMeshObjUrlStore = defineStore("getBreastMeshUrl", () => {
  const breastMeshObjUrl = ref<string>();
  const getBreastMeshObjUrl = async (name: string) => {
    breastMeshObjUrl.value = (await useBreastObjMesh(name)) as string;
  };
  return {
    breastMeshObjUrl,
    getBreastMeshObjUrl,
  };
});
