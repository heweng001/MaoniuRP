import feedbackService from "@/js/ali_service/feedback_quality_service";
import { default as mydataService } from "@/js/ali_service/mydata_service";
import { getProductData } from "@/js/ali_service/p4p_service";
import axios from "axios";
import { Axios } from "common";
import moment from "moment";
import qs from "qs";
import { ALI } from "@/js/service/keyword/api";
import { ALI_REPORT } from "@/js/service/report/api";
import shopDataService from "@/js/service/shop-data";
import { numberToPercent } from "util";
import {
  delay,
  getNested,
  isArray,
  isObject,
  isString,
  partition,
  unique,
} from "util/index";
import { URL_ASYNC_QUERY_PRODUCT_LIST } from "../const/ali-const";

const MESSAGE = "查询太频繁，请明日再试！";
let csrfToken;
let csrf;
let showcaseCsrf;
// let rankCsrfToken;
// let contentCsrf;
// let finalStar;
let buyerReviewScore;
let nextLevelReviewScore;
let monthInquiryTotalCount;
// let monthInquireMostProductCount;
// let replyRate;
// let exceptionProduct;
let advertisingList;
let _csrf;
let noInquiryProductIds;
let marketingPlanList = [];
let dynamicCsrf;
// let starType = "";
export let promotionList;
export let productConversionData;
export let trueViewList;
export const arrTemplate = [
  { key: 1, title: "关键词推广" },
  { key: 2, title: "定向推广" },
  { key: 4, title: "快速引流" },
  { key: 6, title: "测品测款" },
  { key: 8, title: "爆品助推" },
  { key: 11, title: "新买家引流" },
  { key: 15, title: "搜索人群再营销" },
  { key: 16, title: "行业高价值人群" },
  { key: 21, title: "趋势明星" },
  { key: 22, title: "优选人群引流" },
  { key: 23, title: "新品成长" },
  { key: 24, title: "优品抢位" },
];

const headers = (form) => {
  return { "content-type": `multipart/form-data; boundary=${form._boundary}` };
};
const nonFormHeaders = { "content-type": "application/x-www-form-urlencoded" };

function toPercent(point) {
  return Number(point * 100).toFixed(2);
}
function arrMapToString(arr, name) {
  return arr
    .map((i) => i[name])
    .filter((i) => i)
    .join(",");
}
function arrMapToStringRate(arr, name) {
  return arr
    .map((i) => (i[name] * 100).toFixed(2) + "%")
    .filter((i) => i)
    .join(",");
}
String.prototype.indexOfEnd = function (string) {
  let io = this.indexOf(string);
  return io === -1 ? -1 : io + string.length;
};
// function getNonP4pCsrfToken() {
//   let url = ALI_REPORT.getAliNonP4pCsrfToken;
//   return Axios({
//     method: "get",
//     url
//   }).then(res => {
//     let start = "name=\"_csrf_token_\" value=\"";
//     let end = "\"";
//     let remain = res.substring(res.indexOfEnd(start));
//     let csrf = remain.substring(0, remain.indexOf(end));
//     rankCsrfToken = csrf;
//   }).catch(() => {
//   })
// }
function getContentCsrf() {
  let url = ALI_REPORT.getContentCsrf;
  return Axios({
    method: "get",
    url,
  })
    .then(() => {
      // let start = "_csrf = \"";
      // let end = "\"";
      // let remain = res.substring(res.indexOfEnd(start));
      // let csrf = remain.substring(0, remain.indexOf(end));
      // contentCsrf = csrf;
    })
    .catch(() => {});
}
function getCsrfToken() {
  let url = "https://message.alibaba.com/message/default.htm";
  return Axios({
    method: "get",
    url,
  })
    .then((res) => {
      const csrfT = res.substring(res.indexOfEnd("csrfTokenVal: '"));
      let resultJson = csrfT.substring(0, csrfT.indexOf("',"));
      csrfToken = resultJson;
    })
    .catch(() => {});
}
function getCsrf() {
  let url = ALI_REPORT.getAliCsrf;
  return Axios({
    method: "get",
    url,
  })
    .then((res) => {
      if (res.token) {
        csrf = res.token;
      }
    })
    .catch(() => {});
}
function getShowcaseCsrf() {
  let url = ALI_REPORT.getShowcaseCsrf;
  return Axios({
    method: "get",
    url,
  })
    .then((res) => {
      if (res.token) {
        showcaseCsrf = res.token;
      }
    })
    .catch(() => {});
}
// function getMarketCsrf() {
//   let url = "https://www2.alibaba.com/api/csrf";
//   return Axios({
//     method: "get",
//     url,
//   })
//     .then((res) => {
//       if (res.token) {
//         _csrf = res.token;
//       }
//     })
//     .catch(() => {});
// }
function noEffectProductParam(ctoken) {
  return {
    action: "CommonAction",
    iName: "getIneffectiveProducts",
    isVip: true,
    ctoken,
  };
}
function rfqParam(ctoken) {
  return {
    ctoken,
  };
}
function rfqForm() {
  const form = {
    type: "consume",
    from: "expireConsumeAward",
    pageSize: 50,
  };
  return qs.stringify(form);
}
function noEffectProductForm() {
  let form = {
    time: 150,
    selected: -1,
    orderBy: "time",
    orderModel: "desc",
    pageSize: 10,
    pageNO: 1,
  };
  return qs.stringify(form);
}
// function groupParam(ctoken) {
//   return {
//     action: 'CommonAction',
//     iName: 'getProductGroups',
//     isVip: true,
//     ctoken
//   }
// }
// function visitorMarketingParam(ctoken, startDate, endDate) {
//   return {
//     action: 'CommonAction',
//     iName: 'getOnePagePerformance',
//     ctoken,
//   }
// }
function monthShelfAndEffectProductParam(ctoken) {
  return {
    action: "CommonAction",
    iName: "getVipEffectiveProductsAndStats",
    isVip: true,
    ctoken,
  };
}
// function exceptionProductDay30TrendsAndOperatorParam(ctoken) {
//   return {
//     action: 'CommonAction',
//     iName: 'getProductTrendsAndOperatorions',
//     isVip: true,
//     ctoken
//   }
// }
// function weekShelfAndEffectProductForm(selectd, name) {
//   const form = {
//     statisticType: 'os',
//     region: 'os',
//     statisticsType: 'week',
//     selected: `${selectd}`,
//     isMyselfUpgraded: true,
//     orderBy: 'views',
//     orderModel: 'desc',
//     pageSize: 30,
//     pageNO: 1
//   };
//   if (name) {
//     form.name = `%${name}%`
//   }
//   return qs.stringify(form)
// }
// function monthShelfAndEffectProductForm(shelf = true) {
//   const form = {
//     statisticType: 'os',
//     region: 'os',
//     statisticsType: 'month',
//     selected: 1,
//     isMyselfUpgraded: true,
//     orderBy: 'views',
//     orderModel: 'desc',
//     pageSize: 30,
//     pageNO: 1,
//   }
//   if (!shelf) {
//     form.hasEffect = 'hasEffect'
//   }
//   return qs.stringify(form)
// }
// function enquiryReductionProductForm(selected, name) {
//   const form = {
//     statisticType: 'all',
//     region: 'all',
//     statisticsType: 'month',
//     selected: `${selected}`,
//     isMyselfUpgraded: true,
//     orderBy: 'inquiries',
//     orderModel: 'desc',
//     pageSize: 30,
//     pageNO: 1
//   };
//   if (name) {
//     form.name = `%${name}%`
//   }
//   return qs.stringify(form)
// }
// function dayExceptionProductForm(selected, name) {
//   const form = {
//     statisticType: 'os',
//     region: 'os',
//     statisticsType: 'day',
//     selected: `${selected}`,
//     isMyselfUpgraded: true,
//     orderBy: 'views',
//     orderModel: 'desc',
//     pageSize: 30,
//     pageNO: 1
//   };
//   if (name) {
//     form.name = `%${name}%`
//   }
//   return qs.stringify(form)
// }
// function ExceptionProductDay30TrendsAndOperatorForm(productId) {
//   const form = {
//     statisticType: 'os',
//     region: 'os',
//     terminalType: 'total',
//     isMyselfUpgraded: true,
//     selected: 0,
//     statisticsType: 'day',
//     productId: `${productId}`
//   };
//   return qs.stringify(form)
// }

// function p4p7DaysKeywordReportForm(dateEnd) {
//   const form = {
//     type: 'normal',
//     data: `{"pageSize":100,"pageIndex":1,"campaignType":1,"orderField":"impr","orderType":"desc","dateRange":7,"dateEnd":"${dateEnd}"}`,
//     _csrf: csrf
//   }
//   return qs.stringify(form)
// }
// function p4pDaysKeywordReportForm(dateBegin, dateEnd, dateRange) {
//   const form = {
//     type: 'normal',
//     data: `{"pageSize":10,"pageIndex":1,"orderField":"click","orderType":"desc","dateRange":${dateRange},"dateBegin":"${dateBegin}","dateEnd":"${dateEnd}"}`,
//     _csrf: csrf
//   }
//   return qs.stringify(form)
// }
// function p4p7DaysAccountReportForm(dateBegin, dateEnd) {
//   const form = {
//     type: 'normal',
//     data: `{"campaignType":1,"dateBegin":"${dateBegin}","dateEnd":"${dateEnd}"}`,
//     _csrf: csrf
//   }
//   return qs.stringify(form)
// }
// function p4pReportForm(dateBegin, dateEnd) {
//   const form = {
//     type: 'normal',
//     _csrf_token: csrfToken,
//     json: `{"dateBegin":${dateBegin},"dateEnd":${dateEnd},"operatorType":"","operationChannel":"","typeList":"","pageSize":20,"pageIndex":1,"orderField":"","orderType":"desc"}`
//   }
//   return qs.stringify(form)
// }
// function promotionReportForm(dateBegin, dateEnd) {
//   const form = {
//     type: 'normal',
//     data: `{"dateBegin":"${dateBegin}","dateEnd":"${dateEnd}","campaignType":1}`,
//     _csrf: csrf
//   }
//   return qs.stringify(form)
// }

// function p4pAdKeywordForm(qsStar = "all", date = 30, kw) {
//   let json = `{"status":"in_promotion","cost":"all","click":"all","exposure":"all","cpc":"all","qsStar":"${qsStar}","kw":"","isExact":"N","date":${date},"tagId":-1,"delayShow":false,"recStrategy":1,"recType":"recommend"}`
//   if (kw) {
//     json = `{"status":"in_promotion","cost":"all","click":"all","exposure":"all","cpc":"all","qsStar":"${qsStar}","kw":"${kw}","isExact":"Y","date":${date},"tagId":-1,"delayShow":false,"recStrategy":1,"recType":"recommend"}`
//   }
//   const form = {
//     _csrf_token_: csrfToken,
//     json: json
//   }
//   return qs.stringify(form)
// }
function windowIdForm() {
  const form = {
    type: "normal",
    data: {},
    _csrf: showcaseCsrf,
  };
  return qs.stringify(form);
}
function windowInvalidCountForm() {
  const form = {
    type: "normal",
    data: `{"adgroupOnlineStatus":1}`,
    _csrf: showcaseCsrf,
  };
  return qs.stringify(form);
}
function windowRemainCountForm(id) {
  const form = {
    type: "normal",
    data: `{"campaignId":${id}}`,
    _csrf: showcaseCsrf,
  };
  return qs.stringify(form);
}
function windowListNewForm() {
  const form = {
    type: "normal",
    data: `{"orderBy":"ad_group_sort","order":"DESC","adgroupOnlineStatus":1,"page":1,"size":100}`,
    _csrf: showcaseCsrf,
  };
  return qs.stringify(form);
}
// function windowListForm() {
//   const form = {
//     type: 'normal',
//     json: `{"currentPage":1,"pageSize":50,"accountId":""}`,
//     _csrf_token_: csrfToken
//   }
//   return qs.stringify(form)
// }
function windowLogNewForm(dateBegin, dateEnd) {
  const form = {
    type: "normal",
    data: `{"productLineId":3,"pageIndex":1,"pageSize":20,"dateBegin":"${dateBegin}","dateEnd":"${dateEnd}","logMajor":"product"}`,
    _csrf: showcaseCsrf,
  };
  return qs.stringify(form);
}
// function windowLogForm(dateBegin, dateEnd) {
//   const form = {
//     type: 'normal',
//     json: `{"dateBegin":"${dateBegin}","dateEnd":"${dateEnd}","operatorType":"","logType":"","isLoading":true,"currentPage":1,"typeOrder":"date","order":"DESC"}`,
//     _csrf_token_: csrfToken
//   }
//   return qs.stringify(form)
// }

function effectiveProductsStatsForm(statisticsType, selected, window = false) {
  // selected = 1 表示上个月,依次类推
  const form = {
    statisticType: "os",
    region: "os",
    statisticsType: `${statisticsType}`,
    selected: `${selected}`,
    isMyselfUpgraded: true,
    orderBy: "inquiries",
    orderModel: "desc",
    pageSize: 30,
    pageNO: 1,
  };
  if (window) {
    form.PS = "PS";
    form.terminalType = "total";
  }
  return qs.stringify(form);
}

// function groupLevelOneMonthStatsForm(groupLevelOne) {
//   // selected = 1 表示上个月,依次类推
//   const form = {
//     groupLevel1: `${groupLevelOne}`,
//     statisticType: 'os',
//     region: 'os',
//     statisticsType: 'month',
//     selected: 1,
//     isMyselfUpgraded: true,
//     orderBy: 'views',
//     orderModel: 'desc',
//     pageSize: 30,
//     pageNO: 1
//   }
//   return qs.stringify(form)
// }
function shopIntegrityPromise() {
  let url = ALI_REPORT.getAliShopInfo;
  return Axios({
    method: "get",
    url,
  })
    .then((res) => {
      const parser = new DOMParser();
      const document = parser.parseFromString(res, "text/html");
      const elementById = document.getElementById("current-progress");
      if (elementById && elementById.getAttribute("value")) {
        return elementById.getAttribute("value");
      }
      return 0;
      // let start = "currentProgress\: ";
      // let end = "\,";
      // let remain = res.substring(res.indexOfEnd(start));
      // let currentProgress = remain.substring(0, remain.indexOf(end)).trim();
      // return currentProgress ? parseInt(currentProgress) : 0
    })
    .catch((err) => {
      console.log(`检测店铺信息完整度出错shopIntegrityPromise：${err}`);
      return 0;
    });
}
// function productOperationPromise(params) {
//   let url = ALI_REPORT.getAliProductOperation;
//   return Axios({
//     method: "get",
//     url,
//     params,
//   }).then(res => {
//     if (res && Object.hasOwn(res, "code") && res.code === 0) {
//       let { data: { total: total } } = res
//       return { newProductCount: total.newProductCount, alterProductCount: total.alterProductCount }
//     }
//     return { newProductCount: 0, alterProductCount: 0 }
//   }).catch((err) => {
//     console.log(`检测产品操作出错productOperationPromise：${err}`)
//     return { newProductCount: 0, alterProductCount: 0 }
//   })
// }

function noEffectProductPromise(ctoken) {
  let url = ALI_REPORT.postAliNoEffectProduct;
  let params = noEffectProductParam(ctoken);
  let form = noEffectProductForm();
  return Axios({
    method: "post",
    url,
    params,
    data: form,
    headers: nonFormHeaders,
  })
    .then((res) => {
      if (res && Object.hasOwn(res, "successed") && res.successed) {
        let {
          value: { total: total },
        } = res;
        return total;
      }
      return 0;
    })
    .catch((err) => {
      console.log(`检测零效果产品出错noEffectProductPromise：${err}`);
      return 0;
    });
}

function shelfProductPromise(ctoken) {
  let url = ALI_REPORT.getAliShelfProduct;
  let params = {
    statisticsType: "month",
    repositoryType: "all",
    imageType: "all",
    displayStatus: "on",
    uiAdvanceSearch: true,
    showType: "onlyMarket",
    status: "all",
    page: 1,
    size: 10,
    ctoken,
  };
  return Axios({
    method: "get",
    url,
    params,
  })
    .then((res) => {
      if (res && Object.hasOwn(res, "result") && res.result) {
        let { count } = res;
        return count;
      }
      return 0;
    })
    .catch((err) => {
      console.log(`检测零效果产品出错shelfProductPromise：${err}`);
      return 0;
    });
}

