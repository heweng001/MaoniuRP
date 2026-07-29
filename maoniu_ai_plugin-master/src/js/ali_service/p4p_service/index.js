import { Axios } from "common";
import moment from "moment";
import qs from "qs";
import { getNested, isArrayLength } from "util";
import { ALI_REPORT } from "@/js/service/report/api";
import mydataService from "../mydata_service";
import { arrTemplate, promotionList } from "../../ali_service";

// let csrfToken;
let csrf;
let ctoken;
let progressPort;
// const nonFormHeaders = { 'content-type': 'application/x-www-form-urlencoded' };

// const SYSTEM_BUSY = "System busy now, pleasy try it again later.";

function getCsrfToken() {
  let url = ALI_REPORT.getAliCsrfToken;
  return Axios({
    method: "get",
    url,
  })
    .then(() => {
      // let start = "value:'";
      // let end = "'";
      // let remain = res.substring(res.indexOfEnd(start));
      // csrfToken = remain.substring(0, remain.indexOf(end));
    })
    .catch(() => {});
}

export function getCsrf() {
  let url = "https://www2.alibaba.com/api/csrf";
  return Axios({
    method: "get",
    url,
  }).then((res) => {
    if (res) {
      csrf = res.token;
    }
  });
}

// function monthShelfAndEffectProductParam(ctoken) {
//   return {
//     action: 'CommonAction',
//     iName: 'getVipEffectiveProductsAndStats',
//     isVip: true,
//     ctoken
//   }
// }

// function shelfAndEffectProductForm(statisticsType, selectd, name) {
//   const form = {
//     statisticType: 'os',
//     region: 'os',
//     statisticsType: `${statisticsType}`,
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

// function p4pDaysKeywordReportForm(dateBegin, dateEnd, key = "", dateRange) {
//   const form = {
//     type: 'normal',
//     data: `{"pageSize":10,"pageIndex":1,"dateRange":${dateRange},
//     "dateBegin":"${dateBegin}","dateEnd":"${dateEnd}", "keyword":"${key}"}`,
//     _csrf_token_: csrfToken,
//     _csrf: csrf
//   };
//   return qs.stringify(form)
// }

// function p4p30DaysKeywordReportForm(dateBegin, dateEnd, key = "") {
//   return p4pDaysKeywordReportForm(dateBegin, dateEnd, key, 30);
// }

// function p4pDaysReportForm(dateBegin, dateEnd, dateRange) {
//   const form = {
//     type: 'normal',
//     data: `{"pageSize":10,"pageIndex":1,"type":"keyword","dateRange":${dateRange},
//     "dateBegin":"${dateBegin}","dateEnd":"${dateEnd}","orderField":"click","orderType":"desc"}`,
//     _csrf_token_: csrfToken,
//     _csrf: csrf
//   };
//   return qs.stringify(form)
// }

// function p4p30DaysReportForm(dateBegin, dateEnd) {
//   return p4pDaysReportForm(dateBegin, dateEnd, 30);
// }

// function p4pAdKeywordForm(status = "all", qsStar = "all", date = 30, kw = "", isExact = "N") {
//   const form = {
//     json: `{"status":"${status}","cost":"all","click":"all","exposure":"all","cpc":"all","qsStar":"${qsStar}",
//     "kw":"${kw}","isExact":"${isExact}","date":${date},"tagId":-1,"delayShow":false,"recStrategy":1,"recType":"recommend"}`,
//     _csrf_token_: csrfToken,
//     _csrf: csrf
//   };
//   return qs.stringify(form)
// }

// function p4pAdKeywordRankForm(idStr, keywordStr) {
//   const form = {
//     _csrf_token_: csrfToken,
//     _csrf: csrf,
//     json: `{"ids":"${idStr}","keywords":"${keywordStr}"}`
//   };
//   return qs.stringify(form)
// }

// function recently30DaysRange() {
//   let now = moment(new Date()).format("YYYY-MM-DD");
//   let dateEnd = moment(now).subtract(2, 'days').format('YYYY-MM-DD');
//   let dateBegin = moment(now).subtract(31, 'days').format('YYYY-MM-DD');
//   return { dateBegin, dateEnd };
// }

// // 根据P4P关键词名称查询数据
// function p4pAdKeywordPromise(ctoken, kw) {
//   let url = ALI_REPORT.postAliP4pAdKeywordsReport;
//   let params = {
//     ctoken
//   };
//   let form = p4pAdKeywordForm("all", "all", 30, kw, "Y");
//   return Axios({
//     method: "post",
//     url,
//     params,
//     data: form,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (Object.hasOwn(res, "status")) {
//       let { totalCount, data } = res;
//       if (totalCount > 0 && data && data.length > 0) {
//         return data[0];
//       }
//     }
//     return null
//   }).catch((err) => {
//     console.log(`根据P4P关键词名称查询数据p4pAdKeywordPromise：${err}`);
//     return null
//   })
// }

// // 获取P4P关键词排名信息
// function p4pAdKeywordRankPromise(ctoken, data) {
//   let url = ALI_REPORT.postAliP4pAdKeywordsRank;
//   let params = {
//     ctoken
//   };
//   const idStr = data.map(item => item.id).join(",");
//   const keywordStr = data.map(item => item.keyword).join(",");
//   let form = p4pAdKeywordRankForm(idStr, keywordStr);
//   return Axios({
//     method: "post",
//     url,
//     params,
//     data: form,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (Object.hasOwn(res, "status") && res.status) {
//       let { rankBackList } = res;
//       const max = rankBackList.reduce((pre, cur) => (pre.lastHour > cur.lastHour) ? pre : cur);
//       return rankBackList.filter(item => item.lastHour === max.lastHour);
//     } else {
//       return []
//     }
//   }).catch(err => {
//     console.log(`获取P4P关键词排名信息p4pAdKeywordRankPromise：${err}`);
//     return [];
//   })
// }

