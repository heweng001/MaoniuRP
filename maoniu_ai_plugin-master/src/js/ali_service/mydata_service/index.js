import { Axios } from "common";
import qs from "qs";
import { isJson, subStringBetween } from "util/index";
import { ALI_REPORT } from "@/js/service/report/api";
// import * as Const from "const"
import sleep from "../../util/sleep";
import { getNested } from "../../util";
import sameIndustryService from "@/js/ali_service/same_industry_service";
import { productConversionData as productConversion } from "../../ali_service";
import commonService from "@/js/service/commonService";
import axios from "axios";
import {
  URL_ASYNC_QUERY_PRODUCT_LIST,
  URL_OFF_SHELF_INVALID_PRODUCT,
} from "@/js/const/ali-const";

// const MESSAGE = "查询太频繁，请明日再试！";
let progressPort;
let ctoken;

const nonFormHeaders = {
  "content-type": "application/x-www-form-urlencoded",
};

// 引流关键词
function getGuideKeywordsPromise(ctoken, keyword) {
  const param = {
    isVip: true,
    action: "OneAction",
    iName: "vip/kwIndex/searchWords",
    queryRaw: keyword,
    nd: "30d",
    terminalType: "TOTAL",
    countryId: "TOTAL",
    ctoken: ctoken,
  };
  return Axios({
    url: "https://hz-mydata.alibaba.com/self/.json",
    method: "get",
    headers: nonFormHeaders,
    params: param,
  })
    .then((res) => {
      if (res && res.code === 0) {
        return res.data;
      }
      return [];
    })
    .catch((err) => {
      console.log(`引流关键词getGuideKeywordsPromise：${err}`);
      return [];
    });
}

function getVipProductTrendsAndOperatorionsForm(
  statisticsType,
  selectd,
  productId
) {
  const form = {
    statisticType: "os",
    region: "os",
    statisticsType: `${statisticsType}`,
    selected: `${selectd}`,
    isMyselfUpgraded: true,
    orderBy: "views",
    orderModel: "desc",
    pageSize: 30,
    pageNO: 1,
    productId,
  };
  return qs.stringify(form);
}

// 根据产品ID获取最近30天数据效果
function mydata30DaysSingleProductEffectPromise(ctoken, productId) {
  let url = ALI_REPORT.postAli7DaysSingleProductStat;
  let params = {
    action: "CommonAction",
    iName: "getVipProductTrendsAndOperatorions",
    isVip: true,
    ctoken,
  };
  let form = getVipProductTrendsAndOperatorionsForm("day", 1, productId);
  return Axios({
    method: "post",
    url,
    data: form,
    params,
    headers: nonFormHeaders,
  })
    .then((res) => {
      // let {
      //   value
      // } = res;
      let value = getNested(res, "value");
      if (Object.hasOwn(res, "successed") && res.successed) {
        if (value && value.length > 0) {
          return value;
        }
      }
      return [];
    })
    .catch((err) => {
      console.log(
        `根据产品ID获取最近30天数据效果singleProductEffect30DaysPromise${err}`
      );
      return [];
    });
}

// 根据产品ID获取周数据效果
function mydataWeekSingleProductEffectPromise(ctoken, productId) {
  let url = ALI_REPORT.postAli7DaysSingleProductStat;
  let params = {
    action: "CommonAction",
    iName: "getVipProductTrendsAndOperatorions",
    isVip: true,
    ctoken,
  };
  let form = getVipProductTrendsAndOperatorionsForm("week", 1, productId);
  return Axios({
    method: "post",
    url,
    data: form,
    params,
    headers: nonFormHeaders,
  })
    .then((res) => {
      // let {
      //   value
      // } = res;
      let value = getNested(res, "value");
      if (Object.hasOwn(res, "successed") && res.successed) {
        if (value && value.length > 0) {
          return value;
        }
      }
      return [];
    })
    .catch((err) => {
      console.log(
        `根据产品ID获取最近30天数据效果singleProductEffect30DaysPromise${err}`
      );
      return [];
    });
}

// 获取账户数据管家最近4周数据合计
async function account4WeeksReportPromise(ctoken) {
  let url = ALI_REPORT.getAliLastMonthStaffStats;
  let params = {
    action: "OneAction",
    iName: "vip/home/getShopTrends",
    ctoken,
    statisticType: "os",
    region: "os",
    isVip: true,
    statisticsType: "week",
    selected: 1,
  };
  let accountReport = {
    totalClickCount: 0,
    totalImpressionCount: 0,
    totalFeedbackCount: 0,
  };
  return Axios({
    method: "get",
    url,
    params,
  })
    .then((res) => {
      if (Object.hasOwn(res, "code") && res.code === 0) {
        let data = getNested(res, "data");
        if (data && data.length > 0) {
          data = data.slice(0, 4);
          for (let item of data) {
            accountReport.totalImpressionCount += item.searchImps;
            accountReport.totalClickCount += item.searchClicks;
            accountReport.totalFeedbackCount += item.fbPv;
          }
          console.log("accountReport", accountReport);
          return accountReport;
        }
      }
      return accountReport;
    })
    .catch((err) => {
      console.log(
        `获取账户数据管家最近4周数据合计account4WeeksReportPromise：${err}`
      );
      return accountReport;
    });
}

/**
 * {点击率，反馈率}
 */
async function accountReportRate(ctoken) {
  let accountReport = await account4WeeksReportPromise(ctoken);
  let accountClickRate =
    accountReport.totalClickCount / accountReport.totalImpressionCount;
  let accountFeedbackRate =
    accountReport.totalFeedbackCount / accountReport.totalClickCount;
  return {
    accountClickRate,
    accountFeedbackRate,
  };
}

function weekShelfAndEffectProductParam(ctoken) {
  return {
    action: "CommonAction",
    iName: "getVipEffectiveProductsAndStats",
    isVip: true,
    ctoken,
  };
}

function weekShelfAndEffectProductForm(
  pageNo = 1,
  selected = 1,
  orderBy = "views",
  shelf = true
) {
  const form = {
    statisticType: "os",
    region: "os",
    statisticsType: "week",
    selected: selected,
    isMyselfUpgraded: true,
    orderBy: orderBy,
    orderModel: "desc",
    pageSize: 30,
    pageNO: pageNo,
  };
  if (!shelf) {
    form.hasEffect = "hasEffect";
  }
  return qs.stringify(form);
}

