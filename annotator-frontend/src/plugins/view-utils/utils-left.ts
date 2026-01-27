import { IRequests, IDetails } from "@/models";
import { ITumourStudyAppDetail } from "@/models";
import { customRound, distance3D } from "@/plugins/utils";
export { customRound, distance3D };

export const findRequestUrls = (
  details: Array<IDetails>,
  caseId: string,
  type: "registration" | "origin"
) => {
  const currentCaseDetails = details.filter((item) => item.name === caseId)[0];
  const requests: Array<IRequests> = [];
  if (type === "registration") {
    currentCaseDetails.file_paths?.registration_nrrd_paths.forEach(
      (filepath) => {
        requests.push({
          url: "/single-file",
          params: { path: filepath },
        });
      }
    );
  } else if (type === "origin") {
    currentCaseDetails.file_paths?.origin_nrrd_paths.forEach((filepath) => {
      requests.push({
        url: "/single-file",
        params: { path: filepath },
      });
    });
  }

  if (currentCaseDetails.masked) {
    currentCaseDetails.file_paths?.segmentation_manual_mask_paths.forEach(
      (filepath) => {
        requests.push({
          url: "/single-file",
          params: { path: filepath },
        });
      }
    );
  }
  return requests;
};




export const getReportIncompleteCases = (
  details: Array<ITumourStudyAppDetail>
): ITumourStudyAppDetail[] => {
  return details.filter((item) => item.report.complete === false);
};

export const getTumourCenterInCompleteCases = (
  details: Array<ITumourStudyAppDetail>
): ITumourStudyAppDetail[] => {
  return details.filter((item) => item.tumour_window.validate === false);
};

export const getTumourAssitedInCompleteCases = (
  details: Array<ITumourStudyAppDetail>
): ITumourStudyAppDetail[] => {
  return details.filter((item) => item.report.assisted === false && item.report.complete === true);
};