// // 根据关键词名称获取最近30天P4P关键词效果数据
// function p4p30DaysKeywordReportPromise(key) {
//   let { dateBegin, dateEnd } = recently30DaysRange();
//   let url = ALI_REPORT.postAli7DaysP4pKeyWordReport;
//   let form = p4p30DaysKeywordReportForm(dateBegin, dateEnd, key);
//   return Axios({
//     method: "post",
//     url,
//     data: form,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (Object.hasOwn(res, "status") && res.status) {
//       let { data } = res;
//       if (data && data.length > 0) {
//         return data.filter(item => item.keyword === key)[0]
//       }
//       return null
//     }
//     return null
//   }).catch((err) => {
//     console.log(`根据关键词名称获取最近30天P4P关键词效果数据p4p7DaysKeywordPromise：${err}`);
//     return null
//   })
// }

// // 最近30天P4P产品数据top10点击
// function p4p30DaysProductReportPromise() {
//   let { dateBegin, dateEnd } = recently30DaysRange();
//   let url = ALI_REPORT.postAliDaysP4pProductReport;
//   let form = p4p30DaysReportForm(dateBegin, dateEnd);
//   return Axios({
//     method: "post",
//     url,
//     data: form,
//     headers: nonFormHeaders
//   }).then(res => {
//     if (Object.hasOwn(res, "status") && res.status) {
//       let { data } = res;
//       if (data && data.length > 0) {
//         return data.slice(0, 10);
//       }
//       return []
//     }
//     return []
//   }).catch((err) => {
//     console.log(`最近30天P4P产品数据top10点击p4p30DaysProductReportPromise${err}`);
//     return []
//   })
// }

// // 根据产品名称获取产品效果周期数据
// function mydataSingleProductEffectPromise(ctoken, statisticType, selected, name) {
//   let url = ALI_REPORT.postAli7DaysSingleProductStat;
//   let params = monthShelfAndEffectProductParam(ctoken);
//   let form = shelfAndEffectProductForm(statisticType, selected, name);
//   return Axios({
//     method: "post",
//     url,
//     data: form,
//     params,
//     headers: nonFormHeaders
//   }).then(res => {
//     let { value: { products: { data } } } = res;
//     if (Object.hasOwn(res, "successed") && res.successed) {
//       if (data && data.length > 0) {
//         return data.filter(item => item.subject === name)[0];
//       }
//     }
//     return null;
//   }).catch((err) => {
//     console.log(`根据产品名称获取产品数据weekSingleProductPromise${err}`);
//     return null;
//   })
// }

// // 根据产品ID获取最近30天数据效果
// // function mydata30DaysSingleProductEffectPromise(ctoken, productId) {
// //   let url = ALI_REPORT.postAli7DaysSingleProductStat;
// //   let params = {
// //     action: 'CommonAction',
// //     iName: 'getVipProductTrendsAndOperatorions',
// //     isVip: true,
// //     ctoken
// //   };
// //   let form = getVipProductTrendsAndOperatorionsForm('day', 1, productId);
// //   return Axios({
// //     method: "post",
// //     url,
// //     data: form,
// //     params,
// //     headers: nonFormHeaders
// //   }).then(res => {
// //     let {value} = res;
// //     if (Object.hasOwn(res, "successed") && res.successed) {
// //       if (value && value.length > 0) {
// //         return value;
// //       }
// //     }
// //     return [];
// //   }).catch((err) => {
// //     console.log(`根据产品ID获取最近30天数据效果singleProductEffect30DaysPromise${err}`);
// //     return [];
// //   })
// // }

// // 获取账户数据管家最近30天数据合计
// async function account30DaysReportPromise(ctoken) {
//   let url = ALI_REPORT.getAliLastMonthStaffStats;
//   let params = {
//     action: 'OneAction',
//     iName: 'vip/home/getShopTrends',
//     ctoken,
//     statisticType: 'os',
//     region: 'os',
//     isVip: true,
//     statisticsType: 'day',
//     selected: 1
//   };
//   let accountReport = { totalClickCount: 0, totalImpressionCount: 0, totalFeedbackCount: 0 };

//   return Axios({
//     method: "get",
//     url,
//     params,
//   }).then(res => {
//     if (Object.hasOwn(res, "code") && res.code === 0) {
//       let { data } = res;
//       if (data && data.length > 0) {
//         for (let item of data) {
//           accountReport.totalImpressionCount += item.searchImps;
//           accountReport.totalClickCount += item.searchClicks;
//           accountReport.totalFeedbackCount += item.fbPv;
//         }
//         return accountReport;
//       }
//     }
//     return accountReport;
//   }).catch((err) => {
//     console.log(`获取账户数据管家最近30天数据合计account30DaysReportPromise：${err}`)
//     return accountReport;
//   })
// }

let currentProgress = 0;
function infoProgress(progress) {
  const moduleName = "p4pAnalyse";
  currentProgress += progress;
  progressPort.postMessage({ moduleName, progress: currentProgress });
}
function resetScore() {
  currentProgress = 0;
}

async function init(ctokenVal, port) {
  await getCsrfToken();
  await getCsrf();
  resetScore();
  progressPort = port;
  ctoken = ctokenVal;
}

async function getKeywordPageData(orderBy, i, ctoken, select) {
  let url = "https://hz-mydata.alibaba.com/self/.json";
  let params = {
    action: "OneAction",
    iName: "vip/traffic/keyword/getKeywords",
    isVip: true,
    statisticsType: "week",
    selected: select,
    statisticType: "os",
    orderBy: orderBy,
    orderModel: "desc",
    pageSize: 10,
    pageNO: i,
    ctoken,
  };
  return Axios({
    url,
    method: "get",
    params,
  })
    .then((res) => {
      return getNested(res, "data", "keywords", "data");
    })
    .catch((e) => {
      console.error(`抓取引流关键词出现异常${e}`);
      return [];
    });
}