function videoProductPromise(ctoken) {
  let url = ALI_REPORT.getAliVideoProduct;
  let params = {
    statisticsType: "month",
    repositoryType: "all",
    imageType: "all",
    displayStatus: "on",
    isVideo: "Y",
    uiAdvanceSearch: true,
    showType: "onlyMarket",
    status: "approved",
    page: 1,
    size: 10,
    ctoken,
  };
  return Axios({
    method: "get",
    url,
    params,
  })
    .then((res) => {
      if (res && Object.hasOwn(res, "result") && res.result) {
        let { count } = res;
        return count;
      }
      return 0;
    })
    .catch((err) => {
      console.log(`检测视频产品出错videoProductPromise：${err}`);
      return 0;
    });
}

// function explosiveProductPromise(ctoken) {
//   let url = ALI_REPORT.getAliExcellentProduct;
//   let params = {
//     ctoken,
//     imageType: "all",
//     status: "approved",
//     displayStatus: "on",
//     uiAdvanceSearch: true,
//     page: 1,
//     size: 10,
//     notLightCustom: "N",
//     notRts: "N",
//     notSpecific: "N",
//     notSample: "N",
//     showPowerScore: true,
//     productKeyword:"",
//     productType:"",
//     powerScoreLayer: "superHighQuality"
//   }
//   return Axios({
//     method: "post",
//     url,
//     params
//   }).then(res => {
//     if (res) {
//       let explosiveProduct = res.count;
//       return explosiveProduct
//     }
//     return 0
//   }).catch((err) => {
//     console.log(`检测爆品出错explosiveProductPromise：${err}`)
//     return 0
//   })
// }

// function excellentProductPromise(ctoken) {
//   let url = ALI_REPORT.getAliExcellentProduct;
//   let params = {
//     ctoken,
//     imageType: "all",
//     status: "approved",
//     displayStatus: "on",
//     uiAdvanceSearch: true,
//     page: 1,
//     size: 10,
//     notLightCustom: "N",
//     notRts: "N",
//     notSpecific: "N",
//     notSample: "N",
//     showPowerScore: true,
//     productKeyword: "",
//     productType: "",
//     powerScoreLayer: "highQuality",
//   };
//   return Axios({
//     method: "post",
//     url,
//     params,
//   })
//     .then((res) => {
//       if (res) {
//         let excellentProduct = res.count;
//         return excellentProduct;
//       }
//       return 0;
//     })
//     .catch((err) => {
//       console.log(`检测实力优品出错excellentProductPromise：${err}`);
//       return 0;
//     });
// }
function problemProductPromise(ctoken) {
  let url = ALI_REPORT.getAliProblemProduct;
  let params = {
    ctoken,
    dmtrack_pageid: "",
    issueType: 26301,
    principalId: "all",
    boutiqueType: "all",
    effectType: "all",
    pageNo: 1,
  };
  return Axios({
    method: "get",
    url,
    params,
  })
    .then((res) => {
      const { issues } = res;
      if (issues && isArray(issues)) {
        return issues.filter((i) => i.count > 0);
      }
      return null;
    })
    .catch((err) => {
      console.log(`检测待优化问题产品出错problemProductPromise：${err}`);
    });
}

// function duplicateProductPromise(ctoken) {
//   let url = ALI_REPORT.getAliDuplicateProduct;
//   let params = {
//     ctoken,
//     issueType: 'duplicate_products',
//     principalId: 'all',
//     pageNo: 1
//   }
//   return Axios({
//     method: "get",
//     url,
//     params
//   }).then(res => {
//     if (res && Object.hasOwn(res, "success")) {
//       let { totalItem } = res;
//       return totalItem
//     }
//     return 0
//   }).catch((err) => {
//     console.log(`检测重复铺货产品出错duplicateProductPromise：${err}`)
//     return 0
//   })
// }
// function monthShelfProductPromise(ctoken) {
//   let url = ALI_REPORT.postAliMonthShelfProduct;
//   let params = monthShelfAndEffectProductParam(ctoken);
//   let form = monthShelfAndEffectProductForm();
//   return Axios({
//     method: "post",
//     url,
//     params,
//     data: form,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (res && Object.hasOwn(res, "successed")) {
//       let { value: { statistics: { total: total } } } = res;
//       return total
//     }
//     return 0
//   }).catch((err) => {
//     console.log(`检测有效产品出错monthShelfProductPromise：${err}`)
//     return 0
//   })
// }
// function monthEffectProductPromise(ctoken) {
//   let url = ALI_REPORT.postAliMonthEffectProduct;
//   let params = monthShelfAndEffectProductParam(ctoken);
//   let form = monthShelfAndEffectProductForm(false);
//   return Axios({
//     method: "post",
//     url,
//     params,
//     data: form,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (res && Object.hasOwn(res, "successed")) {
//       let { value: { statistics: { total: total } } } = res;
//       return total
//     }
//     return 0
//   }).catch((err) => {
//     console.log(`检测有效产品出错monthEffectProductPromise：${err}`)
//     return 0
//   })
// }
// function enquiryReductionProductPromise(ctoken, selected, name) {
//   let url = ALI_REPORT.postAliEnquiryReductionProduct
//   let params = monthShelfAndEffectProductParam(ctoken);
//   let form = enquiryReductionProductForm(selected, name);
//   return Axios({
//     method: "post",
//     url,
//     params,
//     data: form,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (res && Object.hasOwn(res, "successed")) {
//       let { value: { products: { data: data } } } = res;
//       return data
//     }
//     return []
//   }).catch((err) => {
//     console.log(`检测询盘减少品出错enquiryReductionProductPromise：${err}`)
//     return 0
//   })
// }

// function p4pReportPromise(dateBegin, dateEnd, month = true) {
//   let url = ALI_REPORT.postAliMonthP4pKeywords;
//   let form = p4pReportForm(dateBegin, dateEnd);
//   return Axios({
//     method: "post",
//     url,
//     data: form,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (res && Object.hasOwn(res, "status")) {
//       if (month) {
//         let { totalCount } = res;
//         return totalCount
//       } else {
//         let { totalCount } = res;
//         if (totalCount > 0) {
//           return 1;
//         } else {
//           return 0;
//         }
//       }
//     }
//     return 0
//   }).catch((err) => {
//     console.log(`检测直通车操作出错p4pReportPromise：${err}`)
//     return 0
//   })
// }
// function p4pAdKeywordPromise(ctoken, kw) {
//   let url = ALI_REPORT.postAliP4pAdKeywordsReport;
//   let params = {
//     ctoken
//   }
//   let form = p4pAdKeywordForm('all', 7, kw);
//   return Axios({
//     method: "post",
//     url,
//     params,
//     data: form,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (res && Object.hasOwn(res, "status")) {
//       let { totalCount } = res;
//       return totalCount
//     }
//     return 0
//   }).catch((err) => {
//     console.log(`检测直通车操作出错p4pAdKeywordPromise：${err}`)
//     return 0
//   })
// }
// function lessThreeStarKeywordPromise(ctoken, qsStar, date) {
//   let url = ALI_REPORT.postAliLessThreeStarAdKeywords
//   let params = {
//     ctoken
//   }
//   let form = p4pAdKeywordForm(qsStar, date);
//   return Axios({
//     method: "post",
//     url,
//     params,
//     data: form,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (res && Object.hasOwn(res, "status")) {
//       let { totalCount } = res;
//       return totalCount
//     }
//     return 0
//   }).catch((err) => {
//     console.log(`检测P4P3星以下词出错lessThreeStarKeywordPromise：${err}`)
//     return 0
//   })
// }
// function fiveStarKeywordPromise(ctoken, qsStar, date) {
//   let url = ALI_REPORT.postAliFiveStarAdKeywords
//   let params = {
//     ctoken
//   }
//   let form = p4pAdKeywordForm(qsStar, date);
//   return Axios({
//     method: "post",
//     url,
//     params,
//     data: form,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (res && Object.hasOwn(res, "status") && res.status) {
//       let { totalCount } = res;
//       return totalCount
//     }
//     return 0
//   }).catch((err) => {
//     console.log(`检测p4p5星词占比出错fiveStarKeywordPromise：${err}`)
//     return 0
//   })
// }
// function promotionAndCostPromise(dateBegin, dateEnd) {
//   let url = ALI_REPORT.postAliPromotionAndCostNew
//   let form = promotionReportForm(dateBegin, dateEnd);
//   return Axios({
//     method: "post",
//     url,
//     data: form,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (res && Object.hasOwn(res, "status")) {
//       let datas = res.data;
//       if (datas && datas.length > 0) {
//         let totalCost = 0;
//         let totalOnlineTime = 0;
//         for (let data of datas) {
//           totalCost += parseFloat(data.cost)
//           totalOnlineTime += parseFloat(data.onlineHours)
//         }
//         return { totalCost, totalOnlineTime }
//       }
//     }
//     return { totalCost: 0, totalOnlineTime: 0 }
//   }).catch((err) => {
//     console.log(`检测推广时长与花费出错promotionAndCostPromise：${err}`)
//     return { totalCost: 0, totalOnlineTime: 0 }
//   })
// }

// function dailyBudgetPromise(ctoken) {
//   let url = ALI_REPORT.getAliDailyBudget;
//   let params = {
//     ctoken
//   }
//   let form = p4pAdKeywordForm('all', 1);
//   return Axios({
//     method: "post",
//     url,
//     params,
//     data: form,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (res && Object.hasOwn(res, "status") && res.status) {
//       let { costLimit } = res;
//       return costLimit
//     }
//     return 0
//   }).catch((err) => {
//     console.log(`检测推广时长与花费出错dailyBudgetPromise：${err}`)
//     return 0
//   })
// }
// p4p7天关键词报告
// function p4p7DaysKeywordPromise(dateEnd) {
//   let url = ALI_REPORT.postAli7DaysP4pKeyWordReport;
//   let form = p4p7DaysKeywordReportForm(dateEnd);
//   return Axios({
//     method: "post",
//     url,
//     data: form,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (res && Object.hasOwn(res, "status") && res.status) {
//       let { data } = res
//       if (data && data.length > 0) {
//         return data.filter(item => item.impr > 1000)
//       }
//       return []
//     }
//     return []
//   }).catch((err) => {
//     console.log(`检测p4p异常词出错p4p7DaysKeywordPromise：${err}`)
//     return []
//   })
// }
// p4p7天账号报告
// function p4p7DaysAccountPromise(dateBegin, dateEnd) {
//   let url = ALI_REPORT.postAli7DaysP4pAccountReport;
//   let form = p4p7DaysAccountReportForm(dateBegin, dateEnd)
//   return Axios({
//     method: "post",
//     url,
//     data: form,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (res && Object.hasOwn(res, "status") && res.status) {
//       let { data } = res
//       if (data && data.length > 0) {
//         let totalImpressionCount = 0;
//         let totalClickCount = 0;
//         for (let item of data) {
//           totalImpressionCount += item.impr;
//           totalClickCount += item.click;
//         }
//         return { totalImpressionCount, totalClickCount };
//       }
//       return { totalImpressionCount: 0, totalClickCount: 0 }
//     }
//     return { totalImpressionCount: 0, totalClickCount: 0 }
//   }).catch(() => {
//     return { totalImpressionCount: 0, totalClickCount: 0 }
//   })
// }
//异常产品
// p4p730天关键词报告
// function p4p30DaysProductPromise(dateBegin, dateEnd) {
//   let url = ALI_REPORT.postAliDaysP4pProductReport;
//   let form = p4pDaysKeywordReportForm(dateBegin, dateEnd, 30);
//   return Axios({
//     method: "post",
//     url,
//     data: form,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (res && Object.hasOwn(res, "status") && res.status) {
//       let { data } = res
//       if (data && data.length > 0) {
//         return data.filter(item => item.click > 20)
//       }
//       return []
//     }
//     return []
//   }).catch((err) => {
//     console.log(`检测p4p异常产品出错p4p30DaysProductPromise：${err}`)
//     return []
//   })
// }
// p4p7天产品报告
// function p4p7DaysProductPromise(dateBegin, dateEnd) {
//   let url = ALI_REPORT.postAliDaysP4pProductReport;
//   let form = p4pDaysKeywordReportForm(dateBegin, dateEnd, 7);
//   return Axios({
//     method: "post",
//     url,
//     data: form,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (res && Object.hasOwn(res, "status") && res.status) {
//       let { data } = res
//       if (data && data.length > 0) {
//         return data.slice(0, 10);
//       }
//       return []
//     }
//     return []
//   }).catch((err) => {
//     console.log(`检测低转化产品出错p4p7DaysProductPromise：${err}`)
//     return []
//   })
// }
// function weekSingleProductPromise(ctoken, selected, name) {
//   let url = ALI_REPORT.postAli7DaysSingleProductStat;
//   let params = monthShelfAndEffectProductParam(ctoken)
//   let form = weekShelfAndEffectProductForm(selected, name);
//   return Axios({
//     method: "post",
//     url,
//     data: form,
//     params,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (res && Object.hasOwn(res, "successed") && res.successed) {
//       let { value: { products: { data } } } = res
//       if (data && data.length > 0) {
//         return { clickCount: data[0].sumProdClickNum, inquiryCount: data[0].sumProdFbNum }
//       }
//     }
//     return { clickCount: 0, inquiryCount: 0 }
//   }).catch((err) => {
//     console.log(`检测低转化产品出错weekSingleProductPromise：${err}`)
//     return { clickCount: 0, inquiryCount: 0 }
//   })
// }
// function weekProductAccountPromise(ctoken, selected) {
//   let url = ALI_REPORT.postAli7DaysAccountStat;
//   let params = monthShelfAndEffectProductParam(ctoken)
//   let form = weekShelfAndEffectProductForm(selected);
//   return Axios({
//     method: "post",
//     url,
//     data: form,
//     params,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (res && Object.hasOwn(res, "successed") && res.successed) {
//       let { value: { statistics } } = res
//       return { clickCount: statistics.clicks, inquiryCount: statistics.inquiries }
//     }
//     return { clickCount: 0, inquiryCount: 0 }
//   }).catch(() => {
//     return { clickCount: 0, inquiryCount: 0 }
//   })
// }
// function exceptionProductPromise(ctoken, selected, name) {
//   let url = ALI_REPORT.postAliExceptionProductReport;
//   let params = monthShelfAndEffectProductParam(ctoken);
//   let form = dayExceptionProductForm(selected, name);
//   return Axios({
//     method: "post",
//     url,
//     data: form,
//     params,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (res && Object.hasOwn(res, "successed") && res.successed) {
//       let { value: { products: { data }, statistics } } = res
//       if (data && data.length > 0) {
//         let keywordEffect = data[0].keywordEffect;
//         let maxClick = 0
//         let maxClickKeyword = 0
//         if (keywordEffect && keywordEffect.length > 0) {
//           maxClick = getMaxPropValue(keywordEffect, 'clicks');
//           let keywordEffectObj = keywordEffect.find(item => item.clicks === `${maxClick}`)
//           maxClickKeyword = keywordEffectObj.keyword
//         }
//         return { visitorCount: statistics.clicks, feedback: statistics.inquiries, maxClick, maxClickKeyword };
//       }
//       return { visitorCount: 0, feedback: 0, maxClick: 0, maxClickKeyword: '' }
//     }
//     return { visitorCount: 0, feedback: 0, maxClick: 0, maxClickKeyword: '' }
//   }).catch((err) => {
//     console.log(`检测p4p异常产品exceptionProductPromise：${err}`)
//     return { visitorCount: 0, feedback: 0, maxClick: 0, maxClickKeyword: '' }
//   })
// }
// function exceptionProductDay30TrendsAndOperatorPromise(ctoken, productId) {
//   let url = ALI_REPORT.postAliExceptionProductDay30TrendsAndOperatorReport;
//   let params = exceptionProductDay30TrendsAndOperatorParam(ctoken);
//   let form = ExceptionProductDay30TrendsAndOperatorForm(productId);
//   return Axios({
//     method: "post",
//     url,
//     data: form,
//     params,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (res && Object.hasOwn(res, "successed") && res.successed) {
//       let { value } = res
//       if (value && value.length > 0) {
//         for (let item of value) {
//           let { ops } = item;
//           if (ops && ops.length > 0) {
//             for (let op of ops) {
//               let { opGroups } = op
//               if (opGroups && opGroups.length > 0) {
//                 for (let opGroup of opGroups) {
//                   if (opGroup.upItem === 'prod') {
//                     return 1
//                   }
//                 }
//               }
//             }
//           }
//         }
//       }
//       return 0
//     }
//     return 0
//   }).catch((err) => {
//     console.log(`检测p4p异常产品exceptionProductDay30TrendsAndOperatorPromise：${err}`)
//     return 0
//   })
// }
// function day30ProductAccountPromise(ctoken, selected, name) {
//   let url = ALI_REPORT.postAliExceptionProductReport;
//   let params = monthShelfAndEffectProductParam(ctoken)
//   let form = dayExceptionProductForm(selected, name);
//   return Axios({
//     method: "post",
//     url,
//     data: form,
//     params,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (res && Object.hasOwn(res, "successed") && res.successed) {
//       let { value: { statistics: statistics } } = res
//       return { clickCount: statistics.clicks, inquiryCount: statistics.inquiries }
//     }
//     return { clickCount: 0, inquiryCount: 0 }
//   }).catch(() => {
//     return { clickCount: 0, inquiryCount: 0 }
//   })
// }
async function windowRemainCountPromise() {
  let data = await windowIdPromise();
  let url = ALI_REPORT.postAliWindowRemainCount;
  let form = windowRemainCountForm(data);
  return Axios({
    method: "post",
    url,
    data: form,
    headers: nonFormHeaders,
  })
    .then((res) => {
      if (res && Object.hasOwn(res, "status")) {
        let { data } = res;
        let { serviceShowCaseCount } = data;
        return serviceShowCaseCount;
      }
      return 0;
    })
    .catch((err) => {
      console.log(`剩余橱窗windowRemainCountPromise：${err}`);
      return 0;
    });
}
async function windowInvalidCountPromise() {
  let data = await windowIdPromise();
  let url =
    ALI_REPORT.postAliWindowInvalidCount +
    `api/campaign/${data}/adgroup/summary`;
  let form = windowInvalidCountForm();
  return Axios({
    method: "post",
    url,
    data: form,
    headers: nonFormHeaders,
  })
    .then((res) => {
      if (res && Object.hasOwn(res, "status")) {
        let { data } = res;
        let { invalidProductNum, adgroupNum } = data;
        return { invalidProductNum, adgroupNum };
      }
      return { invalidProductNum: 0, adgroupNum: 0 };
    })
    .catch((err) => {
      console.log(`无效橱窗windowListNewPromise：${err}`);
      return { invalidProductNum: 0, adgroupNum: 0 };
    });
}