function mydataWeekProductEffectCountPromise(ctoken, shelf) {
  let url = ALI_REPORT.postAli7DaysSingleProductStat;
  let params = weekShelfAndEffectProductParam(ctoken);
  let form = weekShelfAndEffectProductForm(1, 1, "views", shelf);
  return Axios({
    method: "post",
    url,
    data: form,
    params,
    headers: nonFormHeaders,
  })
    .then((res) => {
      let recordCount = getNested(res, "value", "products", "recordCount");
      if (Object.hasOwn(res, "successed") && res.successed) {
        return recordCount;
      }
      return 0;
    })
    .catch((err) => {
      console.log(`产品效果数据mydata4WeeksProductEffectPromise${err}`);
      return 0;
    });
}
// 产品效果数据
function mydataWeekProductEffectPromise(page, selected, ctoken, shelf) {
  let url = ALI_REPORT.postAli7DaysSingleProductStat;
  let params = weekShelfAndEffectProductParam(ctoken);
  let form = weekShelfAndEffectProductForm(page, selected, "views", shelf);
  return Axios({
    method: "post",
    url,
    data: form,
    params,
    headers: nonFormHeaders,
  })
    .then((res) => {
      let data = getNested(res, "value", "products", "data");
      if (Object.hasOwn(res, "successed") && res.successed) {
        if (data && data.length > 0) {
          return data;
        }
      }
      return [];
    })
    .catch((err) => {
      console.log(`产品效果数据mydataWeekProductEffectPromise${err}`);
      return [];
    });
}

// 流量来源-趋势（最近6个月）
// indicators: {shop_uv -> 店铺访问人数， fb_mc_uv -> 店铺询盘人数， fb_uv -> 店铺TM咨询人数}
// function getChannelTrendsMonthDataPromise(indicators, selected, ctoken) {
//   let url = Const.ALI_PRODUCT_STATS_HOST + "self/.json";
//   let params = {
//     action: 'OneAction',
//     iName: 'vip/channel/trends',
//     isVip: true,
//     ctoken,
//     statisticsType: 'month',
//     selected,
//     terminalType: "total",
//     hideNoEffectitem: true,
//     statisticType: 'os',
//     region: 'os',
//     channelType: '搜索',
//     indicators
//   };
//   return Axios({
//     method: "get",
//     url,
//     params,
//   }).then(res => {
//     // let {
//     //   data
//     // } = res;
//     let data =getNested(res, "data")
//     if (Object.hasOwn(res, "code") && res.code === 0) {
//       if (data && data.length > 0) {
//         return data;
//       }
//     }
//     return [];
//   }).catch((err) => {
//     console.log(`流量来源-趋势trafficMonthDataPromise${err}`);
//     return [];
//   })
// }

// 数据概览-趋势
// function getShopTrendsMonthDataPromise(cateId, selected, seperateByCate, ctoken) {
//   let url = Const.ALI_PRODUCT_STATS_HOST + "self/.json";
//   let params = {
//     action: 'OneAction',
//     iName: 'vip/home/custom/getShopTrends',
//     isVip: true,
//     ctoken,
//     statisticsType: 'month',
//     selected,
//     terminalType: "total",
//     cateId,
//     isMyselfUpgraded: true,
//     seperateByCate,
//     statisticType: 'os',
//     region: 'os'
//   };
//   return Axios({
//     method: "get",
//     url,
//     params,
//   }).then(res => {
//     let returnValue = getNested(res,"data","returnValue")
//     if (Object.hasOwn(res, "code") && res.code === 0) {
//       if (returnValue && returnValue.length > 0) {
//         return returnValue;
//       }
//     }
//     return [];
//   }).catch((err) => {
//     console.log(`数据概览-趋势trafficMonthDataPromise${err}`);
//     return [];
//   })
// }

// 数据管家-类目选择
async function getLvl3Industries(ctoken) {
  let url = ALI_REPORT.getAliIndustries;
  let params = {
    action: "CommonAction",
    iName: "getLvl3Industries",
    ctoken: ctoken,
    statisticType: "os",
    region: "os",
    isVip: true,
    statisticsType: "month",
    selected: 1,
  };
  return Axios({
    url,
    method: "get",
    params,
  }).then((res) => {
    const { successed, value } = res;
    if (successed) {
      return value;
    }
  });
}

// 获得买家喜好度第一的产品ID
// function getSourceKeywordFavoriteProductId(keyword, ctoken) {
//   let url = "https://compass.alibaba.com/search/purchasingrec/AsyncGetPurchasingRec.do";
//   let params = {
//     keyword: keyword,
//     ctoken
//   };
//   return Axios({
//     method: "get",
//     url,
//     params,
//     headers: nonFormHeaders
//   }).then((res) => {
//     let data = res;
//     if (data && data.categoryInfos) {
//       let suppliers = data.categoryInfos[0].suppliers;
//       if (suppliers) {
//         let favProductSuppler = suppliers.sort((o1, o2) => {
//           let [o1Inquiry, o2Inquiry] = [o1.performanceDataInquiry, o2.performanceDataInquiry];
//           return parseInt(o2Inquiry.replace('+', '')) - parseInt(o1Inquiry.replace('+', ''))
//         })[0];
//         return {
//           productId: favProductSuppler.productId,
//           favorProductImage: favProductSuppler.productImg
//         }
//       }
//     }
//     return {};
//   }).catch((err) => {
//     console.log(`获得买家喜好度第一的产品IDgetSourceKeywordFavoriteProductId${err}`);
//     return {}
//   })
// }
// 获得买家喜好度前三的产品ID
function getSourceKeywordTop3FavoriteProductId(keyword, ctoken) {
  let url =
    "https://compass.alibaba.com/search/purchasingrec/AsyncGetPurchasingRec.do";
  let params = {
    keyword: keyword,
    ctoken,
  };
  return Axios({
    method: "get",
    url,
    params,
    headers: nonFormHeaders,
  })
    .then((res) => {
      let data = res;
      if (data && data.categoryInfos) {
        let suppliers = data.categoryInfos[0].suppliers;
        if (suppliers) {
          return suppliers
            .sort((o1, o2) => {
              let [o1Inquiry, o2Inquiry] = [
                o1.performanceDataInquiry,
                o2.performanceDataInquiry,
              ];
              return (
                parseInt(o2Inquiry.replace("+", "")) -
                parseInt(o1Inquiry.replace("+", ""))
              );
            })
            .slice(0, 3)
            .map((item) => {
              return {
                productId: item.productId,
                favorProductImage: item.productImg,
              };
            });
        }
      }
      return [];
    })
    .catch((err) => {
      console.log(
        `获得买家喜好度第一的产品IDgetSourceKeywordFavoriteProductId${err}`
      );
      return [];
    });
}
/**
 * 获取来源词买家喜爱产品数据（标题、fob、moq）
 * https://compass.alibaba.com/detail/compareProducts.html
 */