async function getKeywordWeekData(select, ctoken) {
  let result = [];
  let keywordNameArray = [];
  // 引流关键词数量全抓的话数据量太大，按曝光点击等多个维度抓前5页的数据取并集
  const totalPage = 5;
  let orderByArray = [
    "sumShowCnt",
    "sumClickCnt",
    "sumP4pShowCnt",
    "sumP4pClickCnt",
    "ctr",
  ];
  for (let orderBy of orderByArray) {
    for (let i = 1; i <= totalPage; i++) {
      // 1百分比
      let data = await getKeywordPageData(orderBy, i, ctoken, select);
      infoProgress(0.1);
      if (data) {
        data.forEach((item) => {
          if (!keywordNameArray.includes(item.keyword)) {
            result.push(item);
            keywordNameArray.push(item.keyword);
          }
        });
      }
    }
  }
  return result;
}

function mergeKeywordData(totalData) {
  let map = {};
  totalData.forEach((item) => {
    let obj = map[item.keyword];
    if (!obj) {
      map[item.keyword] = Object.assign({}, item);
    } else {
      obj.sumClickCnt += item.sumClickCnt;
      obj.sumP4pClickCnt += item.sumP4pClickCnt;
      obj.sumP4pShowCnt += item.sumP4pShowCnt;
      obj.sumShowCnt += item.sumShowCnt;
    }
  });
  let values = Object.values(map);
  values.forEach((item) => {
    item.clickRate = item.sumClickCnt / item.sumShowCnt;
    item.p4pClickRate = item.sumP4pClickCnt / item.sumP4pShowCnt;
  });
  return values;
}

async function getFourWeekData(ctoken) {
  let totalData = [];
  let selectArray = [1, 2, 3, 4];
  for (let select of selectArray) {
    // 2.5百分比
    let weekData = await getKeywordWeekData(select, ctoken);
    totalData.push(...weekData);
  }
  console.log(totalData);
  // 合并数据
  let mergeData = mergeKeywordData(totalData);
  return mergeData;
}

function getTop10(result, keywordNameArray, fourWeekKeywordData, sort) {
  let sortTop10 = fourWeekKeywordData
    .sort((k1, k2) => k2[sort] - k1[sort])
    .slice(0, 10);
  console.log(`${sort} top 10`);
  console.log(sortTop10);
  sortTop10.forEach((item) => {
    if (!keywordNameArray.includes(item.keyword)) {
      result.push(item);
      keywordNameArray.push(item.keyword);
    }
  });
}

// eslint-disable-next-line no-unused-vars
async function getFilterKeywordData(fourWeekKeywordData, promotionKeywordData) {
  // 取曝光，点击，直通车曝光，直通车点击,直通车关键词推广曝光及点击数据top10,并去重.默认按照点击降序
  let result = [];
  let keywordNameArray = [];
  let sortArray = [
    "sumShowCnt",
    "sumClickCnt",
    "sumP4pShowCnt",
    "sumP4pClickCnt",
  ];
  for (let sort of sortArray) {
    getTop10(result, keywordNameArray, fourWeekKeywordData, sort);
  }
  result.sort((k1, k2) => k2.sumClickCnt - k1.sumClickCnt);
  console.log(keywordNameArray);
  console.log(result);
  return result;
}

async function getStartDateArray() {
  let startDataArray = [];
  let statDate = await getMyDataStatDate();
  startDataArray.push(statDate);
  let date = moment(statDate);
  for (let i = 0; i < 3; i++) {
    date.subtract(7, "days");
    startDataArray.push(date.format("YYYY-MM-DD"));
  }
  return startDataArray;
}

async function getKeywordReportOneWeekDate(startDate, keyword, isSearchWord) {
  let url = "https://www2.alibaba.com/api/report/keyword";
  if (isSearchWord) {
    url = "https://www2.alibaba.com/api/report/searchword";
  }
  let form = {
    type: "normal",
    ads: `{"productLineId":110101}`,
    data: `{"pageIndex":1,"pageSize":20,"keyword":"${keyword}","dateRange":7,"dateEnd":"${startDate}"}`,
    _csrf: csrf,
  };
  return Axios({
    url,
    method: "post",
    data: qs.stringify(form),
  }).then((res) => {
    console.log(res);
    let data = getNested(res, "data", 0);
    if (data && keyword.toLowerCase() === data.keyword.toLowerCase()) {
      return data;
    }
    return null;
  });
}

async function getKeywordFourWeekData(keywordData, isSearchWord = false) {
  let result = [];
  let startDataArray = await getStartDateArray();
  console.log(startDataArray);
  for (let startDate of startDataArray) {
    let data = await getKeywordReportOneWeekDate(
      startDate,
      keywordData.keyword,
      isSearchWord
    );
    if (data) {
      result.push(data);
    }
  }
  return result;
}

// async function getKeywordState(keyword) {
//    let res = await p4pAdKeywordPromise(ctoken,keyword);
//    let state = getNested(res,"state");
//    return state;
// }

async function setKeywordReportDadaForKeyword(
  keywordData,
  isSearchWord = false
) {
  // 获取近4周关键词报告数据
  let keywordFourWeekData = await getKeywordFourWeekData(
    keywordData,
    isSearchWord
  );
  console.log(
    `keyword ${keywordData.keyword} 近4周${
      isSearchWord ? "搜索词" : "关键词"
    }报告数据`
  );
  console.log(keywordFourWeekData);
  // 合并关键词报告数据
  let impr = 0,
    click = 0,
    cost = 0;
  for (let weekData of keywordFourWeekData) {
    impr += weekData.impr;
    click += weekData.click;
    cost += weekData.cost;
  }

  if (isSearchWord) {
    keywordData.searchWordData = { impr, click, cost };
  } else {
    Object.assign(keywordData, { impr, click, cost });
  }
}

async function setKeywordReportData(filterKeywordData) {
  // 获取近4周关键词报告数据
  let eachScore = 10 / filterKeywordData.length;
  for (const keywordData of filterKeywordData) {
    await setKeywordReportDadaForKeyword(keywordData);
    infoProgress(eachScore);
  }
}

