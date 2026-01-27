import { defineStore } from "pinia";
import { ref } from "vue";
import {
  useNrrdCaseNames,
} from "@/plugins/api/index";
import {
  INrrdCaseNames,
  IAuth
} from "@/models";
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