function getFavoriteProductData(productIds) {
  let url = "https://www.alibaba.com/detail/compareProducts.html";
  let compareId = sameIndustryService.getCompareId(productIds);
  let params = {
    ids: productIds.join(","),
    compareId,
  };
  return Axios({
    url,
    method: "get",
    params,
    headers: nonFormHeaders,
  })
    .then(async (res) => {
      let result = {};
      let listView = subStringBetween(res, "data: ", " });");
      if (listView) {
        const promises = JSON.parse(listView).listView.map(async (value) => {
          let productId = getNested(value, "compareProductView", "productId");
          let title = getNested(value, "compareProductView", "title");
          let productDetailUrl = getNested(
            value,
            "compareProductView",
            "productDetailUrl"
          );
          if (!result[productId]) {
            result[productId] = {};
          }
          result[productId]["favorProductSubject"] = title;
          const productUrl = productDetailUrl.startsWith("http")
            ? productDetailUrl
            : "https:" + productDetailUrl;
          result[productId]["favorProductUrl"] = productUrl;
          result[productId]["priceInfo"] = await getProductPriceInfo(
            productUrl
          );
        });
        await Promise.all(promises);
        return result;
      } else {
        return result;
      }
    })
    .catch((err) => {
      console.log(
        `获取来源词买家喜爱产品数据（标题、fob、moq）getFavoriteProductData${err}`
      );
      return {};
    });
}

function mergeProductEffectData(productEffectList) {
  let productEffectIdMap = {};
  productEffectList.forEach((item) => {
    let obj = productEffectIdMap[item.id];
    if (!obj) {
      productEffectIdMap[item.id] = Object.assign({}, item);
      // eslint-disable-next-line no-unused-vars
      productEffectIdMap[item.id].keywordEffectMap = item.keywordEffect.reduce(
        (acc, cur) => {
          acc[cur.keyword] = convertKeywordEffectData(cur);
          return acc;
        },
        {}
      );
    } else {
      obj.sumProdClickNum += item.sumProdClickNum;
      obj.sumProdShowNum += item.sumProdShowNum;
      obj.sumProdFbNum += item.sumProdFbNum;
      obj.sumProdVisitorCnt += item.sumProdVisitorCnt;
      // 添加 TM 咨询人数
      obj.tmUv += item.tmUv;

      item.keywordEffect.forEach((k) => {
        let keywordEffect = obj.keywordEffectMap[k.keyword];
        if (!keywordEffect) {
          obj.keywordEffectMap[k.keyword] = convertKeywordEffectData(k);
        } else {
          keywordEffect.clicks += Number(k.clicks);
          keywordEffect.views += Number(k.views);
          keywordEffect.p4pClicks += Number(k.p4pClicks);
          keywordEffect.p4pViews += Number(k.p4pViews);
        }
      });
    }
  });
  const result = Object.values(productEffectIdMap);
  result.forEach((item) => {
    item.sumProdClickRate = item.sumProdClickNum / item.sumProdShowNum;
    item.sumProdFbRate = item.sumProdFbNum / item.sumProdClickNum;
    item.sumProdFbClickRate = item.sumProdFbNum / item.sumProdClickNum;
    item.sumProdFbVisitorRate = item.sumProdFbNum / item.sumProdVisitorCnt;
  });
  return result;
}

function filterProductEffect(productEffectList) {
  console.log("productEffectList is  ", productEffectList);
  let filteredProductEffectIdList = [];
  // 曝光点击反馈降序各取10个
  filteredProductEffectIdList.push(
    ...productEffectList
      .sort((p1, p2) => p2.sumProdFbNum - p1.sumProdFbNum)
      .map((p) => p.id)
      .slice(0, 10)
  );
  filteredProductEffectIdList.push(
    ...productEffectList
      .sort((p1, p2) => p2.sumProdClickNum - p1.sumProdClickNum)
      .map((p) => p.id)
      .slice(0, 10)
  );
  filteredProductEffectIdList.push(
    ...productEffectList
      .sort((p1, p2) => p2.sumProdShowNum - p1.sumProdShowNum)
      .map((p) => p.id)
      .slice(0, 10)
  );
  filteredProductEffectIdList.push(
    ...productEffectList
      .sort((p1, p2) => p2.sumProdVisitorCnt - p1.sumProdVisitorCnt)
      .map((p) => p.id)
      .slice(0, 10)
  );
  let filteredProductEffectList = productEffectList.filter((p) =>
    filteredProductEffectIdList.includes(p.id)
  );
  return filteredProductEffectList;
}

function convertKeywordEffectData(keywordEffect) {
  keywordEffect.clicks = Number(keywordEffect.clicks);
  keywordEffect.views = Number(keywordEffect.views);
  keywordEffect.p4pClicks = Number(keywordEffect.p4pClicks);
  keywordEffect.p4pViews = Number(keywordEffect.p4pViews);
  return keywordEffect;
}

// function getCsrfToken() {
//   let url = ALI_REPORT.getAliCsrfToken;
//   return Axios({
//     method: "get",
//     url,
//     headers: nonFormHeaders
//   }).then(res => {
//     let start = "value:'";
//     let end = "'";
//     let remain = res.substring(res.indexOfEnd(start));
//     let result = remain.substring(0, remain.indexOf(end));
//     return result;
//   }).catch(() => {})
// }

// function getLastFourWeekEndDate() {
//   let today = new Date();
//   return new Date(today.getFullYear(), today.getMonth(), today.getDate() - (today.getDay() + 7) % 7)
// }