async function setSearchWordReportData(filterKeywordData) {
  // 获取近4周关键词搜索词报告数据
  let eachScore = 20 / filterKeywordData.length;
  for (const keywordData of filterKeywordData) {
    await setKeywordReportDadaForKeyword(keywordData, true);
    infoProgress(eachScore);
  }
}

// async function getAllKeywordReportOneWeekPageDate(startDate, i) {
//   let url = "https://www2.alibaba.com/api/report/keyword";
//   let form ={
//     type: "normal",
//     ads: `{"productLineId":110101}`,
//     data: `{"pageIndex":${i},"pageSize":20,"keyword":"","orderField":"click","orderType":"desc","dateRange":7,"dateEnd":"${startDate}"}`,
//     _csrf: csrf
//   }
//   return Axios({
//     url,
//     method: "post",
//     data:qs.stringify(form)
//   }).then(res => {
//     let data = getNested(res,"data");
//     return data;
//   })
// }

// async function getKeywordReportOneWeekTotalPage(startDate) {
//   let url = "https://www2.alibaba.com/api/report/keyword";
//   let form ={
//     type: "normal",
//     ads: `{"productLineId":110101}`,
//     data: `{"pageIndex":1,"pageSize":20,"keyword":"","orderField":"click","orderType":"desc","dateRange":7,"dateEnd":"${startDate}"}`,
//     _csrf: csrf
//   }
//   return Axios({
//     url,
//     method: "post",
//     data:qs.stringify(form)
//   }).then(res => {
//     let data = getNested(res,"totalPages");
//     return data;
//   })
// }

// async function getAllKeywordReportOneWeekDate(startDate) {
//   // 取关键词报告周数据，全取的话数据量可能过大。故按点击降序取前10页数据
//   let totalPage = await getKeywordReportOneWeekTotalPage(startDate);
//   totalPage = totalPage < 10 ? totalPage : 10;
//   let totalData = [];
//   for (let i = 1;i <= totalPage;i++){
//     let data = await getAllKeywordReportOneWeekPageDate(startDate,i);
//     totalData.push(...data);
//   }
//   return totalData;
// }

// function mergeKeywordReportData(totalData) {
//   let map = {};
//   totalData.forEach(item => {
//     let obj = map[item.keyword];
//     if(!obj){
//       map[item.keyword] = Object.assign({},item);
//     }else {
//       obj.impr += item.impr;
//       obj.click += item.click;
//       obj.cost += item.cost;
//     }
//   })
//   let values = Object.values(map);
//   return values;
// }

// async function getFourWeekKeywordReportData() {
//   let totalData = [];
//   let startDataArray = await getStartDateArray();
//   for (let startDate of startDataArray) {
//     let data = await getAllKeywordReportOneWeekDate(startDate);
//     infoProgress(10 / startDataArray.length);
//     if(data){
//       totalData.push(...data);
//     }
//   }
//   console.log(totalData);
//   // 合并数据
//   let mergeData = mergeKeywordReportData(totalData);
//   return mergeData;
// }

// function getFilterKeywordReportData(fourWeekKeywordReportData) {
//   let result = [];
//   let keywordNameArray = [];
//   let sortArray = ["impr","click"];
//   for (let sort of sortArray) {
//     getTop10(result,keywordNameArray,fourWeekKeywordReportData,sort);
//   }
//   return result;
// }

// async function getKeywordOneWeekData(select, keyword) {
//   let url = "https://hz-mydata.alibaba.com/self/.json";
//   let params = {
//     action: "OneAction",
//     iName: "vip/traffic/keyword/getKeywords",
//     isVip: true,
//     statisticsType: "week",
//     selected: select,
//     statisticType: "os",
//     orderBy: "sumShowCnt",
//     orderModel: "desc",
//     pageSize: 10,
//     pageNO: 1,
//     keyword: keyword,
//     ctoken
//   };
//   return Axios({
//     url,
//     method: "get",
//     params
//   }).then(res => {
//     let data = getNested(res,"data","keywords","data","0");
//     if(data && data.keyword === keyword){
//       return data;
//     }
//     return null;
//   }).catch((e) => {
//     console.error(`抓取引流关键词出现异常${e}`);
//     return null;
//   })
// }

// // 获取4周引流关键词数据
// async function getFourWeekKeywords(keyword) {
//   let totalData = [];
//   let selectArray = [1,2,3,4];
//   for (let select of selectArray) {
//     let data = await getKeywordOneWeekData(select,keyword);
//     if(data){
//       totalData.push(data);
//     }
//   }
//   return totalData;
// }

// async function getKeywordData(filterData) {
//   let result = [];
//   for (let item of filterData) {
//     let keywordData = await getFourWeekKeywords(item.keyword);
//     let [sumClickCnt,sumP4pClickCnt,sumP4pShowCnt,sumShowCnt] = [0,0,0,0];
//     keywordData.forEach(weekData => {
//       sumClickCnt += weekData.sumClickCnt;
//       sumP4pClickCnt += weekData.sumP4pClickCnt;
//       sumP4pShowCnt += weekData.sumP4pShowCnt;
//       sumShowCnt += weekData.sumShowCnt;
//     })
//     result.push(Object.assign(item,{
//       sumClickCnt,
//       sumP4pClickCnt,
//       sumP4pShowCnt,
//       sumShowCnt,
//       clickRate: sumClickCnt / sumShowCnt,
//       p4pClickRate: sumP4pClickCnt / sumP4pShowCnt
//     }))
//     infoProgress(5 / filterData.length)
//   }
//   return result;
// }

// async function setState(filterData) {
//   for (let item of filterData) {
//     if(item.impr > 0){
//       let state = await getKeywordState(item.keyword);
//       if(!state){
//         state = "暂未推广";
//       }
//       item.state = state;

//     }else {
//       item.state = "暂未推广";
//     }
//     infoProgress( 5 / filterData.length);
//   }
// }