async function windowIdPromise() {
  let url = ALI_REPORT.postWindowId;
  let form = windowIdForm();
  return Axios({
    method: "post",
    url,
    data: form,
    headers: nonFormHeaders,
  })
    .then((res) => {
      if (res && Object.hasOwn(res, "status")) {
        let { data } = res;
        return data;
      }
      return 0;
    })
    .catch((err) => {
      console.log(`橱窗广告id：${err}`);
      return 0;
    });
}
async function windowStatPromise() {
  let { invalidProductNum, adgroupNum } = await windowInvalidCountPromise();
  let serviceShowCaseCount = await windowRemainCountPromise();
  let invalidCount = invalidProductNum;
  let sumRemain = 0;
  if (serviceShowCaseCount > 0 && serviceShowCaseCount >= adgroupNum) {
    sumRemain = serviceShowCaseCount - adgroupNum;
  }
  return { invalidCount, sumRemain };
}
// function windowListPromise() {
//   let url = ALI_REPORT.postAliWindowList;
//   let form = windowListForm()
//   return Axios({
//     method: "post",
//     url,
//     data: form,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (res && Object.hasOwn(res, "status") && res.status) {
//       let { invalidCount, sumRemain } = res
//       return { invalidCount, sumRemain }
//     }
//     return { invalidCount: 0, sumRemain: 0 }
//   }).catch((err) => {
//     console.log(`检测橱窗操作windowListPromise：${err}`)
//     return { invalidCount: 0, sumRemain: 0 }
//   })
// }

async function windowProductDetailPromise() {
  let data = await windowIdPromise();
  let url = ALI_REPORT.postAliWindowListNew + `api/campaign/${data}/adgroup`;
  let form = windowListNewForm();
  return Axios({
    method: "post",
    url,
    data: form,
    headers: nonFormHeaders,
  })
    .then((res) => {
      let { data } = res;
      return data.map((item) => item.productId);
    })
    .catch((err) => {
      console.log(`检测自然排名情况出错windowProductDetailPromise：${err}`);
      return [];
    });
}
// function last30DayProductUpdatePromise(id, startDate, endDate, ctoken) {
//   let url = ALI_REPORT.getAliShelfProduct;
//   let params = {
//     statisticsType: 'month',
//     repositoryType: 'all',
//     imageType: 'all',
//     gmtModifiedFrom: `${startDate}`,
//     gmtModifiedTo: `${endDate}`,
//     bkGmtModified: 30,
//     uiAdvanceSearch: true,
//     productId: `${id}`,
//     showType: 'onlyMarket',
//     status: 'all',
//     page: 1,
//     size: 10,
//     ctoken: `${ctoken}`,
//     _csrf_token_: csrfToken
//   }
//   return Axios({
//     method: "get",
//     url,
//     params
//   }).then(res => {
//     let { count } = res
//     return count;
//   }).catch((err) => {
//     console.log(`检测低转化产品出错last30DayProductUpdatePromise：${err}`);
//     return 0;
//   })
// }

function windowKeywordPromise(id, ctoken) {
  let url = ALI_REPORT.getAliShelfProduct;
  let params = {
    statisticsType: "month",
    repositoryType: "all",
    imageType: "all",
    uiAdvanceSearch: true,
    productId: `${id}`,
    showType: "onlyMarket",
    status: "all",
    page: 1,
    size: 10,
    ctoken: `${ctoken}`,
    _csrf_token_: csrfToken,
  };
  return Axios({
    method: "get",
    url,
    params,
  })
    .then((res) => {
      let { products } = res;
      return products[0].keywords.split(",");
    })
    .catch((err) => {
      console.log(`检测自然排名情况windowKeywordPromise：${err}`);
      return [];
    });
}
function windowLogNewPromise(dateBegin, dateEnd) {
  console.log("_csrf : " + showcaseCsrf);
  let url = ALI_REPORT.postAliWindowSysLogNew;
  let form = windowLogNewForm(dateBegin, dateEnd);
  return Axios({
    method: "post",
    url,
    data: form,
    headers: nonFormHeaders,
  })
    .then((res) => {
      let { totalCount } = res;
      if (totalCount > 0) {
        return 1;
      }
      return 0;
    })
    .catch((err) => {
      console.log(`检测橱窗操作windowLogPromise：${err}`);
      return 0;
    });
}
// function windowLogPromise(dateBegin, dateEnd) {
//   let url = ALI_REPORT.postAliWindowSysLog;
//   let form = windowLogForm(dateBegin, dateEnd)
//   return Axios({
//     method: "post",
//     url,
//     data: form,
//     headers: nonFormHeaders
//   }).then(res => {
//     let { totalCount } = res
//     if (totalCount > 0) {
//       return 1
//     }
//     return 0
//   }).catch((err) => {
//     console.log(`检测橱窗操作windowLogPromise：${err}`)
//     return 0
//   })
// }
function effectiveProductsInquiryPromise(ctoken, window) {
  let url = ALI_REPORT.postAliMonthInquiry;
  let params = monthShelfAndEffectProductParam(ctoken);
  let form = effectiveProductsStatsForm("month", 1, window);
  return Axios({
    method: "post",
    url,
    params,
    data: form,
    headers: nonFormHeaders,
  })
    .then((res) => {
      if (res && Object.hasOwn(res, "successed") && res.successed) {
        let {
          value: {
            statistics: { inquiries },
          },
        } = res;
        if (!window && !monthInquiryTotalCount) {
          monthInquiryTotalCount = inquiries;
          if (res.value.products.data && res.value.products.data.length > 0) {
            // monthInquireMostProductCount = res.value.products.data[0].sumProdFbNum;
          } else {
            // monthInquireMostProductCount = 0;
          }
        }
        return inquiries;
      }
      return 0;
    })
    .catch((err) => {
      console.log(`检测橱窗询盘占比effectiveProductsInquiryPromise：${err}`);
      return 0;
    });
}
// function getMaxPropValue(data, prop) {
//   return data.reduce((max, b) => Math.max(max, b[prop]), data[0][prop]);
// }

function lastMonthStaffStatsPromise(ctoken) {
  let url = ALI_REPORT.getAliLastMonthStaffStats;
  let params = {
    action: "OneAction",
    iName: "vip/home/getAccountsAndTotal",
    ctoken,
    statisticType: "os",
    region: "os",
    isVip: true,
    statisticsType: "month",
    selected: 1,
  };
  return Axios({
    method: "get",
    url,
    params,
  })
    .then((res) => {
      if (res && Object.hasOwn(res, "code") && res.code === 0) {
        let {
          data: { accounts },
        } = res;
        if (accounts && accounts.length > 0) {
          if (accounts.length > 1) {
            accounts = accounts
              .filter((i) => i.fbPv)
              .sort((a, b) => b.replyAvgTime - a.replyAvgTime);
          }
          const avgReplyAvgTime = (
            accounts
              .map((i) => i.replyAvgTime)
              .reduce((prev, curr) => prev + curr, 0) / accounts.length
          ).toFixed(1);
          const someReplyAvgTime = accounts.some((i) => i.replyAvgTime > 8);
          const maxAccount = accounts[0];
          return {
            avgReplyAvgTime: avgReplyAvgTime ? avgReplyAvgTime : 0,
            someReplyAvgTime: someReplyAvgTime ? someReplyAvgTime : 0,
            maxAccount: maxAccount
              ? maxAccount
              : { fullName: "", replyAvgTime: "" },
          };
        }
        return {
          avgReplyAvgTime: 0,
          someReplyAvgTime: 0,
          maxAccount: { fullName: "", replyAvgTime: "" },
        };
      }
      return {
        avgReplyAvgTime: 0,
        someReplyAvgTime: 0,
        maxAccount: { fullName: "", replyAvgTime: "" },
      };
    })
    .catch((err) => {
      console.log(`检测平均回复时长出错lastMonthStaffStatsPromise：${err}`);
      return {
        avgReplyAvgTime: 0,
        someReplyAvgTime: 0,
        maxAccount: { fullName: "", replyAvgTime: "" },
      };
    });
}
// function groupPromise(ctoken) {
//   let url = ALI_REPORT.postAliGroup;
//   let params = groupParam(ctoken);
//   let form = effectiveProductsStatsForm("month", 1, false);
//   return Axios({
//     method: "post",
//     url,
//     params,
//     data: form,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (res && Object.hasOwn(res, "successed") && res.successed) {
//       let { value } = res;
//       return value.filter(item => item.groupName && item.parentGroupId === -1)
//     }
//     return []
//   }).catch((err) => {
//     console.log(`检测及时回复率出错groupPromise：${err}`)
//     return []
//   })
// }
// function timelyResponseRatePromise(ctoken, groupLevelOne, groupName) {
//   let url = ALI_REPORT.postAliTimelyResponseRate;
//   let params = monthShelfAndEffectProductParam(ctoken);
//   let form = groupLevelOneMonthStatsForm(groupLevelOne);
//   return Axios({
//     method: "post",
//     url,
//     params,
//     data: form,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (res && Object.hasOwn(res, "successed") && res.successed) {
//       let { value: { statistics: { inquiries } } } = res;
//       return { inquiries, groupName }
//     }
//     return { inquiries: 0, groupName }
//   }).catch((err) => {
//     console.log(`检测及时回复率出错timelyResponseRatePromise：${err}`)
//     return { inquiries: 0, groupName }
//   })
// }
// function visitorMarketingRatePromise(ctoken, startDate, endDate) {
//   const url = ALI_REPORT.getAliVisitorMarketingRate;
//   const params = {
//     action: "CommonAction",
//     iName: "getOnePagePerformance",
//     ctoken
//   }
//   const data = {
//     memberSeq: "",
//     startDate,
//     endDate
//   }
//   return Axios({
//     method: "post",
//     url,
//     params,
//     data: qs.stringify(data)
//   }).then(res => {
//     if (res && Object.hasOwn(res, "successed") && res.successed) {
//       let { value: { mailCount } } = res;
//       return mailCount
//     }
//     return 0
//   }).catch((err) => {
//     console.log(`检测访客营销出错visitorMarketingRatePromise：${err}`)
//     return 0
//   })
// }
// function getVisitors(ctoken, startDate, endDate) {
//   const url = ALI_REPORT.getAliVisitorMarketingRate;
//   const params = {
//     action: "CommonAction",
//     iName: "getVisitors",
//     isVip: true,
//     ctoken
//   }
//   const data = {
//     orderBy: "",
//     orderModel: "",
//     pageSize: 10,
//     pageNO: 1,
//     statisticsType: "day",
//     selected: 0,
//     startDate,
//     endDate,
//     searchKeyword: "",
//     buyerRegion: "",
//     buyerCountry: "",
//     subMemberSeq: "",
//     isMcFb: false,
//     isAtmFb: false,
//     mailable: true,
//     mailed: false,
//     hasRemarks: false,
//     statisticType: "os"