// function convertMapToArray(aMap) {
//   const array = [];
//   aMap.forEach((v, k) => {
//     array.push({
//       id: k,
//       number: v
//     })
//   });
//   return array;
// }
// async function getSearchVisitorConversionRate(ctoken) {
//   try {
//     const shopVisitorTrends = await getChannelTrendsMonthDataPromise("shop_uv", 1, ctoken);
//     const shopVisitorTrends2 = await getChannelTrendsMonthDataPromise("shop_uv", 2, ctoken);
//     shopVisitorTrends.unshift(shopVisitorTrends2[0]);
//     const shopFeedbackTrends = await getChannelTrendsMonthDataPromise("fb_mc_uv", 1, ctoken);
//     const shopFeedbackTrends2 = await getChannelTrendsMonthDataPromise("fb_mc_uv", 2, ctoken);
//     shopFeedbackTrends.unshift(shopFeedbackTrends2[0]);
//     const shopTmTrends = await getChannelTrendsMonthDataPromise("fb_uv", 1, ctoken);
//     const shopTmTrends2 = await getChannelTrendsMonthDataPromise("fb_uv", 2, ctoken);
//     shopTmTrends.unshift(shopTmTrends2[0]);
//     let searchVisitorData = [];
//     for (let i = 0; i < shopVisitorTrends.length; i++) {
//       const visitor = shopVisitorTrends[i];
//       const feedback = shopFeedbackTrends[i];
//       const tm = shopTmTrends[i];
//       const statDate = visitor.statDate;
//       const me = (feedback.fbUv + tm.tmUv) / visitor.detailUv;
//       const meWithFbTm = me;
//       const meWithFb = feedback.fbUv / visitor.detailUv;
//       const rivalAvg = (feedback.fbUvRivalAvg + tm.tmUvRivalAvg) / visitor.detailUvRivalAvg;
//       const rivalAvgWithFbTm = rivalAvg;
//       const rivalAvgWithFb = (feedback.fbUvRivalAvg) / visitor.detailUvRivalAvg;

//       const rivalGood = (feedback.fbUvRivalGood + tm.tmUvRivalGood) / visitor.detailUvRivalGood;
//       await sleep(500)
//       searchVisitorData.push({
//         me,
//         meWithFb,
//         meWithFbTm,
//         rivalAvg,
//         rivalAvgWithFb,
//         rivalAvgWithFbTm,
//         rivalGood,
//         statDate
//       })
//     }
//     return searchVisitorData.reverse();
//   } catch (e) {
//     console.error(`getSearchVisitorConversionRate获取全店搜索访客转化率异常${e}`);
//     return [];
//   }

// }

// async function getLevel2CategoryConversionRate(ctoken) {
//   try {
//     const industries = await getLvl3Industries(ctoken);
//     let industryId = null;
//     if (industries && industries.length && industries.length > 0) {
//       industryId = industries[0].parentIndustryId;
//     }
//     const shopTrendsMonthData = await getShopTrendsMonthDataPromise(industryId, 1, false, ctoken);
//     const shopTrendsMonthData2 = await getShopTrendsMonthDataPromise(industryId, 2, false, ctoken);
//     shopTrendsMonthData.push(shopTrendsMonthData2[shopTrendsMonthData2.length - 1]);
//     let shopTrendsData = [];
//     for (let i = 0; i < shopTrendsMonthData.length; i++) {
//       const trend = shopTrendsMonthData[i];
//       let statDate = getNested(trend, "statDate")
//       const me = (trend.fbUv + trend.tmUv) / trend.shopUv;
//       const meWithFbTm = me;
//       const meWithFb = (trend.fbUv) / trend.shopUv;
//       const rivalAvg = (trend.fbUvRivalAvg + trend.tmUvRivalAvg) / trend.shopUvRivalAvg;
//       const rivalAvgWithFbTm = rivalAvg;
//       const rivalAvgWithFb = (trend.fbUvRivalAvg) / trend.shopUvRivalAvg;
//       const rivalGood = (trend.fbUvRivalGood + trend.tmUvRivalGood) / trend.shopUvRivalGood;
//       await sleep(500)
//       shopTrendsData.push({
//         me,
//         meWithFb,
//         meWithFbTm,
//         rivalAvg,
//         rivalAvgWithFb,
//         rivalAvgWithFbTm,
//         rivalGood,
//         statDate
//       })
//     }
//     return shopTrendsData;
//   } catch (e) {
//     console.error(`getLevel2CategoryConversionRate全店二级类目访客转化率${e}`);
//     return [];
//   }

// }

let currentProgress = 0;
function infoProgress(progress) {
  const moduleName = "transformAnalyse";
  currentProgress += progress;
  progressPort.postMessage({ moduleName, progress: currentProgress });
}
function resetScore() {
  currentProgress = 0;
}

function getMainCate(ctoken) {
  const url = "https://hz-mydata.alibaba.com/self/.json";
  const params = {
    action: "OneAction",
    iName: "common/getMainCate",
    ctoken,
  };
  return Axios({
    url,
    method: "get",
    params,
  })
    .then((res) => {
      return res.data;
    })
    .catch((e) => {
      console.error(`转化分析-获取店铺主营类目出错${e}`);
    });
}

async function getMainCategoryData(ctoken) {
  const mainCate = await getMainCate(ctoken);
  let { mainCateLv1, mainCateLv1Desc, mainCateLv2, mainCateLv2Desc } = mainCate;
  const industries = await getLvl3Industries(ctoken);
  let industryData = industries.filter(
    (item) => item.parentIndustryId === mainCateLv2
  )[0];
  let result = {
    mainCateLv1,
    mainCateLv1Desc,
    mainCateLv2,
    mainCateLv2Desc,
    mainCateLv3: industryData.industryId,
    mainCateLv3Desc: industryData.industryDesc,
  };
  return result;
}