// async function getPromotionKeywordData() {
//   // 获取近4周直通车关键词推广数据 10百分比
//   let fourWeekKeywordReportData = await getFourWeekKeywordReportData();
//   console.log("four week keyword report data");
//   console.log(fourWeekKeywordReportData)
//   // 过滤出曝光点击top10
//   let filterData = getFilterKeywordReportData(fourWeekKeywordReportData);
//   console.log("top keyword");
//   console.log(filterData);
//   // 设置推广状态 5百分比
//   await setState(filterData);
//   // 取关键词推广数据 5百分比
//   let result = await getKeywordData(filterData);
//   console.log("关键词推广数据")
//   console.log(result);
//   return result;
// }

// function combineData(filterKeywordData, promotionKeywordData) {
//   let result = [...filterKeywordData];
//   let keywordNameArray = filterKeywordData.map(item => item.keyword);
//   promotionKeywordData.forEach(item => {
//     if (!keywordNameArray.includes(item.keyword)){
//       result.push(item);
//       keywordNameArray.push(item.keyword)
//     }
//   })
//   return result;
// }

async function getKeywordAnalyseData(ctoken) {
  // 获取最近4周引流关键词数据 10百分比
  let fourWeekKeywordData = await getFourWeekData(ctoken);
  console.log("four week keyword data");
  console.log(fourWeekKeywordData);
  // 过滤
  let filterKeywordData = await getFilterKeywordData(fourWeekKeywordData);
  console.log(`filter keywordData`);
  console.log(filterKeywordData);
  // 获取自选词数据 10百分比
  await setKeywordReportData(filterKeywordData);
  // 获取搜索词数据 20百分比
  await setSearchWordReportData(filterKeywordData);
  let result = filterKeywordData.sort(
    (k1, k2) => k2.sumClickCnt - k1.sumClickCnt
  );
  console.log("引流关键词,result", result);
  return result;
}

async function getProductReportPageData(
  startDate,
  dateEnd,
  campaignType,
  page,
  productLineId
) {
  let form = {
    type: "normal",
    ads: `{"productLineId":${productLineId}}`,
    data: `{"pageIndex":${page},"pageSize":20,"orderField":"click","orderType":"desc","startDate":"${startDate}","campaignType":"${campaignType}","dateRange":7,"dateEnd":"${dateEnd}"}`,
    _csrf: csrf,
  };
  let url = "https://www2.alibaba.com/api/report/product";
  return Axios({
    url,
    method: "post",
    data: qs.stringify(form),
  }).then((res) => {
    let data = getNested(res, "data");
    return data || [];
  });
}

async function getProductReportWeekData(
  startDate,
  dateEnd,
  campaignType,
  productLineId
) {
  let result = [];
  // 产品报表周数据按点击降序取前两页
  let totalPage = 2;
  for (let i = 1; i <= totalPage; i++) {
    let data = await getProductReportPageData(
      startDate,
      dateEnd,
      campaignType,
      i,
      productLineId
    );
    result.push(...data);
  }
  return result;
}

function mergeWeekData(totalData) {
  let map = {};
  totalData.forEach((item) => {
    let obj = map[item.productName];
    if (!obj) {
      map[item.productName] = Object.assign({}, item);
    } else {
      obj.buyer += item.buyer;
      obj.click += item.click;
      obj.cost += item.cost;
      obj.fb += item.fb;
      obj.impr += item.impr;
      obj.onlineHours += item.onlineHours;
      obj.order += item.order;
    }
  });
  return Object.values(map);
}

async function getFourWeekKeywordPromotionData(dataRangeArray, isDataReport) {
  return await getFourWeekProductReport(
    dataRangeArray,
    "1",
    undefined,
    isDataReport
  );
}

async function getMyDataStatDate() {
  let url = "https://hz-mydata.alibaba.com/self/.json";
  let params = {
    action: "OneAction",
    iName: "vip/product/getProdcutSummary",
    statisticsType: "week",
    selected: 1,
    statisticType: "os",
    region: "os",
    isVip: true,
    ctoken: ctoken,
  };
  return Axios({
    url,
    method: "get",
    params,
  }).then((res) => {
    return getNested(res, "data", "statDate", "value");
  });
}

async function getDateRangeArray() {
  let result = [];
  let myDataStatDate = await getMyDataStatDate();
  console.log("get mydateStatDate");
  console.log(myDataStatDate);
  if (!myDataStatDate) {
    myDataStatDate = moment().format("YYYY-MM-DD");
  }
  for (let i = 0; i <= 3; i++) {
    let dateEnd = moment(`${myDataStatDate}`)
      .endOf("week")
      .subtract(i, "week")
      .format("YYYY-MM-DD");
    let startDate = moment(`${myDataStatDate}`)
      .startOf("week")
      .subtract(i, "week")
      .format("YYYY-MM-DD");
    console.log(`${dateEnd} , ${startDate}`);
    result.push({ dateEnd, startDate });
  }
  return result;
}

async function getFourWeekProductReport(
  dataRangeArray,
  campaignType,
  productLineId = 110101,
  isDataReport
) {
  let totalData = [];
  for (const { startDate, dateEnd } of dataRangeArray) {
    let weekData = await getProductReportWeekData(
      startDate,
      dateEnd,
      campaignType,
      productLineId
    );
    if (isDataReport) {
      infoProgress(10 / dataRangeArray.length);
    }
    totalData.push(...weekData);
  }
  console.log(`产品推广类型 ${campaignType} ,近4周数据`);
  console.log(totalData);
  // merge
  let result = mergeWeekData(totalData);
  console.log(`产品推广类型 ${campaignType} ,merge后数据`);
  console.log(result);
  return result;
}

async function getFourWeekAllPromotionData(dataRangeArray, isDataReport) {
  return await getFourWeekProductReport(
    dataRangeArray,
    "",
    undefined,
    isDataReport
  );
}

async function getRecommendPromotionData(dataRangeArray, isDataReport) {
  return await getFourWeekProductReport(
    dataRangeArray,
    "",
    110103,
    isDataReport
  );
}