//   }
//   return axios({
//     url,
//     method: "post",
//     params,
//     data: qs.stringify(data)
//   }).then(res => {
//     const {data: {successed, value}} = res
//     if (successed && value && value.total) {
//       return value.total
//     }
//   }).catch(err => {
//     console.log(`获取getVisitors出错了:${err}`)
//   })
// }
// function getEndDate(ctoken, startDate, endDate) {
//   const url = ALI_REPORT.getAliVisitorMarketingRate;
//   const params = {
//     action: "CommonAction",
//     iName: "getOnePageDailyPerformance",
//     ctoken
//   }
//   const data = {
//     pageSize: 10,
//     pageNO: 1,
//     memberSeq: "",
//     startDate,
//     endDate
//   }
//   return axios({
//     url,
//     method: "post",
//     params,
//     data: qs.stringify(data)
//   }).then(res => {
//     const {data: {successed, value}} = res
//     if (successed && value.data && value.data.length > 0) {
//       return value.data[0].sendDate
//     }
//   })
// }
function last30DayCreditGuaranteeOrderNewPromise(selected, ctoken) {
  let url = ALI_REPORT.getAliLast30DayCreditGuaranteeOrderNew;
  let params = {
    action: "OneAction",
    iName: "vip/home/custom/getShopSummary",
    statisticsType: "day",
    selected: selected,
    terminalType: "total",
    isMyselfUpgraded: true,
    statisticType: "os",
    region: "os",
    seperateByCate: false,
    isVip: false,
    ctoken,
  };
  return Axios({
    method: "get",
    url,
    params,
  })
    .then((res) => {
      if (
        res &&
        Object.hasOwn(res, "code") &&
        (res.code === 200 || res.code === 0)
      ) {
        let {
          data: { returnValue: items },
        } = res;
        if (items && items.length > 0) {
          let {
            ordCnt: { value: count },
            ordAmt: { value: amount },
          } = items[0];
          return { count: parseInt(count), amount: parseInt(amount) };
        }
        return { count: 0, amount: 0 };
      }
      return { count: 0, amount: 0 };
    })
    .catch((err) => {
      console.log(
        `检测信保情况last30DayCreditGuaranteeOrderNewPromise：${err}`
      );
      return { count: 0, amount: 0 };
    });
}
// function last30DayCreditGuaranteeOrderPromise(startTime, endTime, ctoken) {
//   let url = ALI_REPORT.getAliLast30DayCreditGuaranteeOrder;
//   let params = {
//     ctoken,
//     pageIndex: 1,
//     pageSize: 100,
//     startTime: `${startTime}`,
//     endTime: `${endTime}`
//   }
//   return Axios({
//     method: "get",
//     url,
//     params
//   }).then(res => {
//     if (res && Object.hasOwn(res, "code") && res.code === 200) {
//       let { data: { result: { dealList } } } = res;
//       if (dealList && dealList.length > 0) {
//         let totalCount = 0;
//         for (let item of dealList) {
//           if (item.orderType === '信用保障订单') {
//             totalCount += 1
//           }
//         }
//         return totalCount;
//       }
//       return 0
//     }
//     return 0
//   }).catch((err) => {
//     console.log(`检测信保情况last30DayCreditGuaranteeOrderPromise：${err}`)
//     return 0
//   })
// }
// function finalStarPromise() {
//   let url = ALI_REPORT.getAliFinalStar;
//   return Axios({
//     method: "get",
//     url
//   }).then(res => {
//     if (res && Object.hasOwn(res, "success") && res.success) {
//       let { values: { realTimeStar } } = res;
//       return realTimeStar
//     }
//     return 0
//   }).catch((err) => {
//     console.log(`检测信保情况finalStarPromise：${err}`)
//     return 0
//   })
// }
function shoeTradePromise() {
  let url = ALI_REPORT.getAliShoeTrade;
  let params = {
    type: "custom",
  };
  return Axios({
    method: "get",
    url,
    params,
  })
    .then((res) => {
      let nextLevel = 0;
      if (res && Object.hasOwn(res, "success") && res.success) {
        let { values } = res;
        let avgAmount = 0;
        let tradeAmount = 0;
        for (let value of values) {
          if (value.code === "CUSTOM_300000") {
            nextLevel =
              parseInt(value.starLevel) === 5
                ? value.starLevel
                : parseInt(value.starLevel) + 1;
          }
          if (value.descMcmsKey === "StarModel.Trans.GMV.Tip") {
            avgAmount = parseInt(value.avgNextLevel);
            tradeAmount = parseInt(value.value);
          }
          if (value.descMcmsKey === "StarModel.Perform.Evaluation.Tip") {
            buyerReviewScore = Math.floor(value.value * 10) / 10;
            nextLevelReviewScore = Math.floor(value.avgNextLevel * 10) / 10;
          }
        }
        return { tradeAmount, avgAmount, nextLevel };
      }
      return { tradeAmount: 0, avgAmount: 0, nextLevel };
    })
    .catch((err) => {
      console.log(`检测信保情况shoeTradePromise：${err}`);
      return { tradeAmount: 0, avgAmount: 0, nextLevel: 0 };
    });
  // return { tradeAmount: 0, avgAmount: 0, nextLevel: 0 }
}
// function fanPromise(startTime, endTime) {
//   let url = ALI_REPORT.getAliFan;
//   let params = {
//     currentPage: 1,
//     pageSize: 20,
//     startTime,
//     endTime,
//     _csrf: contentCsrf,
//     draft: 0
//   }
//   const from = qs.stringify(params)
//   return Axios({
//     method: "post",
//     url,
//     data: from,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (res && Object.hasOwn(res, "success") && res.success) {
//       let { entity: { totalCount } } = res;
//       return totalCount
//     }
//     return 0
//   }).catch((err) => {
//     console.log(`检测粉丝通出错fanPromise：${err}`)
//     return { pass: false, size: 0 }
//   })
// }

function rfqPromise(ctoken) {
  let url = ALI_REPORT.postAliRFQ;
  let params = rfqParam(ctoken);
  let form = rfqForm();
  return Axios({
    method: "post",
    url,
    params,
    data: form,
    headers: nonFormHeaders,
  })
    .then((res) => {
      if (res && Object.hasOwn(res, "code") && res.code === "200") {
        let {
          data: { quotesList },
        } = res;
        if (quotesList && quotesList.length > 0) {
          let currentMonth = moment(new Date()).format("YYYY-MM");
          let lastMonth = moment(currentMonth)
            .subtract(1, "days")
            .format("YYYY-MM");
          let startTime = moment(`${lastMonth}-10`).format("YYYY-MM-DD");
          let endTime = moment().startOf("month").format("YYYY-MM-DD");
          let totalConsumeCount = 0;
          for (let item of quotesList) {
            let createTime = moment(`${item.createTime}`).format("YYYY-MM-DD");
            if (createTime >= startTime && createTime <= endTime) {
              totalConsumeCount += Math.abs(parseInt(item.amount));
            }
          }
          return totalConsumeCount;
        }
        return 0;
      }
      return 0;
    })
    .catch((err) => {
      console.log(`检测RFQ出错rfqPromise：${err}`);
      return 0;
    });
}
async function getSubscription() {
  const url = `https://mysourcing.alibaba.com/rfq/quotation/myRecommendSubscriptionCenter.htm`;
  return axios({
    url,
    method: "get",
  })
    .then((res) => {
      res = res.data;
      const end = "})(),";
      const cateStart = '"selCategoryIdList": ';
      const cateContent = res.substring(res.indexOfEnd(cateStart));
      const cate = cateContent.substring(0, cateContent.indexOf(end));
      const isCate = cate.includes("rs.push");

      const keywordStart = '"selectedKeyWords": ';
      const keywordContent = res.substring(res.indexOfEnd(keywordStart));
      const keyword = keywordContent.substring(0, keywordContent.indexOf(end));
      const isKeyword = keyword.includes("rs.push");
      return {
        isCate,
        isKeyword,
      };
    })
    .catch((err) => {
      console.log(`获取getSubscription出错:${err}`);
    });
}

async function getStarType() {
  let params = {
    _: new Date().getTime(),
  };
  return Axios({
    url: "https://supplier.alibaba.com/capability/fetchPredictedStars.json",
    method: "get",
    params,
  })
    .then((res) => {
      console.log(res);
      let values = getNested(res, "values");
      if (Array.isArray(values)) {
        let rtsStarInfo = values.find((item) => item.type === "rts");
        let customStarInfo = values.find((item) => item.type === "custom");
        let rtsStar = getNested(rtsStarInfo, "star") | 0;
        let customStar = getNested(customStarInfo, "star") | 0;
        if (customStar >= rtsStar) {
          return "custom";
        } else {
          return "rts";
        }
      }
    })
    .catch((e) => {
      console.error(`诊断明细：产品数过少-获取商家星等级失败${e}`);
    });
}

async function getProductNumber() {
  const url = URL_ASYNC_QUERY_PRODUCT_LIST;
  let params = {
    statisticsType: "month",
    repositoryType: "all",
    imageType: "all",
    displayStatus: "on",
    uiAdvanceSearch: true,
    showType: "onlyMarket",
    status: "all",
    page: 1,
    size: 10,
    _csrf_token_: csrfToken,
    lang: "en_US",
  };
  return Axios({
    url,
    params,
  }).then((res) => {
    return getNested(res, "count");
  });
}

async function getShopSummary(ctoken, i, industryId) {
  const url = ALI_REPORT.getAliIndustries;
  let params = {
    action: "OneAction",
    iName: "vip/home/getShopSummary",
    ctoken: ctoken,
    statisticType: "os",
    region: "os",
    isVip: true,
    statisticsType: "week",
    selected: i,
    terminalType: "total",
    isMyselfUpgraded: true,
    cateId: industryId,
    seperateByCate: false,
  };
  return Axios({
    url,
    method: "get",
    params,
  })
    .then((res) => {
      let result = {};
      if (res && res.data) {
        let data = res.data[0];
        result.natureClickCnt = data.natureClickCnt;
        result.searchClicks = data.searchClicks.value;
      }
      return result;
    })
    .catch((err) => {
      console.log(`诊断明细-获取自然点击占比失败${err}`);
    });
}

async function get4WeekClickInfo(ctoken) {
  //类目id
  let industryId = await feedbackService.checkIndustryId(ctoken);
  let shopDataArray = [];
  for (let i = 1; i <= 4; i++) {
    let shopData = await getShopSummary(ctoken, i, industryId);
    shopDataArray.push(shopData);
  }
  // 合并4周数据
  let searchNaturalClick = shopDataArray
    .map((item) => getNested(item, "natureClickCnt", "value") | 0)
    .reduce((prev, curr) => prev + curr);
  let rivalAvgNaturalClick = shopDataArray
    .map((item) => getNested(item, "natureClickCnt", "rivalAvg") | 0)
    .reduce((prev, curr) => prev + curr);
  let searchClicks = shopDataArray
    .map((item) => getNested(item, "searchClicks") | 0)
    .reduce((prev, curr) => prev + curr);
  let naturalClickRate =
    Math.round((searchNaturalClick / searchClicks) * 10000) / 100;
  if (
    searchNaturalClick < searchClicks * 0.4 &&
    searchNaturalClick > rivalAvgNaturalClick
  ) {
    return {
      result: false,
      message:
        `<b>自然点击占比过低：</b>` +
        `近4周自然搜索点击占全店搜索点击比例较低，占比为${naturalClickRate}%。`,
      rate: naturalClickRate,
    };
  } else {
    return {
      result: true,
      message: `近4周自然搜索点击占全店搜索点击比例合理，为${naturalClickRate}%。`,
      rate: naturalClickRate,
    };
  }
}
async function getShowcaseId() {
  const url = `https://showcase.alibaba.com/api/campaign/find/showcase`;
  const form = {
    type: "normal",
    ads: `{"productLineId":110101}`,
    data: `{}`,
    _csrf: showcaseCsrf,
  };
  return axios({
    url,
    method: "post",
    data: qs.stringify(form),
  })
    .then((res) => {
      return res.data.data;
    })
    .catch((err) => {
      console.log(`获取getShowcaseId出错:${err}`);
    });
}
async function getWindowProductArray() {
  const id = await getShowcaseId();
  let url = `https://showcase.alibaba.com/api/campaign/${id}/adgroup`;
  let data = {
    type: "normal",
    ads: `{"productLineId":110101}`,
    data: `{"orderBy":"ad_group_sort","order":"desc","adgroupOnlineStatus":1,"page":1,"size":50}`,
    _csrf: showcaseCsrf,
  };
  return Axios({
    url,
    method: "post",
    data: qs.stringify(data),
  }).then((res) => {
    return getNested(res, "data") || [];
  });
}

// async function getTradingPowerStarLevel(type) {
//   const url = `https://merchant-rating.alibaba.com/capability/fetchIndicatorsByType.jsonp`;
//   const params = {
//     type,
//   };
//   return axios({
//     url,
//     method: "get",
//     params,
//   })
//     .then((res) => {
//       const values = getNested(res, "data", "values");
//       if (values && isArray(values) && values.length) {
//         const tradingPower = values.find((f) => f.name === "交易力");
//         if (tradingPower && tradingPower.starLevel) {
//           return tradingPower.starLevel;
//         }
//         return 0;
//       }
//       return 0;
//     })
//     .catch((err) => {
//       console.log(`获取交易力星级出错了：${err}`);
//     });
// }
// function getTbToken() {
//   return new Promise((resolve) => {
//     chrome.cookies.get(
//       {
//         name: "_tb_token_",
//         url: "https://i.alibaba.com",
//       },
//       (res) => {
//         resolve(res.value);
//       }
//     );
//   });
// }
// function getTotalAmountData(ctoken, _tb_token_, currentPage) {
//   const url = `https://bao.alibaba.com/bao/ajax/ajaxQueryReceiveOrderPage.do`;
//   const params = {
//     currentPage,
//     ctoken,
//     _tb_token_,
//   };
//   return axios({
//     url,
//     method: "get",
//     params,
//   })
//     .then((res) => {
//       const page = getNested(res, "data", "data", "totalPage");
//       const recordList = getNested(res, "data", "data", "recordList");
//       if (page && recordList && recordList.length) {
//         return {
//           page,
//           recordList,
//         };
//       }
//       return {
//         page: 0,
//         recordList: [],
//       };
//     })
//     .catch((err) => {
//       console.log(`获取getTotalAmountPage出错了：${err}`);
//     });
// }
// async function getTotalAmount(ctoken) {
//   const _tb_token_ = await getTbToken();
//   const totalAmount = await getTotalAmountData(ctoken, _tb_token_, 1);
//   const { page, recordList } = totalAmount;
//   const promises = [];
//   const amountList = [];
//   if (page > 0 && recordList.length) {
//     for (let i = 1; i <= page; i++) {
//       const promise = getTotalAmountData(ctoken, _tb_token_, i)
//         .then((res) => {
//           amountList.push(...res.recordList);
//         })
//         .catch((err) => {
//           console.log(`出错了：${err}`);
//         });
//       promises.push(promise);
//     }
//     await Promise.all(promises);
//     return amountList;
//   }
//   return amountList;
// }
// function getFilterTotalAmount(amountData) {
//   if (amountData.length) {
//     const time = moment()
//       .subtract(2, "month")
//       .startOf("month")
//       .format("YYYY-MM-DD HH:mm:ss");
//     const arr = amountData.filter((f) => new Date(f.payTime) > new Date(time));
//     return arr.reduce((acc, cur) => acc + cur.receiveAmount, 0).toFixed(0);
//   }
//   return 0;
// }