async function getShopTrendsMonthData(ctoken, mainCateLv3) {
  let url = "https://hz-mydata.alibaba.com/self/.json";
  let params = {
    action: "OneAction",
    iName: "vip/home/custom/getShopTrends",
    statisticsType: "month",
    isVip: true,
    selected: 1,
    terminalType: "total",
    isMyselfUpgraded: true,
    cateId: mainCateLv3,
    statisticType: "os",
    region: "os",
    seperateByCate: true,
    ctoken,
  };
  return Axios({
    method: "get",
    url,
    params,
  })
    .then((res) => {
      let returnValue = getNested(res, "data", "returnValue");
      if (Object.hasOwn(res, "code") && res.code === 0) {
        if (returnValue && returnValue.length > 0) {
          return returnValue;
        }
      }
      return [];
    })
    .catch((err) => {
      console.log(`数据概览-趋势trafficMonthDataPromise${err}`);
      return [];
    });
}

async function getLevel3CategoryConversionRate(ctoken) {
  try {
    const mainCategoryData = await getMainCategoryData(ctoken);
    const shopTrendsData = await getShopTrendsMonthData(
      ctoken,
      mainCategoryData.mainCateLv3
    );
    return { mainCategoryData, shopTrendsData };
  } catch (e) {
    console.error(`getLevel3CategoryConversionRate主营三级类目点击转化率${e}`);
    return {};
  }
}

function getIneffectiveProductsParam(ctoken) {
  return {
    action: "CommonAction",
    iName: "getIneffectiveProducts",
    isVip: true,
    ctoken,
  };
}

function getIneffectiveProductsForm(time, pageNo) {
  let form = {
    time: time,
    selected: -1,
    orderBy: "time",
    orderModel: "desc",
    pageSize: 10,
    pageNO: pageNo,
  };
  return qs.stringify(form);
}

function noEffectCustomProductTotalPromise(ctoken, param) {
  let url = ALI_REPORT.postAliNoEffectProduct;
  let params = getIneffectiveProductsParam(ctoken);
  let form = getIneffectiveProductsForm(param, 1);
  return Axios({
    method: "post",
    url,
    params,
    data: form,
    headers: nonFormHeaders,
  })
    .then((res) => {
      if (res && Object.hasOwn(res, "successed") && res.successed) {
        let total = getNested(res, "value", "total");
        return total;
      }
      return 0;
    })
    .catch((err) => {
      console.log(`检测零效果产品出错noEffectProductPromise：${err}`);
      return 0;
    });
}

/**
 * Returns a Promise that retrieves a page of ineffective products from a remote server.
 *
 * @param {string} ctoken - a token for authentication.
 * @param {number} page - the page number to retrieve.
 * @time {object} time - an object containing parameters for the request.
 * @return {Promise} a Promise that resolves to an array of data or an empty array if there was an error.
 */
function getIneffectiveProductsPagePromise(ctoken, page = 1, time = 180) {
  let url = ALI_REPORT.postAliNoEffectProduct;
  let params = getIneffectiveProductsParam(ctoken);
  let form = getIneffectiveProductsForm(time, page);
  return Axios({
    method: "post",
    url,
    params,
    data: form,
    headers: nonFormHeaders,
  })
    .then((res) => {
      if (res && Object.hasOwn(res, "successed") && res.successed) {
        // let {
        //   value: {
        //     data
        //   }
        // } = res;
        let data = getNested(res, "value", "data");
        return data;
      }
      return [];
    })
    .catch((err) => {
      console.log(`检测零效果产品出错noEffectProductPromise：${err}`);
      return [];
    });
}

function getIneffectiveProductsPromise(ctoken, page = 1, time = 180) {
  let url = ALI_REPORT.postAliNoEffectProduct;
  let params = getIneffectiveProductsParam(ctoken);
  let form = getIneffectiveProductsForm(time, page);
  return Axios({
    method: "post",
    url,
    params,
    data: form,
    headers: nonFormHeaders,
  })
    .then((res) => {
      return res;
    })
    .catch((err) => {
      console.log(`检测零效果产品出错noEffectProductPromise：${err}`);
      return [];
    });
}

async function noEffectCustomProductListPromise(ctoken, param) {
  const total = await noEffectCustomProductTotalPromise(ctoken, param);
  const pages = total % 10 === 0 ? total / 10 : total / 10 + 1;
  const pros = [];
  for (let i = 1; i <= pages; i++) {
    const p = getIneffectiveProductsPagePromise(ctoken, i, param);
    pros.push(p);
  }
  return (await Promise.all(pros)).flatMap((x) => x);
}
function noEffectUnderProductTotalPromise(ctoken) {
  const url = URL_OFF_SHELF_INVALID_PRODUCT;
  const params = {
    ctoken,
    dmtrack_pageid: "",
    orderType: "gmtCreate",
    pageSize: 10,
    pageNo: 1,
    principalId: "all",
    offShelfType: "",
  };
  return Axios({
    method: "get",
    url,
    params,
  })
    .then((res) => {
      if (Object.hasOwn(res, "success") && res.success === true) {
        return res.totalItem;
      } else {
        return 0;
      }
    })
    .catch((err) => {
      console.log(`出错了请稍后再试:${err}`);
    });
}
function noEffectUnderProductPagePromise(ctoken, i) {
  const url = URL_OFF_SHELF_INVALID_PRODUCT;
  const params = {
    ctoken,
    dmtrack_pageid: "",
    orderType: "gmtCreate",
    pageSize: 10,
    pageNo: i,
    principalId: "all",
    offShelfType: "",
  };
  return Axios({
    method: "get",
    url,
    params,
  })
    .then((res) => {
      if (
        Object.hasOwn(res, "success") &&
        res.success === true &&
        res.productList.length > 0
      ) {
        return res.productList;
      } else {
        return [];
      }
    })
    .catch((err) => {
      console.log(`出错了请稍后再试:${err}`);
    });
}
async function noEffectUnderProductListPromise(ctoken) {
  const total = await noEffectUnderProductTotalPromise(ctoken);
  const page = total % 10 === 0 ? total / 10 : total / 10 + 1;
  const promiseArray = [];
  for (let i = 1; i <= page; i++) {
    const result = noEffectUnderProductPagePromise(ctoken, i);
    promiseArray.push(result);
  }
  const productIdArray = (await Promise.all(promiseArray))
    .flat()
    .map((i) => i.productId);
  return productIdArray;
}