function getTop10Product(keywordPromotionData) {
  return keywordPromotionData
    .sort((k1, k2) => k2.click - k1.click)
    .slice(0, 10);
}

function getUnionData(
  top10KeywordPromotionProduct,
  top10AllPromotionProduct,
  top10RecommendProduct
) {
  let result = [];
  let productIdArray = [];

  let totalData = [
    ...top10KeywordPromotionProduct,
    ...top10AllPromotionProduct,
    ...top10RecommendProduct,
  ];
  totalData.forEach((item) => {
    if (!productIdArray.includes(item.productId)) {
      result.push(item);
      productIdArray.push(item.productId);
    }
  });
  return result;
}

function filterZeroClickAndCostProduct(unionData) {
  unionData = unionData.filter((item) => {
    if (item.click === 0 && item.cost === 0) {
      return false;
    }
    return true;
  });
  return unionData;
}

function getFilterProductId(
  keywordPromotionData,
  allPromotionData,
  recommendPromotionData
) {
  let top10KeywordPromotionProduct = getTop10Product(keywordPromotionData);
  let top10AllPromotionProduct = getTop10Product(allPromotionData);
  let top10RecommendProduct = getTop10Product(recommendPromotionData);
  console.log(
    top10KeywordPromotionProduct,
    top10AllPromotionProduct,
    top10RecommendProduct
  );
  // 取并集
  let unionData = getUnionData(
    top10KeywordPromotionProduct,
    top10AllPromotionProduct,
    top10RecommendProduct
  );
  console.log("top10 产品并集");
  console.log(unionData);
  // 过滤点击花费都为0的产品
  unionData = filterZeroClickAndCostProduct(unionData);
  return unionData.map((item) => item.productId);
}

function getPromotionData(productId, keywordPromotionData) {
  let filterData = keywordPromotionData.filter(
    (item) => item.productId === productId
  );
  if (filterData && filterData.length > 0) {
    let data = filterData[0];
    return { click: data.click, cost: data.cost };
  }
  return {};
}

function getOtherPromotionData(allPromotionData, keywordPromotionData) {
  let otherPromotionData = { click: 0, cost: 0 };
  let all_click = allPromotionData.click;
  let all_cost = allPromotionData.cost;
  if (all_click !== undefined && all_cost !== undefined) {
    otherPromotionData = { click: all_click, cost: all_cost };
    if (
      keywordPromotionData &&
      keywordPromotionData.click !== undefined &&
      keywordPromotionData.cost !== undefined
    ) {
      let click = all_click - keywordPromotionData.click;
      let cost = all_cost - keywordPromotionData.cost;
      if (click < 0) {
        click = 0;
      }
      if (cost < 0) {
        cost = 0;
      }
      otherPromotionData = { click, cost };
    }
  }
  return otherPromotionData;
}

function getProductPromotionData(
  filterProductIdArray,
  keywordPromotionDataArray,
  allPromotionDataArray,
  recommendPromotionDataArray,
  isDataReport
) {
  let result = [];
  for (let productId of filterProductIdArray) {
    let item = { productId };
    // 关键词推广数据
    let keywordPromotionData = getPromotionData(
      productId,
      keywordPromotionDataArray
    );
    item.keywordPromotionData = keywordPromotionData;
    // 全部搜索推广数据
    let allPromotionData = getPromotionData(productId, allPromotionDataArray);
    item.allPromotionData = allPromotionData;
    let otherPromotionData = getOtherPromotionData(
      allPromotionData,
      keywordPromotionData
    );
    item.otherPromotionData = otherPromotionData;
    // 推荐推广数据
    let recommendPromotionData = getPromotionData(
      productId,
      recommendPromotionDataArray
    );
    item.recommendPromotionData = recommendPromotionData;
    result.push(item);
  }
  if (isDataReport) {
    infoProgress(10);
  }
  return result;
}

async function getProductWeekData(productId, select) {
  let form = {
    statisticsType: "week",
    selected: select,
    terminalType: "total",
    isMyselfUpgraded: true,
    orderBy: "clicks",
    orderModel: "desc",
    pageSize: 30,
    pageNO: 1,
    name: productId,
    statisticType: "os",
    region: "os",
    isVip: true,
  };
  let params = {
    action: "CommonAction",
    iName: "getVipEffectiveProductsAndStats",
    isVip: true,
    ctoken: ctoken,
  };
  let url = "https://hz-mydata.alibaba.com/self/.json";
  return Axios({
    url,
    method: "post",
    params,
    data: qs.stringify(form),
  }).then((res) => {
    let data = getNested(res, "value", "products", "data");
    if (data && data.length === 1) {
      return data[0];
    }
  });
}

async function getLastFourWeekProductData(productId) {
  let productWeekDataArray = [];
  let selectArray = [1, 2, 3, 4];
  for (let select of selectArray) {
    let weekData = await getProductWeekData(productId, select);
    productWeekDataArray.push(weekData);
  }
  // merge
  let result = {};
  productWeekDataArray.forEach((item) => {
    if (item) {
      if (!result.id) {
        let {
          id,
          subject,
          imageURL,
          sumProdShowNum,
          sumProdClickNum,
          sumProdVisitorCnt,
          sumProdFbNum,
          tmUv,
          atmFbUv,
        } = item;
        result = Object.assign(
          {},
          {
            id,
            subject,
            imageURL,
            sumProdShowNum,
            sumProdClickNum,
            sumProdVisitorCnt,
            sumProdFbNum,
            tmUv,
            atmFbUv,
          }
        );
      } else {
        let {
          sumProdShowNum,
          sumProdClickNum,
          sumProdVisitorCnt,
          sumProdFbNum,
          tmUv,
          atmFbUv,
        } = item;
        result.sumProdShowNum += sumProdShowNum;
        result.sumProdClickNum += sumProdClickNum;
        result.sumProdVisitorCnt += sumProdVisitorCnt;
        result.sumProdFbNum += sumProdFbNum;
        result.tmUv += tmUv;
        result.atmFbUv += atmFbUv;
      }
    }
  });
  return result;
}