// function getCategoryConversionRateObj(fbTmConversionRate) {
//   const {
//     categoryConversionRate,
//     categoryData: { mainCateLv3Desc },
//   } = fbTmConversionRate;
//   if (categoryConversionRate.length > 0 && mainCateLv3Desc) {
//     const lastMonthData = categoryConversionRate[0];
//     const {
//       fbUv,
//       tmUv,
//       searchClicks,
//       fbUvRivalAvg,
//       tmUvRivalAvg,
//       searchClicksRivalAvg,
//     } = lastMonthData;
//     const selfNumber = (fbUv + tmUv) / searchClicks;
//     const selfFbTmConversionRate = numberToPercent(selfNumber);
//     let avgNumber = (fbUvRivalAvg + tmUvRivalAvg) / searchClicksRivalAvg;
//     if (isNaN(avgNumber) || avgNumber === Infinity) {
//       avgNumber = 0;
//     }
//     const avgFbTmConversionRate = numberToPercent(avgNumber);
//     if (Number(selfFbTmConversionRate) < Number(avgFbTmConversionRate)) {
//       return {
//         result: false,
//         message:
//           `<b>主营三级${mainCateLv3Desc}类目转化率不佳：</b>` +
//           `上月，${mainCateLv3Desc}类目点击到询盘TM的转化率为${selfFbTmConversionRate}%，低于同行转化率${avgFbTmConversionRate}%。建议根据此报告相关数据，查看流量来源精准度，款式是否受欢迎，价格起订量是否有优势。`,
//         selfFbTmConversionRate,
//         avgFbTmConversionRate,
//         mainCateLv3Desc,
//       };
//     }
//     return {
//       result: true,
//       message: `上月，店铺主营${mainCateLv3Desc}类目点击到询盘TM的转化率为${selfFbTmConversionRate}%，高于同行平均水平（${avgFbTmConversionRate}%）。`,
//       selfFbTmConversionRate,
//       avgFbTmConversionRate,
//       mainCateLv3Desc,
//     };
//   }
//   return {
//     result: false,
//     message: "",
//   };
// }
// async function getOneAdvertise(item, _csrf) {
//   const url = `https://www2.alibaba.com/api/campaign/summary/${item.key}`;
//   let productLineId = 110101;
//   if (item.key === (15 || 16)) {
//     productLineId = 110103;
//   }
//   const form = {
//     type: "normal",
//     ads: `{"productLineId":${productLineId}}`,
//     data: {},
//     _csrf,
//   };
//   return axios({
//     url,
//     method: "post",
//     data: qs.stringify(form),
//   })
//     .then((res) => {
//       const {
//         data: { data },
//       } = res;
//       const { key, title } = item;
//       if (data) {
//         const {
//           totalOnProduct,
//           totalOnCampaign,
//           totalOnBudgetStr,
//           totalRealCostStr,
//         } = data;
//         return {
//           totalOnProduct,
//           totalOnCampaign,
//           totalOnBudgetStr,
//           totalRealCostStr,
//           key,
//           title,
//         };
//       }
//       return { key, title };
//     })
//     .catch((err) => {
//       console.log(`获取checkAdvertise出错:${err}`);
//     });
// }
// function getPromotionInfo(_csrf, param) {
//   const url = `https://www2.alibaba.com/api/account/balance`;
//   const form = {
//     type: "normal",
//     ads: `{"productLineId":110101}`,
//     data: `{"businessTypes":["${param}"]}`,
//     _csrf,
//   };
//   return axios({
//     url,
//     method: "post",
//     data: qs.stringify(form),
//   })
//     .then((res) => {
//       const {
//         data: { data },
//       } = res;
//       if (data && Object.hasOwn(data, "cashBalance") && data.cashBalance) {
//         return data.cashBalance;
//       }
//       return 0;
//     })
//     .catch((err) => {
//       console.log(`获取getSearchPromotion出错了:${err}`);
//     });
// }
// async function getAccountInfo(_csrf) {
//   const searchPromotion = await getPromotionInfo(_csrf, "all");
//   const recommendPromotion = await getPromotionInfo(_csrf, "recommend");
//   return {
//     searchPromotion,
//     recommendPromotion,
//   };
// }
// async function getMarketingAdvertising(result, _csrf) {
//   advertisingList = result.filter(
//     (i) =>
//       i.totalOnBudgetStr > 0 &&
//       (i.totalOnProduct > 0 && i.totalOnCampaign > 0
//         ? i.totalOnCampaign
//         : i.totalOnProduct) > 0
//   );
//   let message = `当前营销广告方案为：` + `<br/>`;
//   let number = 1;
//   for (const item of advertisingList) {
//     if (item.key === 1) {
//       message +=
//         `<b>${number++}、</b>` +
//         `<b>${item.title}</b>` +
//         `-${item.totalOnBudgetStr}元/天；` +
//         `<br/>`;
//       continue;
//     }
//     const result = await getPlanTitleList(_csrf, item.key);
//     for (const i of result) {
//       item.name = i.title;
//       const value = getNested(i, "properties", "budget");
//       const budget = value ? value : 0;
//       if (budget == 0) {
//         continue;
//       }
//       if (i.title.includes(item.title)) {
//         message +=
//           `<b>${number++}、</b>` +
//           `<b>${i.title}</b>` +
//           `-${budget}元/天；` +
//           `<br/>`;
//       } else {
//         message +=
//           `<b>${number++}、</b>` +
//           `<b>${i.title}(${item.title})</b>` +
//           `-${budget}元/天；` +
//           `<br/>`;
//       }
//     }
//   }
//   return {
//     result: false,
//     message,
//     advertisingList,
//   };
// }
// function getOnePlanTitleList(_csrf, key, item) {
//   const url = "https://www2.alibaba.com/api/campaign";
//   let productLineId = 110101;
//   if (key === (15 || 16)) {
//     productLineId = 110103;
//   }
//   const form = {
//     type: "normal",
//     ads: `{"productLineId":${productLineId}}`,
//     data: `{"page":1,"size":1000,"typeList":[${key}],"onlineStatus":"${item}"}`,
//     _csrf,
//   };
//   return axios({
//     url,
//     method: "post",
//     data: qs.stringify(form),
//   })
//     .then((res) => {
//       return res.data.data;
//     })
//     .catch((err) => {
//       console.log(`获取getPlanTitleList出错:${err}`);
//     });
// }
// async function getPlanTitleList(_csrf, key) {
//   const arr = [1, -1];
//   const promises = [];
//   for (const item of arr) {
//     const promise = getOnePlanTitleList(_csrf, key, item);
//     promises.push(promise);
//   }
//   return (await Promise.all(promises)).flat(1);
// }
// async function getAdvertise() {
//   await getMarketCsrf();
//   const promises = [];
//   for (const item of arrTemplate) {
//     const promise = getOneAdvertise(item, _csrf);
//     promises.push(promise);
//   }
// const result = await Promise.all(promises);
// const status = result.every(
//   (i) =>
//     Number(i.totalOnBudgetStr) === 0 ||
//     (i.totalOnProduct || i.totalOnCampaign) === 0
// );
// if (status) {
//   return {
//     result: false,
//     message:
//       `<b>无付费引流：</b>` +
//       `当前未开启任何付费营销广告，建议开启推广，拓展付费流量。`,
//   };
// } else {
//   const accountInfo = await getAccountInfo(_csrf);
//   const { searchPromotion, recommendPromotion } = accountInfo;
//   if (Number(searchPromotion) === 0 && Number(recommendPromotion) === 0) {
//     return {
//       result: false,
//       message: `<b>当前直通车账户余额为0。</b>`,
//     };
//   }
//   return getMarketingAdvertising(result, _csrf);
// }
// return {
//   result: true,
//   message: ""
// }
// }
async function getKeyWordPlan() {
  const arr = [];
  let keywordParams;
  if (marketingPlanList && marketingPlanList.some((i) => i.type !== 1)) {
    if (advertisingList && advertisingList.length > 0) {
      for (const item of advertisingList) {
        if (item.key === 1) {
          keywordParams = {
            budget: item.totalOnBudgetStr,
            key: 1,
            title: "关键词推广",
          };
          break;
        }
      }
    }
    if (keywordParams && isObject(keywordParams)) {
      const keywordPlan = await getPlansTotalList("", dynamicCsrf, true);
      if (keywordPlan) {
        arr.push(Object.assign(keywordPlan, keywordParams));
      }
    }
  }
  return arr;
}
async function getPromotionTimeResult() {
  let arr = await getKeyWordPlan();
  for (const plan of marketingPlanList) {
    const result = await getPlansTotalList(plan.id, dynamicCsrf);
    if (result) {
      const mergeResult = Object.assign(result, plan);
      arr.push(mergeResult);
    }
  }
  if (arr.length > 0) {
    arr = arr.filter((i) => i.cost > 0 && i.onlineHours > 0);
    const lowPromotionTimes = [];
    const lowBudgetRates = [];
    const upPromotionTimes = [];
    const upBudgetRates = [];
    for (const item of arr) {
      const { cost, onlineHours, budget, title } = item;
      const onlineHours7Days = (onlineHours / 7).toFixed(2);
      const budgetRate = (cost / (7 * budget)).toFixed(2);
      if (onlineHours7Days < 20) {
        lowPromotionTimes.push({ title, onlineHours7Days });
      } else {
        upPromotionTimes.push({ title, onlineHours7Days });
      }
      if (budgetRate < 0.8) {
        lowBudgetRates.push({ title, budgetRate });
      } else {
        upBudgetRates.push({ title, budgetRate });
      }
    }
    if (lowPromotionTimes.length > 0 || lowBudgetRates.length > 0) {
      let lowPromotionTimesMessage = "";
      let lowBudgetRatesMessage = "";
      if (lowPromotionTimes.length > 0) {
        for (const item of unique(lowPromotionTimes, "title")) {
          lowPromotionTimesMessage += `${item.title}近七天平均每日推广时长为${item.onlineHours7Days}小时；`;
        }
        return {
          result: false,
          message:
            `<b>推广时长过短：</b>` +
            lowPromotionTimesMessage +
            `小于一般要求的20小时。建议及时调整出价，让钱不要过快花完无法覆盖到目标国家上班时间。`,
          lowPromotionTimes,
        };
      }
      if (lowBudgetRates.length > 0) {
        for (let item of unique(lowBudgetRates, "title")) {
          item.budgetRate = (item.budgetRate * 100).toFixed(2) + "%";
          lowBudgetRatesMessage += `${item.title}近7天预算执行率为${item.budgetRate}；`;
        }
        return {
          result: false,
          message:
            `<b>付费点击较少：</b>` +
            lowBudgetRatesMessage +
            `小于一般要求的80%。建议及时调整出价，带来足够的点击量，否则只迎来曝光，可能会拉低点击率。`,
          lowBudgetRates,
        };
      }
      if (lowPromotionTimes.length > 0 && lowBudgetRates.length > 0) {
        return {
          result: false,
          message:
            `<b>1、推广时长过短：</b>` +
            lowPromotionTimesMessage +
            `小于一般要求的20小时。建议及时调整出价，让钱不要过快花完无法覆盖到目标国家上班时间。` +
            `<b>2、付费点击较少：</b>` +
            lowBudgetRatesMessage +
            `小于一般要求的80%。建议及时调整出价，带来足够的点击量，否则只迎来曝光，可能会拉低点击率。`,
          lowPromotionTimes,
          lowBudgetRates,
        };
      }
    } else {
      const promotionTimesTitle = upPromotionTimes.map((i) => i.title);
      const onlineHours7Days = upPromotionTimes.map((i) => i.onlineHours7Days);
      const budgetRate = upBudgetRates.map(
        (i) => (i.budgetRate * 100).toFixed(2) + "%"
      );
      let message = "";
      promotionTimesTitle.forEach((item, index) => {
        message += `近7天${item}时长日均为${onlineHours7Days[index]}小时，预算执行率为${budgetRate[index]};`;
      });
      return {
        result: true,
        message,
      };
    }
  }
  return {
    result: false,
    message: "",
  };
}
async function getClickRate() {
  let arr = await getKeyWordPlan();
  for (const plan of marketingPlanList) {
    const result = await getPlansTotalList(plan.id, dynamicCsrf);
    if (result) {
      const mergeResult = Object.assign(result, plan);
      arr.push(mergeResult);
    }
  }
  if (arr.length > 0) {
    const lowRate7Day = arr.filter((i) => i.click / i.impr < 0.005);
    if (lowRate7Day.length > 0) {
      const title = arrMapToString(lowRate7Day, "title");
      const rate = lowRate7Day
        .map((i) => ((i.click / i.impr) * 100).toFixed(2) + "%")
        .filter((i) => i)
        .join(",");
      let message = "";
      for (const item of unique(lowRate7Day, "title")) {
        message += `${item.title}点击率为${toPercent(
          item.click / item.impr
        )}%；`;
      }
      return {
        result: false,
        message:
          `<b>点击率过低：</b>` +
          message +
          `小于一般要求0.5%。建议在后台或AI操盘手查看具体高曝光低点击词，根据实际情况调整(暂停关键词或添加屏蔽词)，或关闭拓展匹配。`,
        title,
        rate,
      };
    }
    const upRate7Day = arr.filter((i) => i.click / i.impr > 0.005);
    if (upRate7Day.length > 0) {
      const title = arrMapToString(arr, "title");
      const rate = arrMapToStringRate(arr, "ctr");
      let message = "";
      for (const item of arr) {
        message += `${item.title}点击率为${toPercent(item.ctr)}%；`;
      }
      return {
        result: true,
        message: `近7天，` + message + `无明显问题，请继续每周二监控数据。`,
        title,
        rate,
      };
    }
    return {
      result: false,
      message: "",
    };
  }
  return {
    result: false,
    message: "",
  };
}
async function getAllPlansList() {
  const mainId = 110101;
  const mainTypes = [2, 4, 6, 7, 8, 10, 11, 21, 21, 22, 23];
  const mainPlans = await getPlansListTemplate(mainId, mainTypes);
  if (mainPlans && mainPlans.length > 0) {
    marketingPlanList.push(...mainPlans);
  }
  const otherId = 110103;
  const otherTypes = [15, 16];
  const otherPlans = await getPlansListTemplate(otherId, otherTypes);
  if (otherPlans && otherPlans.length > 0) {
    marketingPlanList.push(...otherPlans);
  }
}
async function getPlansListTemplate(productLineId, typeList) {
  const url = "https://www2.alibaba.com/api/campaign";
  const form = {
    type: "normal",
    ads: `{"productLineId":${productLineId}}`,
    data: `{"page":1,"size":10000,"typeList":[${typeList}]}`,
    _csrf,
  };
  return axios({
    url,
    method: "post",
    data: qs.stringify(form),
  })
    .then((res) => {
      return res.data.data
        .filter((i) => i.onlineStatus === 1)
        .map((i) => {
          return {
            id: i.id,
            title: i.title,
            budget:
              i.properties && i.properties.budget ? i.properties.budget : 0,
            type: i.type,
          };
        });
    })
    .catch((err) => {
      console.log(`获取getPlansList出错了:${err}`);
    });
}
function getDynamicCsrf() {
  const url = `https://www2.alibaba.com/napi/csrf/get`;
  const params = {
    type: "normal",
    ads: `{"productLineId":110101}`,
    data: {},
  };
  return axios({
    url,
    method: "get",
    params,
  })
    .then((res) => {
      const {
        data: {
          data: { token },
        },
      } = res;
      if (token) {
        dynamicCsrf = token;
      }
    })
    .catch((err) => {
      console.log(`获取getDynamicCsrf出错:${err}`);
    });
}
async function getFinishPlansList() {
  if (marketingPlanList && marketingPlanList.length > 0) {
    for (const plan of marketingPlanList) {
      const result = await getPlanCount(plan);
      if (result > 0) {
        plan.counts = result;
      }
    }
    marketingPlanList = marketingPlanList.filter((i) => i.counts);
  }
}
async function getPlanCount(plan) {
  const url = `https://www2.alibaba.com/api/campaign/adgroup/count`;
  let productLineId = 110101;
  if (plan.type === (15 || 16)) {
    productLineId = 110103;
  }
  const form = {
    type: "normal",
    ads: `{"productLineId":${productLineId}}`,
    data: `{"adgroupOnlineStatus":1,"campaignIdList":[${plan.id}]}`,
    _csrf,
  };
  return axios({
    url,
    method: "post",
    data: qs.stringify(form),
  })
    .then((res) => {
      const result = getNested(res, "data", "data");
      if (result && result[plan.id]) {
        return result[plan.id];
      }
      return 0;
    })
    .catch((err) => {
      console.log(`获取getPlanCount出错了:${err}`);
    });
}
// async function getKeywordPlanList(_csrf) {
//   const url = "https://www2.alibaba.com/napi/report/account"
//   const dateBegin = moment().subtract(8,'days').format("YYYY-MM-DD")
//   const dateEnd = moment().subtract(2, 'days').format("YYYY-MM-DD")
//   const form = {
//     type: "normal",
//     ads: `{"productLineId":110101}`,
//     data: `{"campaignType":1,"dateBegin":"${dateBegin}","dateEnd":"${dateEnd}"}`,
//     _csrf
//   }
//   return axios({
//     url,
//     method: "post",
//     data: qs.stringify(form)
//   })
// }
async function getPlansTotalList(id, _csrf, isKeywordPlan = false) {
  const url = "https://www2.alibaba.com/napi/report/account";
  const dateBegin = moment().subtract(8, "days").format("YYYY-MM-DD");
  const dateEnd = moment().subtract(2, "days").format("YYYY-MM-DD");
  const form = {
    type: "normal",
    ads: `{"productLineId":110101}`,
    _csrf,
  };
  let data;
  if (isKeywordPlan) {
    data = {
      ...form,
      data: `{"campaignType":1,"dateBegin":"${dateBegin}","dateEnd":"${dateEnd}"}`,
    };
  } else {
    data = {
      ...form,
      data: `{"pageIndex":1,"campaignId":${id},"dateBegin":"${dateBegin}","dateEnd":"${dateEnd}"}`,
    };
  }
  return axios({
    url,
    method: "post",
    data: qs.stringify(data),
  })
    .then((res) => {
      let {
        data: { data },
      } = res;
      const result = {
        cost: 0,
        onlineHours: 0,
        impr: 0,
        ctr: 0,
        click: 0,
      };
      if (data && isArray(data) && data.length > 0) {
        for (const item of data) {
          result.cost += item.cost;
          result.onlineHours += item.onlineHours;
          result.impr += item.impr;
          result.ctr += item.ctr;
          result.click += item.click;
        }
        return result;
      }
      return null;
    })
    .catch((err) => {
      console.log(`获取失败:${err}`);
    });
}
async function getFlowReport(type, _csrf, item) {
  const url = `https://www2.alibaba.com/api/report/${type}`;
  const dateEnd = moment().subtract(2, "days").format("YYYY-MM-DD");
  const form = {
    type: "normal",
    ads: `{"productLineId":110101}`,
    data: `{"pageIndex":1,"pageSize":1000,"campaignId":${item.id},"orderField":"impr","orderType":"desc","dateRange":7,"dateEnd":"${dateEnd}"}`,
    _csrf,
  };
  return axios({
    url,
    method: "post",
    data: qs.stringify(form),
  })
    .then((res) => {
      const {
        data: { data },
      } = res;
      if (data && isArray(data) && data.length > 0) {
        return data
          .filter((i) => i.ctr < 0.002 && i.impr > 700)
          .map((m) => {
            return {
              ctr: m.ctr,
              impr: m.impr,
              keyword: m.keyword,
              title: item.title,
            };
          });
      }
      return [];
    })
    .catch((err) => {
      console.log(`获取getKeywordList出错了:${err}`);
    });
}
async function getKeywordList() {
  const arr = [];
  for (const item of marketingPlanList) {
    const keywords = await getFlowReport("keyword", _csrf, item);
    const searchWords = await getFlowReport("searchword", _csrf, item);
    arr.push([...keywords, ...searchWords]);
  }
  const result = arr.flat();
  if (result.length > 0) {
    const titles = result.map((i) => i.title);
    const titleSetList = [...new Set(titles)];
    const data = [];
    for (const title of titleSetList) {
      const keywords = result
        .filter((i) => i.title === title)
        .map((i) => {
          return {
            ctr: i.ctr,
            keyword: i.keyword,
          };
        });
      data.push({ title, keywords });
    }
    let message = `<b>存在点击率异常词：</b>` + `<br/>`;
    for (const item of unique(data, "keywords")) {
      message +=
        `<b>${item.title}</b>` +
        `近七天，关键词${arrMapToString(
          item.keywords,
          "keyword"
        )}点击率${arrMapToStringRate(item.keywords, "ctr")}；` +
        `<br/>`;
    }
    return {
      result: false,
      message,
      value: result.map((i) => i.keyword),
    };
  }
  return {
    result: true,
    message: `当前并未发现点击率异常词。`,
  };
}
// async function getThreeStarLowRate(ctoken) {
//   let promotionList = [];
//   if (advertisingList && advertisingList.length > 0) {
//     promotionList = advertisingList.map((i) => i.title);
//   }
//   if (promotionList.includes("关键词推广")) {
//     const total = await getManageAdKeywordTotal(ctoken, "all");
//     const threeStarLowTotal = await getManageAdKeywordTotal(ctoken, "2,1,0");
//     const percent = ((threeStarLowTotal / total) * 100).toFixed(2) + "%";
//     if (threeStarLowTotal / total > 0.3) {
//       return {
//         result: false,
//         message:
//           `<b>低星级关键词过多：</b>` +
//           `当前，关键词推广启动状态中0,1,2星关键词占比为${percent}，大于一般要求30%。建议新发产品覆盖关键词，做好搜索流量的基础覆盖。`,
//         total,
//         threeStarLowTotal,
//       };
//     }
//     return {
//       result: true,
//       message: `当前，关键词推广启动推广中0,1,2星关键词占比为${percent}。`,
//       total,
//       threeStarLowTotal,
//     };
//   }
//   return {
//     result: false,
//     message: "",
//   };
// }
async function getNoSetArea() {
  if (advertisingList && advertisingList.length > 0) {
    const marketPlans = marketingPlanList.filter((i) =>
      advertisingList.some((item) => i.type === item.key)
    );
    const promiseNames = [];
    if (marketPlans.length > 0) {
      for (const item of marketPlans) {
        const crowdResult = getMarketingTag(item, _csrf, "crowd");
        promiseNames.push(crowdResult);
        const regionResult = getMarketingTag(item, _csrf, "region");
        promiseNames.push(regionResult);
      }
      const names = [...new Set(await Promise.all(promiseNames))];
      const nameStr = names.filter((i) => isString(i));
      let count = 0;
      const nameObjs = names.filter((i) => isObject(i));
      if (nameObjs && nameObjs.length > 0) {
        for (const item of nameObjs) {
          count += item.number;
        }
      }
      if (nameStr.length > 0) {
        return {
          result: false,
          message:
            `<b>未设置地域或人群溢价：</b>` +
            `当前，${nameStr.join(
              ","
            )}未设置地域或人群溢价。建议到阿里后台设置，能够校准后期引入流量。`,
        };
      }
      return {
        result: true,
        message: "当前营销广告推广方案均设置好地域或人群溢价。",
        nameStr,
        count,
      };
    }
    return {
      result: false,
      message: "",
    };
  }
  return {
    result: false,
    message: "",
  };
}
// async function getManageAdKeyword() {
//   const url = `https://www2.alibaba.com/manage_ad_keyword.htm`;
//   return axios({
//     url,
//     method: "get",
//   })
//     .then((res) => {
//       res = res.data;
//       const startId = "'_dt_p4p_id_':'";
//       const endId = "',";
//       const startToken = "'_csrf_token_': '";
//       const endToken = "'";
//       const dtP4pIdContent = res.substring(res.indexOfEnd(startId));
//       const dtP4pId = dtP4pIdContent.substring(
//         0,
//         dtP4pIdContent.indexOf(endId)
//       );