async function getSearchConversionRate(ctoken) {
  const url = "https://hz-mydata.alibaba.com/self/.json";
  let params = {
    action: "OneAction",
    iName: "vip/channel/trends",
    isVip: true,
    statisticsType: "month",
    selected: 1,
    terminalType: "total",
    statisticType: "os",
    region: "os",
    hideNoEffectItem: true,
    channelType: "搜索",
    channelTypeDisp: "搜索",
    indicators: "visitor_to_fb_rate",
    ctoken,
  };
  return Axios({
    url,
    method: "get",
    params,
  }).then((res) => {
    return getNested(res, "data");
  });
}

async function getSystemRecommendRate(ctoken) {
  const url = "https://hz-mydata.alibaba.com/self/.json";
  let params = {
    action: "OneAction",
    iName: "vip/channel/trends",
    isVip: true,
    statisticsType: "month",
    selected: 1,
    terminalType: "total",
    statisticType: "os",
    region: "os",
    hideNoEffectItem: true,
    channelType: "系统推荐",
    channelTypeDisp: "系统推荐",
    indicators: "visitor_to_fb_rate",
    ctoken,
  };
  return Axios({
    url,
    method: "get",
    params,
  }).then((res) => {
    return getNested(res, "data");
  });
}

async function getWeekListProductEffectList(selectedArr, isDataReport) {
  let productEffectPromiseList = [];
  for (const selected of selectedArr) {
    // 获取产品周数据 占比10%
    let recordCount = await mydataWeekProductEffectCountPromise(ctoken, false);
    let pages = recordCount % 30 == 0 ? recordCount / 30 : recordCount / 30 + 1;
    pages = Math.floor(pages);
    for (let page = 1; page <= pages; page++) {
      let productEffectPromise = mydataWeekProductEffectPromise(
        page,
        selected,
        ctoken,
        false
      );
      productEffectPromiseList.push(productEffectPromise);
      await productEffectPromise;
      if (isDataReport) {
        infoProgress(10 / pages);
      }
      await sleep(500);
    }
  }
  return (await Promise.all(productEffectPromiseList)).flatMap((item) => item);
}

// 最近4周的产品效果数据
async function getLatest4WeekProductEffectData(isDataReport) {
  let selectedArr = [1, 2, 3, 4];
  return await getWeekListProductEffectList(selectedArr, isDataReport);
}

// 最近5-8周的产品效果数据
async function getLatest5to8WeekProductEffectData(isDataReport) {
  let selectedArr = [5, 6, 7, 8];
  return await getWeekListProductEffectList(selectedArr, isDataReport);
}

async function getFilterProductList(
  accountClickRate,
  accountFeedbackRate,
  isDataReport
) {
  let productEffectList = await getLatest4WeekProductEffectData(isDataReport);
  let mergedProductEffectList = mergeProductEffectData(productEffectList);
  let filteredProductEffectList = filterProductEffect(mergedProductEffectList);
  console.log("merge result");
  console.log(filteredProductEffectList);
  // 近4周top3fb
  let top3FbProductEffectIdList = filteredProductEffectList
    .slice()
    .filter((p) => p.sumProdFbNum >= 3)
    .sort((p1, p2) => p2.sumProdFbNum - p1.sumProdFbNum)
    .map((p) => p.id)
    .slice(0, 3);

  let highExposure = 0;
  let highClick = 0;
  filteredProductEffectList = filteredProductEffectList.filter((item) => {
    // 高反馈产品：反馈降序取前3
    if (top3FbProductEffectIdList.includes(item.id)) {
      item.fbTop3 = true;
      return true;
    }
    // 高曝光低点击：近4周点击<5，曝光>1000的情况下，近4周点击/曝光<店铺整体点击/曝光的1/3
    if (
      item.sumProdClickNum < 5 &&
      item.sumProdShowNum > 1000 &&
      item.sumProdClickNum / item.sumProdShowNum < (1 / 3) * accountClickRate &&
      ++highExposure <= 3
    ) {
      item.clickRateAbnormal = true;
      return true;
    }
    // 高点击低反馈：近4周反馈<2，点击>15的情况下，产品反馈/点击<店铺整体反馈/点击的1/2
    if (
      item.sumProdFbNum < 2 &&
      item.sumProdClickNum > 15 &&
      item.sumProdFbNum / item.sumProdClickNum <
        (1 / 2) * accountFeedbackRate &&
      ++highClick <= 3
    ) {
      item.fbRateAbnormal = true;
      return true;
    }
    return false;
  });
  // 前5-8周top3fb
  const beforeWeeksTop3FbProductList = mergeProductEffectData(
    await getLatest5to8WeekProductEffectData(isDataReport)
  )
    .slice()
    .filter((p) => p.sumProdFbNum >= 3)
    .sort((p1, p2) => p2.sumProdFbNum - p1.sumProdFbNum)
    .slice(0, 3);
  beforeWeeksTop3FbProductList.forEach((item) => {
    // 较前4周询盘减少产品：前8-5周询盘有在top3，但近1-4周询盘掉出top3的产品。
    if (
      !top3FbProductEffectIdList.includes(item.id) &&
      !filteredProductEffectList.find((p) => p.id === item.id)
    ) {
      const new_item = mergedProductEffectList.find((p) => p.id === item.id);
      // 近4周询盘<前4周询盘
      if (new_item && new_item.sumProdFbNum < item.sumProdFbNum) {
        new_item.fbDrop3 = true;
        new_item.beforeWeeks = item;
        filteredProductEffectList.push(new_item);
      }
    }
  });
  return filteredProductEffectList;
}

function init(port, ctokenValue) {
  progressPort = port;
  ctoken = ctokenValue;
  resetScore();
}

// async function getTransaction(detailId, url) {
//   return Axios({
//     url: `${url}/event/app/productExportOrderQuery/transactionOverview.htm?detailId=${detailId}`,
//     method: "get"
//   }).then(res => {
//     console.log(res.data.data)
//     return res.data.data ? res.data.data : {}
//   })
// }

async function getProductPriceInfo(url) {
  return Axios({
    url,
    method: "get",
  }).then(async (res) => {
    // 详细属性
    let resultJson =
      res.substring(
        res.indexOfEnd("window.detailData = "),
        res.indexOf('"js_ssr"}}}')
      ) + '"js_ssr"}}}';
    let resultStrData = null;
    let result = {};
    if (isJson(resultJson)) {
      resultStrData = JSON.parse(resultJson);
      let price = getNested(resultStrData, "globalData", "product", "price");
      let moq = getNested(resultStrData, "globalData", "product", "moq");
      result.price = price;
      result.moq = moq;
    }
    return result;
  });
}