async function setLastFourWeekProductData(result, isDataReport) {
  for (let item of result) {
    let productData = await getLastFourWeekProductData(item.productId);
    if (isDataReport) {
      infoProgress(5 / result.length);
    }
    item.productData = productData;
  }
}

async function setHighClickKeywordData(result, isDataReport) {
  for (let item of result) {
    let keywordData = await mydataService.getKeywordEffect(ctoken, {
      id: item.productId,
    });
    let top3Keyword = keywordData
      .sort((k1, k2) => k2.p4pClickCnt - k1.p4pClickCnt)
      .slice(0, 3);
    item.keywordData = top3Keyword;
    if (isDataReport) {
      infoProgress(5 / result.length);
    }
  }
}

export async function getProductData(isDataReport) {
  await getCsrf();
  // 产品：关键词推广点击降序top10+全部营销推广点击降序top10+推荐推广点击降序top10。去重
  let dataRangeArray = await getDateRangeArray();
  // 获取近4周关键词推广数据产品数据 10百分比
  let keywordPromotionData = await getFourWeekKeywordPromotionData(
    dataRangeArray,
    isDataReport
  );
  // 获取近4周全部营销推广产品数据 10百分比
  let allPromotionData = await getFourWeekAllPromotionData(
    dataRangeArray,
    isDataReport
  );
  // 获取近4周推荐推广数据 10百分比
  let recommendPromotionData = await getRecommendPromotionData(
    dataRangeArray,
    isDataReport
  );
  console.log(keywordPromotionData, allPromotionData, recommendPromotionData);
  // 过滤
  let filterProductIdArray = getFilterProductId(
    keywordPromotionData,
    allPromotionData,
    recommendPromotionData
  );
  console.log(filterProductIdArray);
  // 获取产品推广数据 10百分比
  let result = getProductPromotionData(
    filterProductIdArray,
    keywordPromotionData,
    allPromotionData,
    recommendPromotionData,
    isDataReport
  );
  console.log("产品推广数据");
  console.log(result);
  // 获取产品近4周数据(曝光,访客，询盘,tm) 5百分比
  await setLastFourWeekProductData(result, isDataReport);
  // 获取近4周高点击词数据 5百分比
  await setHighClickKeywordData(result, isDataReport);
  return result;
}

async function getCampaignStats(campaignId, startDate, endDate) {
  await getCsrf();
  const form = {
    ads: `{"productLineId":110101}`,
    type: `normal`,
    data: `{"dataMode":"struct","tableName":"component_offline_account","filters":[{"field":"summaryTypes","value":["search"]},{"field":"campaignId","value":[${campaignId}]},{"field":"fbAttribution","value":"0"}],"time":{"granularity":"DAY","beginDateTime":"${startDate}","endDateTime":"${endDate}"},"derives":[{"mode":"MAIN"}],"extendParams":{"context":{"summaryTypes":["search"],"dateRange":30,"campaignId":${campaignId},"productLineId":110101}}}`,
    _csrf: csrf,
  };
  return Axios({
    url: `https://www2.alibaba.com/api/data/dynamic/component/data`,
    method: "post",
    data: qs.stringify(form),
  }).then((res) => {
    const summary = res?.data?.queryResult?.totalSummary;

    return Object.keys(summary).reduce((cur, key) => {
      cur[key] = Number(summary[key]?.main);
      return cur;
    }, {});
  });
}

async function getCampaigns() {
  await getCsrf();
  const form = {
    ads: `{"productLineId":110101}`,
    type: `normal`,
    data: `{"paging":true,"summaryTypes":["search"],"page":1,"size":9999}`,
    _csrf: csrf,
  };
  return Axios({
    url: `https://www2.alibaba.com/api/campaign/type/allList`,
    method: "post",
    data: qs.stringify(form),
  })
    .then((res) => {
      return Object.values(res.data)
        .flat(Infinity)
        .map((m) => {
          const typeInfo = arrTemplate.find((f) => f.key === m.type);
          return Object.assign({}, m, {
            type: typeInfo?.title,
          });
        });
    })
    .catch((err) => {
      console.log(`getCampaigns: ${err}`);
    });
}

function getCampaignDetail(dateRange, campaign) {
  const form = {
    ads: `{"productLineId":110101}`,
    type: `normal`,
    data: `{"dateRange":7,"campaignId":${campaign.id},"dateEnd":"${dateRange.dateEnd}","dateBegin":"${dateRange.startDate}"}`,
    _csrf: csrf,
  };
  return Axios({
    url: `https://www2.alibaba.com/api/report/account`,
    method: "post",
    data: qs.stringify(form),
  })
    .then((res) => {
      if (isArrayLength(res.data)) {
        return res.data.map((m) => {
          return {
            impr: m.impr,
            click: m.click,
            cpc: m.cpc,
            cost: m.cost,
          };
        });
      }
      return [];
    })
    .catch((err) => {
      console.log(
        `${campaign.title}-${dateRange.startDate}~${dateRange.dateEnd}-获取具体数据出错了: ${err}`
      );
    });
}