//       const csrfTokenContent = res.substring(res.indexOfEnd(startToken));
//       const csrfToke = csrfTokenContent.substring(
//         0,
//         csrfTokenContent.indexOf(endToken)
//       );
//       return { dtP4pId, csrfToke };
//     })
//     .catch((err) => {
//       console.log(`获取getManageAdKeyword失败:${err}`);
//     });
// }
// async function getManageAdKeywordTotal(ctoken, qsStar) {
//   const manageAdKeyword = await getManageAdKeyword();
//   const { dtP4pId, csrfToke } = manageAdKeyword;
//   const url = `https://www2.alibaba.com/asyGetAdKeyword.do`;
//   const params = {
//     ctoken,
//     dmtrack_pageid: "",
//   };
//   const form = {
//     json: `{"status":"in_promotion","cost":"all","click":"all","exposure":"all","cpc":"all","qsStar":"${qsStar}","kw":"","isExact":"N","date":7,"tagId":-1,"delayShow":false,"recStrategy":1,"recType":"recommend"}`,
//     _dt_p4p_id_: dtP4pId,
//     _csrf_token_: csrfToke,
//     dmtrack_pageid: "",
//   };
//   return axios({
//     url,
//     method: "post",
//     params,
//     data: qs.stringify(form),
//   })
//     .then((res) => {
//       return res.data.totalCount;
//     })
//     .catch((err) => {
//       console.log(`获取getManageAdKeywordTotal出错了:${err}`);
//     });
// }
async function getMarketingTag(item, _csrf, type) {
  const url = `https://www2.alibaba.com/api/campaign/${item.id}/tag`;
  let productLineId = 110101;
  if (item.type === (15 || 16)) {
    productLineId = 110103;
  }
  const form = {
    type: "normal",
    ads: `{"productLineId":${productLineId}}`,
    data: `{"scope":["${type}"]}`,
    _csrf,
  };
  return axios({
    url,
    method: "post",
    data: qs.stringify(form),
  })
    .then((res) => {
      const {
        data: { data },
      } = res;
      if (data && data.length === 0) {
        return item.title;
      }
      return {
        title: item.title,
        number: data.length,
      };
    })
    .catch((err) => {
      console.log(`获取getMarketingTag出错:${err}`);
    });
}
async function getBidWordQueryTitle(item, _csrf) {
  const url = `https://www2.alibaba.com/api/campaign/${item.id}/bidword/query`;
  const now = moment(new Date()).format("YYYY-MM-DD");
  const beginDate = moment(now).subtract(8, "days").format("YYYY-MM-DD");
  const endDate = moment(now).subtract(2, "days").format("YYYY-MM-DD");
  const form = {
    type: "normal",
    ads: `{"productLineId":110101}`,
    data: `{"beginDate":"${beginDate}","endDate":"${endDate}"}`,
    _csrf,
  };
  return axios({
    url,
    method: "post",
    data: qs.stringify(form),
  })
    .then((res) => {
      const {
        data: { data },
      } = res;
      if (data && data.length === 0) {
        return item.title;
      }
      return {
        title: item.title,
        count: data.length,
      };
    })
    .catch((err) => {
      console.log(`获取getBidWordQueryTitle出错:${err}`);
    });
}
async function getBidWordQuery() {
  if (advertisingList && advertisingList.length > 0) {
    const marketPlans = marketingPlanList.filter((i) =>
      advertisingList.some((item) => i.type === item.key)
    );
    if (marketPlans.length > 0) {
      const arr = [1, 4, 6, 16];
      const promises = [];
      for (const item of marketPlans) {
        if (arr.includes(item.type)) {
          // 去除没有自选关键词的方案
          continue;
        }
        const promise = getBidWordQueryTitle(item, _csrf);
        promises.push(promise);
      }
      const result = await Promise.all(promises);
      const names = result.filter((i) => isString(i));
      if (names.length > 0) {
        return {
          result: false,
          message:
            `<b>未添加自选关键词：</b>` +
            `当前${names.join(
              ","
            )}未添加自选关键词。建议到阿里后台添加相关产品的准确关键词，能够校准后期引入流量。`,
          names,
        };
      } else {
        const marketing = result.filter((i) => isObject(i));
        return {
          result: true,
          message: `当前营销广告推广方案均已添加自选关键词`,
          marketing,
        };
      }
    }
    return {
      result: false,
      message: "",
    };
  }
  return {
    result: false,
    message: "",
  };
}
async function getShieldKeywordList(item, _csrf) {
  const url = `https://www2.alibaba.com/api/campaign/${item.id}/forbidden/keyword`;
  const form = {
    type: "normal",
    ads: `{"productLineId":110101}`,
    data: `{}`,
    _csrf,
  };
  return axios({
    url,
    method: "post",
    data: qs.stringify(form),
  })
    .then((res) => {
      const {
        data: { data },
      } = res;
      if (data && data.length === 0) {
        return item.title;
      }
      return {
        title: item.title,
        count: data.length,
      };
    })
    .catch((err) => {
      console.log(`获取getShieldKeywordList出错:${err}`);
    });
}
async function getShieldKeywordCount() {
  if (advertisingList && advertisingList.length > 0) {
    const marketPlans = marketingPlanList.filter((i) =>
      advertisingList.some((item) => i.type === item.key)
    );
    const promises = [];
    if (marketPlans.length > 0) {
      for (const item of marketPlans) {
        if (item.type === (15 || 16)) {
          continue;
        }
        const promise = getShieldKeywordList(item, _csrf);
        promises.push(promise);
      }
      const result = await Promise.all(promises);
      const names = result.filter((i) => isString(i));
      if (names.length > 0) {
        return {
          result: false,
          message:
            `<b>未添加屏蔽词：</b>` +
            `当前，${names.join(
              ","
            )}未添加屏蔽词。建议定期查看流量报告-词报告-搜索词报告，及时发现不精准的点击词，添加至屏蔽词库中。`,
          names,
        };
      } else {
        const marketing = result.filter((i) => isObject(i));
        return {
          result: true,
          message: `当前营销广告推广方案均均已添加屏蔽词`,
          marketing,
        };
      }
    }
    return {
      result: true,
      message: "",
    };
  }
  return {
    result: true,
    message: "",
  };
}
async function get4WeedReferralTrafficList(ctoken) {
  const promises = [];
  for (let i = 1; i < 5; i++) {
    const promise = get1WeedReferralTrafficList(ctoken, i);
    promises.push(promise);
  }
  const data = {
    searchClicks: 0,
    shopPv: 0,
  };
  const result = await Promise.all(promises);
  for (const item of result) {
    data.searchClicks += item.searchClicks;
    data.shopPv += item.shopPv;
  }
  return data;
}
function get1WeedReferralTrafficList(ctoken, selected) {
  const url = `https://hz-mydata.alibaba.com/self/.json`;
  const params = {
    action: "OneAction",
    iName: "vip/home/custom/getShopSummary",
    statisticsType: "week",
    selected,
    terminalType: "total",
    isMyselfUpgraded: true,
    statisticType: "os",
    region: "os",
    seperateByCate: false,
    isVip: true,
    ctoken,
  };
  return axios({
    url,
    method: "get",
    params,
  })
    .then((res) => {
      const {
        data: { data },
      } = res;
      if (data && isArray(data.returnValue) && data.returnValue.length > 0) {
        const { shopPv, searchClicks } = data.returnValue[0];
        return {
          shopPv: shopPv ? shopPv.value : 0,
          searchClicks: searchClicks ? searchClicks.value : 0,
        };
      }
      return {
        shopPv: 0,
        searchClicks: 0,
      };
    })
    .catch((err) => {
      console.log(`获取get1WeedReferralTrafficList出错:${err}`);
    });
}
async function getExplosiveGoodsPromise(ctoken) {
  const csrf = await getExplosiveGoodsCsrf();
  const url = `https://hz-productposting.alibaba.com/product/managementproducts/asyCountProductsForPowerTabs.do`;
  const params = {
    ctoken,
    _csrf_token_: csrf,
  };
  return axios({
    url,
    method: "get",
    params,
  })
    .then((res) => {
      const {
        data: { data },
      } = res;
      if (data && data.superHighQuality) {
        return data.superHighQuality;
      }
      return 0;
    })
    .catch((err) => {
      console.log(`获取getExplosiveGoodsPromise出错:${err}`);
    });
}
function getExplosiveGoodsCsrf() {
  return axios({
    url: `https://hz-productposting.alibaba.com/product/product_grow_up_manage.htm`,
    method: "get",
  })
    .then((res) => {
      res = res.data;
      const start = "csrf_token_ : '";
      const end = "'},";
      const main = res.substring(res.indexOfEnd(start));
      const csrf = main.substring(0, main.indexOf(end));
      if (csrf) {
        return csrf;
      }
      return null;
    })
    .catch((err) => {
      console.log(`获取getExplosiveGoodsCsrf:${err}`);
    });
}
function get4WeekProductCount(ctoken, selected) {
  const url = "https://hz-mydata.alibaba.com/self/.json";
  let params = {
    action: "OneAction",
    iName: "vip/home/getAccountsAndTotal",
    ctoken,
    statisticType: "os",
    region: "os",
    isVip: true,
    statisticsType: "week",
    selected,
  };
  return axios({
    url,
    method: "get",
    params,
  })
    .then((res) => {
      const total = getNested(res, "data", "data", "total");
      if (total) {
        const { newProductCount = 0, alterProductCount = 0 } = total;
        return {
          newProductCount,
          alterProductCount,
        };
      }
      return {
        newProductCount: 0,
        alterProductCount: 0,
      };
    })
    .catch((err) => {
      console.log(`获取近4周员工数据出错:${err}`);
    });
}
async function getAccountsData(ctoken) {
  const promises = [];
  for (let i = 1; i < 5; i++) {
    const weekData = get4WeekProductCount(ctoken, i);
    promises.push(weekData);
  }
  const result = await Promise.all(promises);
  const product = {
    newProductCount: 0,
    alterProductCount: 0,
  };
  for (const item of result) {
    product.newProductCount += Number(item.newProductCount);
    product.alterProductCount += Number(item.alterProductCount);
  }
  return product;
}
// async function getPotentialProductPage(ctoken, page) {
//   const url = ALI_REPORT.getAliExcellentProduct;
//   const params = {
//     ctoken,
//   };
//   const data = {
//     imageType: "all",
//     status: "approved",
//     displayStatus: "on",
//     uiAdvanceSearch: true,
//     page,
//     size: 50,
//     notLightCustom: "N",
//     notRts: "N",
//     notSpecific: "N",
//     notSample: "N",
//     showPowerScore: true,
//     productKeyword: "",
//     productType: "",
//     powerScoreLayer: "potential",
//     prodPowerScore: "desc",
//   };
//   return axios({
//     url,
//     method: "post",
//     params,
//     data: qs.stringify(data),
//   }).then((res) => {
//     if (res.data && res.data.products.length > 0) {
//       return res.data.products.map((i) => i.powerScoreFeature.prodPowerScore);
//     }
//   });
// }
const aliService = {
  async init() {
    await getCsrf();
    await getShowcaseCsrf();
    await getCsrfToken();
    await getContentCsrf();
    // finalStar = 0;
    buyerReviewScore = 0;
    nextLevelReviewScore = 0;
    // replyRate = 0.8;
    // exceptionProduct = [];
    monthInquiryTotalCount = undefined;
    // monthInquireMostProductCount = undefined
  },
  async checkShopIntegrity() {
    let progress = await shopIntegrityPromise();
    if (progress < 100) {
      return {
        result: false,
        message:
          `<b>店铺信息不完整：</b>` +
          `当前，店铺信息完整度为${progress}%。建议完善信息至100%。`,
        value: progress,
      };
    }
    return {
      result: true,
      message: "",
      progress,
    };
  },
  async checkNoEffectProduct(ctoken) {
    const noEffectProductCount = await noEffectProductPromise(ctoken);
    const shelfProductCount = await shelfProductPromise(ctoken);
    const scale = numberToPercent(noEffectProductCount / shelfProductCount);
    if (shelfProductCount > 0) {
      if (
        noEffectProductCount > 50 &&
        noEffectProductCount / shelfProductCount > 0.05
      ) {
        return {
          result: false,
          message:
            `<b>150天以上零效果产品过多：</b>` +
            `当前，存在150天以上零效果产品${noEffectProductCount}个，占比${scale}%。过多的零效果产品，可能会对店铺权重有影响，建议及时对其重新发布并删除，以获得新品权重扶持。`,
          noEffectProductCount,
        };
      } else {
        return {
          result: true,
          message: `当前，存在150天以上零效果产品${noEffectProductCount}个，暂不会对店铺权重造成影响，可尽快优化。`,
          noEffectProductCount,
        };
      }
    }
    return {
      result: false,
      message: `获取已上架产品失败，或者没有已上架产品。`,
      value: 0,
    };
  },
  async checkProblemProduct(ctoken) {
    const problemProductCount = await problemProductPromise(ctoken);
    if (problemProductCount && problemProductCount.length > 0) {
      for (let item of problemProductCount) {
        if (item.title.includes("（")) {
          item.title = item.title.substring(0, item.title.indexOf("（"));
        }
      }
      let message = `<b>存在问题产品：</b>` + `当前存在`;
      for (const item of problemProductCount) {
        message += `${item.title}产品${item.count}个;`;
      }
      return {
        result: false,
        message:
          message +
          `问题产品将会被降权，请及时` +
          `<a style="color: #3da8f5;" href="https://searchstaff.alibaba.com/diagnosis/orderProductDetail.htm?spm=a2700.7756200.0.0.66c771d2SMmQOW" target="_blank">进行优化</a>` +
          ``,
        problemProductCount,
      };
    } else {
      return {
        result: true,
        message: `当前店铺不存在问题产品，请继续保持。`,
        problemProductCount,
      };
    }
  },
  async checkVideoProduct(ctoken) {
    let videoProductCount = await videoProductPromise(ctoken);
    if (videoProductCount < 20) {
      return {
        result: false,
        message:
          `<b>绑定视频的产品过少：</b>` +
          `当前店铺视频产品${videoProductCount}，数量较少。建议针对主推产品拍摄视频进行上传关联不低于20个产品。`,
        value: videoProductCount,
      };
    } else {
      return {
        result: true,
        message: `当前视频产品数${videoProductCount}个，请继续保持。`,
        value: videoProductCount,
      };
    }
  },
  async checkWindowOperation() {
    if (!showcaseCsrf) {
      await getShowcaseCsrf();
    }
    if (csrf && csrf.length > 100) {
      return {};
    }
    let { invalidCount, sumRemain } = await windowStatPromise();
    let now = moment(new Date()).format("YYYY-MM-DD");
    let promiseAll = [];
    for (let i = 1; i < 31; i++) {
      let sameDate = moment(now).subtract(i, "days").format("YYYY-MM-DD");
      promiseAll.push(windowLogNewPromise(sameDate, sameDate));
    }
    let windowLogCount = await Promise.all(promiseAll).then((items) => {
      let total = 0;
      for (let item of items) {
        total += item;
      }
      return total;
    });
    if (windowLogCount === 0 || invalidCount > 0 || sumRemain > 0) {
      return {
        result: false,
        message:
          `<b>橱窗无操作</b>` +
          `（产品分析页面调整橱窗，无法获取相应数据）：当前空余橱窗数为${sumRemain}，无效产品${invalidCount}个，最近30天橱窗操作天数为${windowLogCount}。`,
        windowLogCount,
        invalidCount,
        sumRemain,
      };
    } else {
      return {
        result: true,
        message: `最近30天橱窗操作${windowLogCount}天，频次正常，请继续保持每月一次或每月2次的操作频率。`,
        windowLogCount,
        invalidCount,
        sumRemain,
      };
    }
  },
  async checkWindowInquiry(ctoken) {
    let monthTotalInquiryCount = await effectiveProductsInquiryPromise(
      ctoken,
      false
    );
    let monthTotalWindowInquiryCount = await effectiveProductsInquiryPromise(
      ctoken,
      true
    );
    if (monthTotalInquiryCount > 0) {
      let percent = toPercent(
        monthTotalWindowInquiryCount / monthTotalInquiryCount
      );
      if (percent < 30) {
        return {
          result: false,
          message:
            `<b>橱窗询盘占比较低：</b>` +
            `上月通过产品来的询盘共有${monthTotalInquiryCount}个，来自橱窗产品的询盘有${monthTotalWindowInquiryCount}个，占比${percent}%。`,
          monthTotalInquiryCount,
          monthTotalWindowInquiryCount,
        };
      } else {
        return {
          result: true,
          message: `上月通过产品来的询盘共有${monthTotalInquiryCount}个，来自橱窗产品的询盘有${monthTotalWindowInquiryCount}个，占比${percent}%`,
          monthTotalInquiryCount,
          monthTotalWindowInquiryCount,
        };
      }
    }
    return {
      result: false,
      message: `上月通过产品来的询盘共有0个，来自橱窗产品的询盘有0个，占比0%。橱窗资源利用率较低，正常橱窗产品询盘占比应该在30%以上。`,
      monthTotalInquiryCount,
      monthTotalWindowInquiryCount,
    };
  },
  async checkNatualRank(param, ctoken) {
    if (!csrf) {
      await getCsrf();
    }
    if (!showcaseCsrf) {
      await getShowcaseCsrf();
    }
    await getCsrfToken();

    if (csrfToken && csrfToken.length > 100) {
      return {};
    }
    if (param && param.keywordArr && param.keywordArr.length > 0) {
      //重点关键词
      let keywordArr = param.keywordArr;
      return this.getKeywordRankByWindowOrKeywordArr(
        keywordArr,
        "importantOrWindow",
        "important"
      );
    } else {
      //橱窗关键词
      let productDetailArr = await windowProductDetailPromise();
      let productPromiseAll = [];
      if (productDetailArr.length > 0) {
        for (let productId of productDetailArr) {
          productPromiseAll.push(windowKeywordPromise(productId, ctoken));
          await delay(500);
        }
        let keywordArr = await Promise.all(productPromiseAll).then((items) => {
          let set = new Set();
          for (let item of items) {
            for (let keyword of item) {
              set.add(keyword);
            }
          }
          return set;
        });
        return this.getKeywordRankByWindowOrKeywordArr(
          keywordArr,
          "importantOrWindow",
          "window"
        );
      }
    }
    return {};
  },
  // eslint-disable-next-line no-unused-vars
  async getKeywordRankByWindowOrKeywordArr(keywordArr, type, flag) {
    let keywordPromiseAll = [];
    let keywordPartition = partition(Array.from(keywordArr), 50);
    for (let i = 0; i < keywordPartition.length; i++) {
      for (let keyword of keywordPartition[i]) {
        keywordPromiseAll.push(
          this.getRankByKeyword({ queryString: keyword }, 0, type)
        );
      }
      await delay(5000);
    }
    let top1RankCount = await Promise.all(keywordPromiseAll).then((items) => {
      let totalCount = 0;
      for (let item of items) {
        totalCount += item;
      }
      return totalCount;
    });
    let length = !keywordArr.size ? keywordArr.length : keywordArr.size;
    let percent = toPercent(top1RankCount / length);
    if (percent < 70) {
      let message =
        `<b>自然排名不佳：</b>` +
        `当前有较多热度关键词排名未上首页，首页关键词占比约为${percent}%。`;
      return {
        result: false,
        message,
        value: percent,
      };
    } else {
      let message = `当前重点关键词首页排名占比${percent}%。`;
      return {
        result: true,
        message,
        value: percent,
      };
    }
  },
  async checkCreditGuarantee(ctoken) {
    /*let now = moment(new Date()).format("YYYY-MM-DD");
    let endTime = moment(now).subtract(1, 'days').format('YYYY-MM-DD');
    let startTime = moment(now).subtract(30, 'days').format('YYYY-MM-DD');
    let totalCount = await last30DayCreditGuaranteeOrderPromise(startTime, endTime, ctoken);*/
    let totalCount = 0;
    let totalAmount = 0;
    for (let selected = 0; selected < 30; selected++) {
      let { count, amount } = await last30DayCreditGuaranteeOrderNewPromise(
        selected,
        ctoken
      );
      totalCount += count;
      totalAmount += amount;
    }
    // finalStar = await finalStarPromise()
    let { tradeAmount, avgAmount, nextLevel } = await shoeTradePromise();
    return { totalCount, totalAmount, tradeAmount, nextLevel, avgAmount };
    //
    // if (finalStar === 0 || totalCount === 0) {
    //   return {
    //     result: false,
    //     message: `最近30天信保单数为${totalCount}，实收金额为${totalAmount}美元。近90天信保实收金额${tradeAmount}美元，${nextLevel}星级同行平均金额为${avgAmount}美元。建议每月持续走单。`,
    //     finalStar,
    //     totalCount,
    //     tradeAmount,
    //     avgAmount
    //   }
    // } else {
    //   return {
    //     result: true,
    //     message: `最近30天信保单数为${totalCount}，实收金额为${totalAmount}美元。近90天信保实收金额${tradeAmount}美元，${nextLevel}星级同行平均金额为${avgAmount}美元。建议每月持续走单。`,
    //     finalStar,
    //     totalCount,
    //     tradeAmount,
    //     avgAmount
    //   }
    // }
  },
  async checkBuyerReviewScore() {
    await shoeTradePromise();
    if (buyerReviewScore < 4.8) {
      return {
        result: false,
        message:
          `<b>买家评价分过低：</b>` +
          `当前买家评价分为${buyerReviewScore}分，优秀同行为${nextLevelReviewScore}分，买家评价分是能够影响潜在买家购买意愿度的一项指标，建议引导下单用户给予5星好评。`,
        buyerReviewScore,
        nextLevelReviewScore,
      };
    }
    return {
      result: true,
      message: `当前，买家评价分为${buyerReviewScore}分。`,
    };
  },
  async checkAvgResponseTime(ctoken) {
    let {
      avgReplyAvgTime,
      someReplyAvgTime,
      maxAccount: { fullName, replyAvgTime },
    } = await lastMonthStaffStatsPromise(ctoken);
    if (avgReplyAvgTime > 8 || someReplyAvgTime) {
      return {
        result: false,
        message:
          `<b>平均回复时长过长：</b>` +
          `上月，账户整体平均回复时长为${avgReplyAvgTime}小时，其中${fullName}账号平均回复时长过长为${replyAvgTime}小时。建议收到询盘后8小时内及时回复。`,
      };
    }
    return {
      result: true,
      message: `上月，账户整体平均回复时长为${avgReplyAvgTime}小时。`,
    };
  },
  async checkRFQ(ctoken) {
    let totalConsumeCount = await rfqPromise(ctoken);
    if (totalConsumeCount > 0) {
      return {
        result: false,
        message:
          `<b>RFQ没有消耗完：</b>` +
          `上月RFQ有${totalConsumeCount}条过期未消耗。RFQ也是获取订单的一个重要的有效资源，应该重视，建议每日消耗1条，积累月登入操作数，下月系统会赠送额外资源。`,
        value: totalConsumeCount,
      };
    }
    return {};
  },
  async checkSubscription() {
    const result = await getSubscription();
    const { isCate, isKeyword } = result;
    if (!isCate && !isKeyword) {
      return {
        result: false,
        message:
          `<b>RFQ没有设置商机订阅：</b>` +
          `当前商机订阅未设置。建议登入RFQ市场，绑定5个类目，若干精准关键词（不超过24个），以校准系统推荐。`,
      };
    }
  },
  async checkVisitorMarketing() {
    // let end = moment(new Date()).format("YYYY-MM-DD");
    // let start = moment(end).subtract(31, 'days').format('YYYY-MM-DD');
    // const endDate = await getEndDate(ctoken, start, end)
    // const startDate = moment(endDate).subtract(31, "days").format('YYYY-MM-DD');
    // const visitorMarketingCount = await visitorMarketingRatePromise(ctoken, startDate, endDate)
    // const visitor = await getVisitors(ctoken, startDate, endDate)
    // if (visitorMarketingCount === 0 && visitor > 0) {
    //   return {
    //     result: false,
    //     message: `<b>访客营销近31天未操作：</b>` + `近31天，可营销访客还有${visitor}个未营销，访客行为均有记录。建议根据访客历史行为，对其发送有针对性的开发信，增加获客机会。`,
    //   }
    // }
    return {};
  },
  // async checkTrueView(ctoken) {
  //   trueViewList = await getTrueViewListPromise(ctoken);
  //   if (trueViewList.length === 0) {
  //     return {
  //       result: false,
  //       message:
  //         `<b>True View上月未发布：</b>` +
  //         `上月TrueView发布数为0，作为app端的商家朋友圈，当前我们有发布动态的权限。建议定期发布工厂，公司，产品相关视频咨询，让潜在客户快速找到你，并给店铺带来场景推荐流量。`,
  //     };
  //   }
  //   return {
  //     result: true,
  //     count: trueViewList.length,
  //   };
  // },
  async getCategoryByKeyword(param, id) {
    let url = ALI.getAliCategoryByKeyword;
    return Axios({
      method: "get",
      url,
      params: param,
    })
      .then((res) => {
        if (res && Object.hasOwn(res, "success") && res.success) {
          if (param.language === "en_us") {
            let category = res.data.categories[0].name;
            return { keywordId: id, category: category };
          } else {
            let category = res.data.categories[0].name;
            return { keywordId: id, cnCategory: category };
          }
        }
        // console.log(JSON.stringify(res))
        // console.log("看到这个说明阿里限制: " + JSON.stringify(res));
        if (param.language === "en_us") {
          return { keywordId: id, category: "" };
        } else {
          return { keywordId: id, cnCategory: "" };
        }
      })
      .catch(() => {
        if (param.language === "en_us") {
          return { keywordId: id, category: "" };
        } else {
          return { keywordId: id, cnCategory: "" };
        }
      });
  },
  queryCategoryByKeyword(param) {
    let url = ALI.queryAliCategoryByKeyword;
    return Axios({
      method: "get",
      url,
      params: param,
    })
      .then((res) => {
        console.log(res);
        if (res && Object.hasOwn(res, "success") && res.success) {
          return res.data.categories.map((item) => {
            return {
              value: parseInt(item.catId),
              label: item.name,
            };
          });
        }
      })
      .catch(() => {
        return [];
      });
  },
  async getRankByKeyword(data, id, type, retry) {
    if (!csrf) {
      await getCsrf();
    }
    let DOUBLE_TRAFFIC = "doubleTraffic";
    let errorRank = { keywordId: id, keyword: data.queryString, rank: -1 };
    let noRank = { keywordId: id, keyword: data.queryString, rank: 0 };
    let url = ALI.getAliRankByKeyword;
    const form = new FormData();
    form.append("queryString", data.queryString);
    form.append("_csrf_token_", csrf);
    return Axios({
      method: "post",
      url,
      data: form,
      headers: headers(form),
    })
      .then((res) => {
        let parser = new DOMParser();
        let parsedHtml = parser.parseFromString(res, "text/html");
        let searchResult = parsedHtml.querySelectorAll(".search-result");
        let text = searchResult[0].innerText;
        if (text.trim() === MESSAGE) {
          if (type && type === "importantOrWindow") {
            //自然排名为首页的进行统计
            return 0;
          }
          if (type && type === DOUBLE_TRAFFIC) {
            //双流量
            return {
              keyword: data.queryString,
              result: [],
            };
          }
          return { success: false, message: MESSAGE };
        }
        let rankArr = parsedHtml.querySelectorAll(
          "#rank-searech-table tbody tr .ranking"
        );
        if (rankArr.length === 0) {
          if (type && type === "importantOrWindow") {
            //自然排名为首页的进行统计
            return 0;
          }
          if (type && type === DOUBLE_TRAFFIC) {
            //双流量
            return {
              keyword: data.queryString,
              result: [],
            };
          }
          return noRank;
        }
        let trArr = parsedHtml.querySelectorAll("#rank-searech-table tbody tr");
        let result = [];
        let p4pProductFound = false;
        let normalProductFound = false;
        for (let item of trArr) {
          if (type && type === DOUBLE_TRAFFIC) {
            let product = item.querySelector(".products");
            let productName =
              product.querySelectorAll(":scope > a")[0].innerText;
            let ranking = item.querySelector(".ranking a").innerText;
            let productImg = product
              .querySelector(":scope > div > a > img")
              .getAttribute("src")
              .replace("_50x50.jpg", "");
            let re = /\d+/gi;
            let rankArr = ranking.match(re);
            let rank, rankIndex, type;
            if (rankArr && rankArr.length > 1) {
              rank = parseInt(rankArr[0]);
              rankIndex = parseInt(rankArr[1]);
            }
            let charge = item.querySelector(".charge span");
            if (charge && charge.innerText.indexOf("P4P产品") !== -1) {
              type = "p4pProduct";
            } else {
              type = "normalProduct";
            }
            if (
              (type === "p4pProduct" && !p4pProductFound) ||
              (type === "normalProduct" && !normalProductFound)
            ) {
              result.push({ productName, rank, productImg, rankIndex, type });
              if (type === "p4pProduct") {
                p4pProductFound = true;
              } else {
                normalProductFound = true;
              }
            }
          } else {
            let chargeArr = item.querySelectorAll(".charge span");
            if (
              chargeArr.length === 0 ||
              (chargeArr.length === 1 && chargeArr[0].innerText === "橱窗产品")
            ) {
              let product = item.querySelector(".products");
              let productName =
                product.querySelectorAll(":scope > a")[0].innerText;
              let productId = product
                .querySelector(":scope > div > a")
                .getAttribute("href")
                .split("id=")[1];
              let productImg = product
                .querySelector(":scope > div > a > img")
                .getAttribute("src")
                .replace("_50x50.jpg", "");
              let ranking = item.querySelector(".ranking a").innerText;
              let re = /\d+/gi;
              let rankArr = ranking.match(re);
              let rank, rankIndex, rankOrder;
              if (rankArr && rankArr.length > 1) {
                rank = parseInt(rankArr[0]);
                rankIndex = parseInt(rankArr[1]);
                if (rank === 1) {
                  if (type && type === "importantOrWindow") {
                    //自然排名为首页的进行统计
                    return 1;
                  }
                  rankOrder = rankIndex;
                } else {
                  rankOrder = (rank - 1) * 50 + rankIndex;
                }
              }
              if (type && type === "importantOrWindow") {
                return 0;
              } else {
                return {
                  keywordId: id,
                  keyword: data.queryString,
                  rank,
                  rankIndex,
                  rankOrder,
                  rankProduct: productName,
                  rankProductImg: productImg,
                  rankProductId: parseInt(productId),
                };
              }
            }
          }
        }
        if (type && type === "importantOrWindow") {
          return 0;
        } else if (type && type === DOUBLE_TRAFFIC) {
          return {
            keyword: data.queryString,
            result,
          };
        } else {
          return noRank;
        }
      })
      .catch((err) => {
        console.log("查询关键词排名出错：" + err);
        if (retry) {
          return { keywordId: id, keyword: data.queryString, type, retry };
        } else {
          if (type && type === "importantOrWindow") {
            return 0;
          } else if (type && type === DOUBLE_TRAFFIC) {
            return {
              keyword: data.queryString,
              result: [],
            };
          } else {
            return errorRank;
          }
        }
      });
  },
  async checkStarInfo() {
    let startInfo = await shopDataService.getShopStartInfo();
    let predicted = getNested(startInfo, "predictedStars");
    let finalStar = getNested(startInfo, "finalStar") | 0;
    const { star: predictedStars, type } = predicted;
    // starType = type;
    if (predictedStars === 0 && finalStar === 0) {
      return {
        result: false,
        message:
          `<b>当前商家星等级为0星：</b>` +
          `建议根据实际情况补短板，哪项最低就优化哪个板块。` +
          `<a style="color: #3da8f5;" href="https://data.alibaba.com/starrating?spm=a2747.manage.0.0.4f9671d2JbZRr3" target="_blank">点击查看详情</a>`,
        predictedStars,
        finalStar,
      };
    }
    if (predictedStars < finalStar) {
      let name = "";
      if (type === "custom") {
        name = "定制";
      } else {
        name = "快速交易";
      }
      return {
        result: false,
        message:
          `<b>预测商家星等级低于本月星等级：</b>` +
          `当前星等级为${finalStar}星，下月预测${name}星等级会下降为${predictedStars}星。建议根据实际情况补短板，哪项最低就优化哪个板块。` +
          `<a style="color: #3da8f5;" href="https://data.alibaba.com/starrating?spm=a2747.manage.0.0.4f9671d2JbZRr3" target="_blank">点击查看详情</a>`,
        predictedStars,
        finalStar,
      };
    }
    return {
      result: true,
      message:
        `当前商家星等级为${finalStar}星，下月预测星等级为${predictedStars}星。请继续保持，若想要进一步提升商家星等级，建议根据实际情况补短板，哪项最低就优化哪个板块。` +
        `<a style="color: #3da8f5;" href="https://data.alibaba.com/starrating?spm=a2747.manage.0.0.4f9671d2JbZRr3" target="_blank">点击查看详情</a>`,
      predictedStars,
      finalStar,
    };
  },
  // async checkCategoryConversionRate(ctoken) {
  // const fbTmConversionRate = await myDataService.shopAnalyseTableData(ctoken);
  // return getCategoryConversionRateObj(fbTmConversionRate);
  // },
  async checkHeightClickProduct(ctoken) {
    productConversionData = await mydataService.getProductConversionData(
      ctoken,
      false
    );
    const fbRateAbnormalList = productConversionData
      .filter((i) => i.fbRateAbnormal)
      .map((i) => i.id);
    const diffSet = fbRateAbnormalList.filter(
      (i) => !noInquiryProductIds.includes(i)
    );
    if (diffSet.length > 0) {
      return {
        result: false,
        message:
          `<b>存在低转化产品：</b>` +
          `存在${diffSet.length}个高点击低反馈产品，产品ID为：${diffSet.join(
            ","
          )}建议根据此报告相关数据，查看流量来源精准度，款式是否受欢迎，价格起订量是否有优势，做相对应的优化调整。`,
      };
    }
    return {
      result: true,
      message: `当前未发现低转化异常产品。`,
      diffSet,
    };
  },
  // async checkAdvertise() {
  //   return await getAdvertise();
  // },
  async checkPromotionTime() {
    await getAllPlansList();
    await getDynamicCsrf();
    await getFinishPlansList();
    return await getPromotionTimeResult();
  },
  async checkClickRate() {
    return await getClickRate();
  },
  async checkClickRateAnomaly() {
    return await getKeywordList();
  },
  async checkNoInquiry() {
    promotionList = await getProductData(false);
    const productData = promotionList.slice(0, 3).map((i) => i.productData);
    const noInquiry = productData.filter(
      (i) => i.atmFbUv + i.sumProdFbNum === 0
    );
    noInquiryProductIds = noInquiry.map((i) => i.id);
    if (noInquiryProductIds.length > 0) {
      return {
        result: false,
        message:
          `<b>存在高付费点击无询盘的产品：</b>` +
          `产品ID：${noInquiryProductIds.join(
            ","
          )}的产品付费点击但无反馈，建议取消该产品营销广告的推广。`,
        noInquiryProductIds,
      };
    }
    return {
      result: true,
      message: `当前并未发现高付费点击无询盘的产品`,
    };
  },
  // async checkThreeStarLowRate(ctoken) {
  //   return await getThreeStarLowRate(ctoken);
  // },
  async checkNoSetArea() {
    return await getNoSetArea();
  },
  async checkChooseKeyword() {
    return await getBidWordQuery();
  },
  async checkShieldKeyword() {
    return await getShieldKeywordCount();
  },
  async checkReferralTrafficList(ctoken) {
    const result = await get4WeedReferralTrafficList(ctoken);
    const { shopPv, searchClicks } = result;
    const percent = ((shopPv / searchClicks) * 100).toFixed(2) + "%";
    if (shopPv < searchClicks * 2) {
      return {
        result: false,
        message:
          `<b>场景推荐流量不足：</b>` +
          `近4周，店铺访问次数为未到达搜索点击次数的两倍(${percent})，场景推荐流量较低。建议积极参加官方活动报名，并主动集中流量于个别产品打造爆品，获取国际站额外的流量资源。`,
        shopPv,
        searchClicks,
      };
    }
    return {
      result: true,
      message: `近4周，访问次数达到搜索点击次数的${percent}。`,
      shopPv,
      searchClicks,
    };
  },
  async checkExplosiveGoodsList(ctoken) {
    const count = await getExplosiveGoodsPromise(ctoken);
    if (count === 0) {
      return {
        result: false,
        message:
          `<b>缺乏爆品：</b>` +
          `当前店铺爆品数量为0。建议利用橱窗或直通车，以及爆款banner设置，打造询盘/订单集中的爆款产品。`,
        count,
      };
    }
    return {
      result: true,
      message: `当前，店铺有${count}个爆品`,
      count,
    };
  },
  async checkNewProduct(ctoken) {
    const product = await getAccountsData(ctoken);
    const { newProductCount } = product;
    if (newProductCount < 40) {
      return {
        result: false,
        message:
          `<b>新品发布较少：</b>` +
          `近4周，发布产品${newProductCount}个，整体数量较低。建议每月发布新品数至少达到40个，新品将会获得额外的流量扶持。`,
        newProductCount,
      };
    }
    return {
      result: true,
      message: `近4周，发布产品${newProductCount}个，新品将会获得流量扶持，请继续保持。`,
      newProductCount,
    };
  },
  async checkEditProduct(ctoken) {
    const product = await getAccountsData(ctoken);
    const { alterProductCount } = product;
    if (alterProductCount < 40) {
      return {
        result: false,
        message:
          `<b>产品更新较少：</b>` +
          `近4周，更新产品${alterProductCount}个，整体数量较低。为了保持店铺活跃度，和及时对三高产品进行优化，请保持每月至少40个的更新频率。`,
        alterProductCount,
      };
    }
    return {
      result: true,
      message: `近4周，更新产品${alterProductCount}个，操作活跃度较高，请继续保持。`,
      alterProductCount,
    };
  },
  // async checkPotentialProduct(ctoken) {
  //   const promises = [];
  //   for (let i = 1; i <= 10; i++) {
  //     const data = getPotentialProductPage(ctoken, i);
  //     promises.push(data);
  //   }
  //   const result = (await Promise.all(promises))
  //     .flat()
  //     .filter((i) => i >= 77).length;
  //   const excellentProductCount = await excellentProductPromise(ctoken);
  //   if (result) {
  //     return {
  //       result: false,
  //       message:
  //         `<b>存在有机会优化为实力优品的潜力品：</b>` +
  //         `当前存在${result}个。建议针对这些产品进行参数的优化，有可能会增加店铺实力优品数量。`,
  //       count: excellentProductCount,
  //     };
  //   }
  //   return {
  //     result: true,
  //     message: `当前，存在${excellentProductCount}实力优品，暂未发现可通过参数修改即可优化成实力优品的潜力品。`,
  //     count: excellentProductCount,
  //   };
  // },
  async checkTooFewProducts(ctoken) {
    let starType = await getStarType();
    let productNumber = starType === "custom" ? 500 : 1000;
    let currentProductNumber = await getProductNumber(ctoken);
    if (productNumber > currentProductNumber) {
      return {
        result: false,
        message:
          `<b>产品数过少：</b>` +
          `当前上架产品仅${currentProductNumber}个，可能无法覆盖到行业全部关键词。建议建立完善的关键词表，并定期检查关键词覆盖情况，及时发布产品覆盖关键词，让买家能够搜索到您的产品。`,
      };
    }
    if (currentProductNumber >= productNumber) {
      return {
        result: true,
        message: `当前上架产品数为${currentProductNumber}个，初步判断基本能够覆盖到行业关键词。可建立和不断完善行业关键词表。`,
      };
    }
  },
  async checkNaturalClick(ctoken) {
    let latest4WeekClickInfo = await get4WeekClickInfo(ctoken);
    return latest4WeekClickInfo;
  },
  checkEmphasisKeyword(param) {
    let keywordArray = getNested(param, "query", "keywordArr");
    let keywordArrayLength = getNested(keywordArray, "length") | 0;
    if (keywordArrayLength === 0) {
      return {
        result: false,
        message: `当前，AI操盘手暂未设置重点关键词，建议挑选主推品类下高热度关键词进行重点监控，便于观察排名变动情况。`,
        emphasisKeywordLength: 0,
      };
    } else {
      return {
        result: true,
        emphasisKeywordLength: keywordArrayLength,
      };
    }
  },
  async checkWindowExcellentProduct() {
    let windowProductArray = await getWindowProductArray();
    let excellentProduct = windowProductArray.filter(
      (item) => item.productTag === "1"
    );
    console.log(windowProductArray, excellentProduct);
    let percent = toPercent(
      excellentProduct.length / windowProductArray.length
    );
    if (percent < 50) {
      return {
        result: false,
        message:
          `<b>橱窗实力优品占比较低：</b>` +
          `当前，橱窗产品中，实力优品占比为${percent}%。`,
        value: percent,
      };
    } else {
      return {
        result: true,
        message: `当前，橱窗产品中，实力优品占比为${percent}%。`,
        value: percent,
      };
    }
  },
  // async checkNaturalFlowTotalSuggestion(
  //   ctoken,
  //   natureClickInfo,
  //   emphasisKeywordNotSet,
  //   windowInquiry,
  //   windowExcellentProduct,
  //   windowOperation
  // ) {
  //   if (
  //     !natureClickInfo.result ||
  //     !emphasisKeywordNotSet ||
  //     !emphasisKeywordNotSet.result ||
  //     !windowInquiry.result ||
  //     !windowExcellentProduct.result ||
  //     !windowOperation.result
  //   ) {
  //     // 信保情况
  //     let creditGuarantee = await aliService.checkCreditGuarantee(ctoken);
  //     let { totalCount, totalAmount, tradeAmount, nextLevel, avgAmount } =
  //       creditGuarantee;
  //     console.log(tradeAmount);
  //     // 交易力星级
  //     const starLevel = await getTradingPowerStarLevel(starType);
  //     // 月份
  //     const month = moment().subtract(2, "month").format("MM");
  //     // month订单明细数据
  //     const amountData = await getTotalAmount(ctoken);
  //     // 总订单
  //     const amount = getFilterTotalAmount(amountData);
  //     return {
  //       result: false,
  //       message:
  //         `综上问题建议：` +
  //         `<br/>` +
  //         `<b>1、合理利用橱窗资源。</b>` +
  //         `至少每个月查询橱窗或重点关键词的产品询盘情况，根据具体数据来进行调整效果较差的橱窗。` +
  //         `<br/>` +
  //         `<b>2、每月信保持续走单。</b>` +
  //         `尽量关联橱窗产品。最近30天信保单数为${totalCount}，实收金额为${totalAmount}美元。截止报告生成当日，交易力为${starLevel}星，` +
  //         `${month}月起信保实收金额为${amount}美元，${nextLevel}星级同行平均金额为${avgAmount}美元，预计本月底前还需走单${
  //           avgAmount - amount
  //         }美元，可以达到交易力${nextLevel}星。`,
  //     };
  //   } else {
  //     return {
  //       result: true,
  //     };
  //   }
  // },
};
export default aliService;
