import { isArray, isObject } from "./index";
// import logan from "util/logan";

export const GET_ERROR = "获取失败";
export const WHOLEDATADETAIL = "周数据详细记录";
export const P4PDATAANALYSE = "流量分析";
export const SHOWCASETABLE = "橱窗信保";
export const FEEDBACKANALYSE = "询盘质量分析";
export const SAMEINDUSTRYANALYSE = "同行分析";
export const HIGHINQUIRYPRODUCTS = "高询盘产品";
export const POPULARPRODUCT = "选品分析";
export const BUSINESSANALYSE = "业务分析";
export const PRODUCTANALYSE = "转化分析";
export const SAMEINDUSTRYSERVICE = "同行重点产品分析";
export const AMAZONPRODUCT = "亚马逊产品";
export function getModuleData(obj, attr, title, nickname) {
  let successObj = {};
  let errorObj = {};
  if (isObject(obj) && Object.hasOwn(obj, attr)) {
    attr = obj[attr];
    if (isArray(attr) && attr.length > 0) {
      Object.assign(successObj, {
        status: true,
        message: `${title}获取成功`,
      });
      console.log(`${title}获取成功`, nickname);
      return successObj;
    }
    if (isObject(attr) && attr) {
      Object.assign(successObj, {
        status: true,
        message: `${title}获取成功`,
      });
      console.log(`${title}获取成功`, nickname);
      return successObj;
    }
    Object.assign(errorObj, {
      status: false,
      message: `${title}为空`,
    });
    console.log(`${title}为空`, nickname);
    return errorObj;
  } else {
    Object.assign(errorObj, {
      status: false,
      message: `${title}为空`,
    });
    console.log(`${title}为空`, nickname);
    return errorObj;
  }
}
export function addResultToArray(succ, err, results) {
  if (!isArray(results)) {
    if (results.status) {
      succ.push(results);
    } else {
      err.push(results);
    }
  } else {
    for (let result of results) {
      if (result.status) {
        succ.push(result);
      } else {
        err.push(result);
      }
    }
  }
}
export function addErrorToArray(err, moduleName) {
  err.push({ status: false, message: moduleName + GET_ERROR });
}
export function addModuleNameToArray(moduleArr, name) {
  moduleArr.push(name);
}