async function getWeekProductData(ctoken, selected, orderBy) {
  const { recordCount } = await getOnePageProductData(
    ctoken,
    selected,
    orderBy
  );
  const result = [];
  if (recordCount) {
    const page =
      recordCount % 30 === 0 ? recordCount / 30 : recordCount / 30 + 1;
    for (let i = 1; i <= page; i++) {
      const { data } = await getOnePageProductData(
        ctoken,
        selected,
        orderBy,
        i
      );
      const status = data.some((s) => s[orderBy] === 0);
      if (status) {
        result.push(...data.filter((f) => f[orderBy]));
        break;
      }
      result.push(...data);
    }
  }
  return result;
}
function getOnePageProductData(ctoken, selected, orderBy, pageNO = 1) {
  const params = {
    action: `CommonAction`,
    iName: `getVipEffectiveProductsAndStats`,
    isVip: true,
    ctoken,
  };
  const form = {
    statisticsType: `week`,
    selected,
    terminalType: `total`,
    isMyselfUpgraded: true,
    orderBy,
    orderModel: `desc`,
    pageSize: `30`,
    pageNO,
    prodRateLevel: ``,
    name: ``,
    isPlatformNewProd: ``,
    statisticType: `os`,
    region: `os`,
    isVip: true,
  };
  return Axios({
    url: `https://hz-mydata.alibaba.com/self/.json`,
    method: `post`,
    params,
    data: qs.stringify(form),
  }).then((res) => {
    const data = getNested(res, "value", "products", "data");
    const recordCount = getNested(res, "value", "products", "recordCount");
    if (isArrayLength(data)) {
      return {
        data: data.map((m) => {
          return {
            id: m.id,
            mcFbUv: m.mcFbUv,
            atmFbUv: m.atmFbUv,
          };
        }),
        recordCount,
      };
    }
    return {
      data: [],
      recordCount: 0,
    };
  });
}

function getCampaignProductIds(campaign) {
  const form = {
    ads: `{"productLineId":110101}`,
    type: `normal`,
    data: `{"queryEffect":{"interval":"all","mode":"online"},"mode":"realTime"}`,
    _csrf: csrf,
  };
  return Axios({
    url: `https://www2.alibaba.com/api/campaign/${campaign.id}/adgroup/batch`,
    method: "post",
    data: qs.stringify(form),
  })
    .then((res) => {
      if (isArrayLength(res.data)) {
        return res.data.map((m) => m.productId);
      }
      return [];
    })
    .catch((err) => {
      console.log(`获取${campaign.title}下的产品失败了: ${err}`);
    });
}

async function getFourWeekProductData(ctoken, orderBy) {
  const data = [];
  for (let i = 1; i <= 4; i++) {
    const weekData = await getWeekProductData(ctoken, i, orderBy);
    data.push(...weekData);
  }
  return data;
}

async function getFourWeekCampaignDetail(campaign, dateRanges) {
  const data = [];
  for (const dateRange of dateRanges) {
    const result = await getCampaignDetail(dateRange, campaign);
    data.push(...result);
  }
  return data;
}

function accumulationData(data) {
  const obj = {
    impr: 0,
    click: 0,
    cpc: 0,
    cost: 0,
  };
  for (const item of data) {
    obj.impr += item.impr;
    obj.click += item.click;
    obj.cpc += item.cpc;
    obj.cost += item.cost;
  }
  obj.cpc = obj.cpc / data.length;
  return obj;
}

async function getCampaignData(ctoken) {
  const campaigns = await getCampaigns();
  // const dateRanges = await getDateRangeArray();
  const today = moment();
  const lastSaturday = today.subtract(1, "week").day(6);
  const endDate = lastSaturday.format("YYYY-MM-DD 23:59:59");
  const beginDate = lastSaturday
    .subtract(27, "day")
    .format("YYYY-MM-DD 00:00:00");
  // console.log("🚀 ~ getCampaignData ~ lastSaturday:", beginDate, lastSaturday);

  const campaignData = [];
  // 产品近四周数据 2百分比
  // const fourWeekMcFbUvDescData = await getFourWeekProductData(ctoken, "mcFbUv");
  // const fourWeekAtmFbUvDescData = await getFourWeekProductData(
  //   ctoken,
  //   "atmFbUv"
  // );
  infoProgress(2);
  // 推广计划近四周数据 8百分比
  for (const campaign of campaigns) {
    const campaignInfo = await getCampaignStats(
      campaign.id,
      beginDate,
      endDate
    );
    // const data = await getFourWeekCampaignDetail(campaign, dateRanges);
    // const campaignInfo = accumulationData(data);
    // const productIds = await getCampaignProductIds(campaign);
    // 计划名
    campaignInfo.title = campaign.title;
    // 计划类型
    campaignInfo.type = campaign.type;
    // 开启状态
    campaignInfo.onlineStatus = campaign.onlineStatus;
    // 询盘 TM
    // if (isArrayLength(productIds)) {
    //   const mcFbUvDescData = fourWeekMcFbUvDescData.filter((f) =>
    //     productIds.includes(f.id)
    //   );
    //   const atmFbUvDescData = fourWeekAtmFbUvDescData.filter((f) =>
    //     productIds.includes(f.id)
    //   );
    //   campaignInfo.mcFbUv = mcFbUvDescData
    //     .map((m) => m.mcFbUv)
    //     .reduce((pre, cur) => pre + cur, 0);
    //   campaignInfo.atmFbUv = atmFbUvDescData
    //     .map((m) => m.atmFbUv)
    //     .reduce((pre, cur) => pre + cur, 0);
    // }
    campaignData.push(campaignInfo);
    infoProgress(8 / campaigns.length);
  }
  return campaignData
    .filter((f) => f.impsCnt && f.clickCnt)
    .sort((a, b) => b.impr - a.impr);
}

const p4pService = {
  /**
   * 直通车分析
   * @param {*} ctoken
   */
  async p4pDataAnalyse(ctoken, progressPort) {
    await init(ctoken, progressPort);
    // 引流关键词 40百分比
    let keywordAnalyseData = await getKeywordAnalyseData(ctoken);
    console.log("引流关键词", keywordAnalyseData);
    // console.log(keywordAnalyseData);
    // 付费推广产品 40百分比
    let productAnalyseData;
    if (promotionList && promotionList.length > 0) {
      productAnalyseData = promotionList;
    } else {
      productAnalyseData = await getProductData(true);
    }
    console.log("付费推广产品", productAnalyseData);
    // 推广计划 20百分比
    const campaignData = await getCampaignData(ctoken);
    console.log("推广计划数据", campaignData);
    // console.log(productAnalyseData);
    const moduleName = "p4pAnalyse";
    progressPort.postMessage({ moduleName, progress: 100 });
    return { keywordAnalyseData, productAnalyseData, campaignData };
  },
};

export default p4pService;
