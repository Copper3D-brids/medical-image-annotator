import { ILoadUrls, ICaseUrls } from "@/models";
import * as THREE from "three";
import eraser_1 from "@/assets/eraser/circular-cursor_3.png";
import eraser_2 from "@/assets/eraser/circular-cursor_8.png";
import eraser_3 from "@/assets/eraser/circular-cursor_13.png";
import eraser_4 from "@/assets/eraser/circular-cursor_18.png";
import eraser_5 from "@/assets/eraser/circular-cursor_23.png";
import eraser_6 from "@/assets/eraser/circular-cursor_28.png";
import eraser_7 from "@/assets/eraser/circular-cursor_33.png";
import eraser_8 from "@/assets/eraser/circular-cursor_38.png";
import eraser_9 from "@/assets/eraser/circular-cursor_43.png";
import eraser_10 from "@/assets/eraser/circular-cursor_48.png";
import eraser_11 from "@/assets/eraser/circular-cursor_52.png";
import cursor_dot from "@/assets/cursor/dot.png";
import {
  transformMeshPointToImageSpace,
  createOriginSphere,
  getFormattedTime,
  getNippleClock,
  throttle,
  throttle2
} from "@/plugins/utils";

export {
  transformMeshPointToImageSpace,
  createOriginSphere,
  getFormattedTime,
  throttle,
  throttle2
};

type ITemp = {
  name: string;
  masked: boolean;
  has_mesh: boolean;
};

export function findCurrentCase(caseDetail: ITemp[], currentCaseName: string) {
  const result = caseDetail.filter((item) => {
    return item.name === currentCaseName;
  });
  return result[0];
}

export function revokeAppUrls(revokeUrls: ILoadUrls) {
  for (let key in revokeUrls) {
    const jsonUrl = revokeUrls[key].jsonUrl;
    const urls = revokeUrls[key].nrrdUrls as Array<string>;
    urls.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    URL.revokeObjectURL(jsonUrl);
  }
}

export function revokeCaseUrls(caseUrls: ICaseUrls) {
  if (!!caseUrls) {
    if (!!caseUrls.nrrdUrls) caseUrls.nrrdUrls.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    if (!!caseUrls.jsonUrl) URL.revokeObjectURL(caseUrls.jsonUrl)
  }
}

export function getEraserUrlsForOffLine() {
  const urls = [
    eraser_1,
    eraser_2,
    eraser_3,
    eraser_4,
    eraser_5,
    eraser_6,
    eraser_7,
    eraser_8,
    eraser_9,
    eraser_10,
    eraser_11,
  ];
  return urls;
}

export function getCursorUrlsForOffLine() {
  const urls = [cursor_dot];
  return urls;
}





export function getClosestNipple(
  nippleLeft: THREE.Vector3,
  nippleRight: THREE.Vector3,
  tumourCenter: THREE.Vector3
) {
  let distLeft = tumourCenter.distanceTo(nippleLeft);
  let distRight = tumourCenter.distanceTo(nippleRight);

  if (distLeft < distRight) {
    const { rd, angle, time } = getNippleClock(tumourCenter, nippleLeft);
    const p = rd < 10 ? "central" : "L";
    return {
      dist: "L: " + distLeft.toFixed(0),
      angle,
      time,
      timeStr: getFormattedTime(time),
      radial_distance: rd,
      p,
    };
  } else {
    const { rd, angle, time } = getNippleClock(tumourCenter, nippleRight);
    const p = rd < 10 ? "central" : "R";
    return {
      dist: "R: " + distRight.toFixed(0),
      angle,
      time,
      timeStr: getFormattedTime(time),
      radial_distance: rd,
      p,
    };
  }
}