function getWordAnalyseTotalCount(product, select) {
  let url = "https://hz-mydata.alibaba.com/self/.json";
  // let now = new Date().getTime();
  let params = {
    action: "OneAction",
    iName: "vip/product/360/wordAnalysis/page",
    isVip: true,
    terminalType: "TOTAL",
    statisticType: "os",
    selected: select,
    statisticsType: "week",
    prodId: product.id,
    ctoken: ctoken,
  };
  return Axios({
    url,
    method: "get",
    params,
  })
    .then((res) => {
      return getNested(res, "data", "ALLCOUNT");
    })
    .catch((e) => {
      console.error(e);
    });
}

async function getWordAnalyseData(product, select, i) {
  let url = "https://hz-mydata.alibaba.com/self/.json";
  let params = {
    action: "OneAction",
    iName: "vip/product/360/wordAnalysis/content",
    isVip: true,
    terminalType: "TOTAL",
    statisticType: "os",
    selected: select,
    statisticsType: "week",
    prodId: product.id,
    orderField: "searchImps",
    orderDirection: "desc",
    pageCount: i,
    ctoken: ctoken,
  };
  return Axios({
    url,
    method: "get",
    params,
  }).then((res) => {
    return getNested(res, "data");
  });
}

async function getKeywordWeekEffect(product, select) {
  let totalCount = await getWordAnalyseTotalCount(product, select);
  let totalPage = Math.ceil(totalCount / 10);
  // 减少数据抓取量，产品关键词最多取5页
  totalPage = Math.min(totalPage, 5);
  let result = [];
  for (let i = 1; i <= totalPage; i++) {
    let keywordEffect = await getWordAnalyseData(product, select, i);
    result.push(...keywordEffect);
  }
  return result;
}

function getMergeKeywordEffectData(totalKeywordEffect) {
  let map = {};
  totalKeywordEffect.forEach((item) => {
    let obj = map[item.searchKeyword];
    if (!obj) {
      map[item.searchKeyword] = item;
    } else {
      obj.crtOrdUv += item.crtOrdUv;
      obj.detailUv += item.detailUv;
      obj.fbUv += item.fbUv;
      obj.p4pClickCnt += item.p4pClickCnt;
      obj.p4pExposureCnt += item.p4pExposureCnt;
      obj.searchClicks += item.searchClicks;
      obj.searchImps += item.searchImps;
      obj.tmUv += item.tmUv;
    }
  });
  return Object.values(map);
}

// 获取近4周产品关键词数据
async function getKeywordEffect(product) {
  let selectArray = [1, 2, 3, 4];
  let totalKeywordEffect = [];
  for (let i = 0; i < selectArray.length; i++) {
    totalKeywordEffect.push(
      ...(await getKeywordWeekEffect(product, selectArray[i]))
    );
  }
  let mergeKeywordEffect = getMergeKeywordEffectData(totalKeywordEffect);
  return mergeKeywordEffect;
}

function getEffectSourceWords(keywordEffect) {
  let data1 = keywordEffect
    .filter((item) => item.crtOrdUv > 0 || item.tmUv > 0)
    .sort((k1, k2) => k2.crtOrdUv - k1.crtOrdUv || k2.tmUv - k1.tmUv)
    .slice(0, 5);
  let data1KeywordNames = data1.map((item) => item.searchKeyword);
  let data2 = keywordEffect
    .sort(
      (k1, k2) =>
        k2.searchClicks + k2.p4pClickCnt - (k1.searchClicks + k1.p4pClickCnt) ||
        k2.detailUv - k1.detailUv ||
        k2.searchImps - k1.searchImps
    )
    .filter((item) => !data1KeywordNames.includes(item.searchKeyword))
    .slice(0, 5 - data1.length);
  return [...data1, ...data2];
}

async function getFavoriteProduct(keywordEffect, ctoken) {
  // 买家喜好度前三的产品
  let retryTimes = 0;
  for (let item of keywordEffect) {
    let favorProductInfo = await getSourceKeywordTop3FavoriteProductId(
      item.searchKeyword,
      ctoken
    );
    while (favorProductInfo.length === 0 && retryTimes < 8) {
      console.log(`get top3 favorite product,retry ${retryTimes}`);
      favorProductInfo = await getSourceKeywordTop3FavoriteProductId(
        item.searchKeyword,
        ctoken
      );
      await sleep(500);
      retryTimes++;
    }
    retryTimes = 0;
    Object.assign(item, {
      favorProductInfo,
    });
  }
  // 买家喜好度前三的产品数据（fob，moq，标题）
  let favorProductIds = keywordEffect
    .flatMap((item) => item.favorProductInfo)
    .map((item) => item.productId);
  let favorProductData = await getFavoriteProductData(favorProductIds);
  keywordEffect
    .flatMap((item) => item.favorProductInfo)
    .forEach((k) => {
      Object.assign(k, favorProductData[k.productId]);
    });
}

async function getProductKeywordEffectData(product, ctoken) {
  let result = {};
  //  效果来源词： 店内询盘人数、店内tm人数降序，若>0就抓下来。其余按照点击降序取top3去重，最多取5个词
  // 1)获取产品来源词数据
  let keywordEffect = await getKeywordEffect(product);
  // 2)效果来源词
  let effectSourceWords = getEffectSourceWords(keywordEffect);
  result.effectSourceWords = effectSourceWords;
  if (product.clickRateAbnormal) {
    // 3)高曝光词
    let highSearchImpsWordEffect = keywordEffect
      .sort((k1, k2) => k2.searchImps - k1.searchImps)
      .slice(0, 3);
    await getFavoriteProduct(highSearchImpsWordEffect, ctoken);
    result.highSearchImpsWordEffect = highSearchImpsWordEffect;
  }
  if (product.fbRateAbnormal) {
    // 4)高点击词
    let highClickWordEffect = keywordEffect
      .sort((k1, k2) => k2.searchClicks - k1.searchClicks)
      .slice(0, 3);
    await getFavoriteProduct(highClickWordEffect, ctoken);
    result.highClickWordEffect = highClickWordEffect;
  }
  console.log(result);
  return result;
}

async function getConversionAnalyseList(
  filteredProductEffectList,
  ctoken,
  isDataReport
) {
  let conversionAnalyseList = await Promise.all(
    filteredProductEffectList.map(async (product) => {
      // 产品价格信息
      let productPriceInfo = await getProductPriceInfo(product.detailURL);
      product.priceInfo = productPriceInfo;
      // 效果来源词及近4周数据
      let keywordEffectData = await getProductKeywordEffectData(
        product,
        ctoken
      );
      product.keywordEffect = keywordEffectData;
      if (isDataReport) {
        infoProgress(15 / filteredProductEffectList.length);
      }
      return product;
    })
  );
  return conversionAnalyseList;
}

function getZeroEffectProductIdParams(ctoken, _csrf_token_, page) {
  return {
    statisticsType: "month",
    repositoryType: "all",
    imageType: "all",
    showPowerScore: "",
    uiAdvanceSearch: true,
    detailType: "magic",
    showType: "onlyMarket",
    status: "all",
    page,
    size: 10,
    ctoken,
    _csrf_token_,
    lang: "en_US",
  };
}
async function getZeroEffectProductIdPages(ctoken, _csrf_token_, i = 1) {
  const url = URL_ASYNC_QUERY_PRODUCT_LIST;
  const params = getZeroEffectProductIdParams(ctoken, _csrf_token_, i);
  return axios({
    url,
    method: "get",
    params,
  })
    .then((res) => {
      const pages = getNested(res, "data", "count");
      const products = getNested(res, "data", "products");
      if (pages && products && products.length) {
        return {
          pages,
          products,
        };
      }
      return {
        pages: 0,
        products: [],
      };
    })
    .catch((err) => {
      console.log(`获取getZeroEffectProductIdPages出错了: ${err}`);
    });
}

const mydataService = {
  // 原生接口
  getIneffectiveProductsPromise,
  // 只返回 data
  getIneffectiveProductsPagePromise,
  async getHeatByKeyword(ctoken, keyword) {
    let guideKeywords = await getGuideKeywordsPromise(ctoken, keyword);
    if (guideKeywords && Array.isArray(guideKeywords)) {
      let word = guideKeywords.filter(
        (item) => item.queryRaw === keyword.toLowerCase()
      )[0];
      if (!word) {
        word = guideKeywords.filter(
          (item) => item.queryRaw.indexOf(keyword.toLowerCase()) != -1
        )[0];
      }
      if (!word) {
        word = guideKeywords.filter(
          (item) => keyword.toLowerCase().indexOf(item.queryRaw) != -1
        )[0];
      }
      return word ? word.pv : 0;
    } else {
      return 0;
    }
  },
  getKeywordEffect(ctokenValue, product) {
    ctoken = ctokenValue;
    return getKeywordEffect(product);
  },
  async get30DaysProductEffect(ctoken, productId) {
    return await mydata30DaysSingleProductEffectPromise(ctoken, productId);
  },
  async getWeeksProductEffect(ctoken, productId) {
    return await mydataWeekSingleProductEffectPromise(ctoken, productId);
  },
  /**
   * 转化分析
   * @param reportData 当前的报告数据
   * @param {*} ctoken
   */
  async productAnalyse(reportData, ctokenValue, port) {
    init(port, ctokenValue);
    // 店铺转化分析 进度占比3%
    const conversionRateTableData = await mydataService.shopAnalyseTableData(
      ctoken
    );
    infoProgress(3);
    let productConversionData = [];
    // 产品转化分析 进度占比97%
    if (productConversion && productConversion.length > 0) {
      productConversionData = productConversion;
    } else {
      productConversionData = await mydataService.getProductConversionData(
        ctoken,
        true
      );
    }
    const moduleName = "transformAnalyse";
    progressPort.postMessage({ moduleName, progress: 100 });
    return {
      productConversionData,
      conversionRateTableData,
    };
  },
  // 店铺转化分析表格数据
  async shopAnalyseTableData(ctoken) {
    // 主营三级类目转化率
    let level3CategoryConversionRate = await getLevel3CategoryConversionRate(
      ctoken
    );
    // 店铺商机转化率
    // (1) 搜索流量
    let searchConversionRate = await getSearchConversionRate(ctoken);
    // (2) 系统推荐
    let systemRecommendRate = await getSystemRecommendRate(ctoken);
    const { mainCategoryData, shopTrendsData } = level3CategoryConversionRate;
    return {
      categoryData: mainCategoryData ? mainCategoryData : {},
      categoryConversionRate: shopTrendsData ? shopTrendsData : [],
      searchConversionRate: searchConversionRate,
      systemRecommendRate: systemRecommendRate,
    };
  },
  async getCustomNoEffectProductList(ctoken, param) {
    return await noEffectCustomProductListPromise(ctoken, param);
  },
  async getNoEffectUnderProductList(ctoken) {
    return await noEffectUnderProductListPromise(ctoken);
  },
  async getProductConversionData(ctoken, isDataReport) {
    // 获取账号点击率、反馈率 进度占比2%
    let { accountClickRate, accountFeedbackRate } = await accountReportRate(
      ctoken
    );
    if (isDataReport) {
      infoProgress(2);
    }
    // 获取产品数据 进度占比80%
    let filteredProductEffectList = await getFilterProductList(
      accountClickRate,
      accountFeedbackRate,
      isDataReport
    );
    console.log(filteredProductEffectList);
    // 获取产品价格及效果来源词信息 进度占比15%
    let conversionAnalyseList = await getConversionAnalyseList(
      filteredProductEffectList,
      ctoken,
      isDataReport
    );
    console.log(conversionAnalyseList);
    return conversionAnalyseList;
  },
  async getZeroEffectProductId(ctoken) {
    const _csrf_token_ = await commonService.getXsrfToken();
    const { pages } = await getZeroEffectProductIdPages(ctoken, _csrf_token_);
    if (pages) {
      const total = pages % 10 === 0 ? pages / 10 : pages / 10 + 1;
      const products = [];
      for (let i = 1; i < total; i++) {
        const result = await getZeroEffectProductIdPages(
          ctoken,
          _csrf_token_,
          i
        );
        products.push(...result.products);
      }
      return products.map((m) => m.id);
    }
    return [];
  },
};

export default mydataService;
