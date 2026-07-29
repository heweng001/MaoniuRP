import { Axios } from "common";
import moment from "moment";
import qs from "qs";
import { AI_REPORT, ALI_REPORT } from "@/js/service/report/api";
import { getNested, isArray } from "util";
import mydataService from "../mydata_service";

let csrfToken;

let csrf;
let progressPort;

const nonFormHeaders = { "content-type": "application/x-www-form-urlencoded" };

function getCsrfToken() {
  let url = ALI_REPORT.getAliCsrfToken;
  return Axios({
    method: "get",
    url,
  })
    .then((res) => {
      let start = "value:'";
      let end = "'";
      let remain = res.substring(res.indexOfEnd(start));
      csrfToken = remain.substring(0, remain.indexOf(end));
    })
    .catch(() => {});
}

function getCsrf() {
  let url = "https://showcase.alibaba.com/api/csrf";
  return Axios({
    method: "get",
    url,
  }).then((res) => {
    csrf = res.token;
  });
}

function recently30DaysRange() {
  let now = moment(new Date()).format("YYYY-MM-DD");
  let dateEnd = moment(now).subtract(2, "days").format("YYYY-MM-DD");
  let dateBegin = moment(now).subtract(1, "years").format("YYYY-MM-DD");
  return { dateBegin, dateEnd };
}

function getEmphasisKeywordList(href) {
  let url = AI_REPORT(href).getEmphasisKeyword;
  return Axios({
    method: "get",
    url,
  })
    .then((res) => {
      if (res.success && res.data) {
        return res.data;
      }
      return [];
    })
    .catch(() => []);
}

// function windowListForm(currentPage = 1) {
//   const form = {
//     type: 'normal',
//     json: `{"currentPage": ${currentPage},"pageSize":50,"accountId":""}`,
//     _csrf_token_: csrfToken,
//     _csrf: csrf
//   }
//   return qs.stringify(form)
// }

// function getShowcaseId() {
//   const url = ALI_REPORT.postWindowId;
//   let data = {
//     type: "normal",
//     data: {},
//     _csrf: csrf
//   };
//   return Axios({
//     url,
//     method: "post",
//     data: qs.stringify(data)
//   }).then(res => {
//     return res.data;
//   }).catch(err => {
//     console.log(`获取橱窗id失败 ${err}`)
//   })
// }

// 橱窗列表
function get4WeekShowcaseParams(ctoken) {
  return {
    action: "CommonAction",
    iName: "getVipEffectiveProductsAndStats",
    isVip: true,
    ctoken,
  };
}
function get4WeekShowcaseData(selected, pageNO = 1) {
  const data = {
    statisticsType: "week",
    selected,
    terminalType: "total",
    isMyselfUpgraded: true,
    orderBy: "inquiries",
    orderModel: "desc",
    pageSize: 30,
    pageNO,
    PS: "PS",
    statisticType: "os",
    region: "os",
    isVip: true,
  };
  return qs.stringify(data);
}
async function get4WeekShowcasePromiseList(ctoken) {
  const showcasePromises = [];
  for (let i = 1; i < 5; i++) {
    const result = get1WeekShowcaseList(ctoken, i);
    showcasePromises.push(result);
    infoProgress(2.5);
  }
  return (await Promise.all(showcasePromises)).flat();
}
function get1WeekShowcasePromiseList(ctoken, selected, pageNO = 1) {
  const url = "https://hz-mydata.alibaba.com/self/.json";
  const params = get4WeekShowcaseParams(ctoken);
  const data = get4WeekShowcaseData(selected, pageNO);
  return Axios({
    url,
    method: "post",
    params,
    data,
  })
    .then((res) => {
      if (Object.hasOwn(res, "successed") && res.successed) {
        const showcaseList = getNested(res.value, "products", "data");
        const count = getNested(res.value, "products", "recordCount");
        if (isArray(showcaseList) && showcaseList.length > 0) {
          return { showcaseList, count };
        }
        return [];
      }
      return [];
    })
    .catch((err) => {
      console.log(`获取橱窗失败:${err}`);
    });
}
async function get1WeekShowcaseList(ctoken, selected = 1) {
  const result = await get1WeekShowcasePromiseList(ctoken, selected);
  const { count } = result;
  const page = count % 30 === 0 ? count / 30 : count / 30 + 1;
  const promises = [];
  for (let i = 1; i <= page; i++) {
    const promise = get1WeekShowcasePromiseList(ctoken, selected, i);
    promises.push(promise);
  }
  return (await Promise.all(promises)).map((i) => i.showcaseList).flat();
}
// async function windowListPromise(showcaseId, currentPage = 1) {
//   let url = `https://showcase.alibaba.com/api/campaign/${showcaseId}/adgroup`;
//   let data = {
//     type: "normal",
//     data: JSON.stringify({
//       orderBy: "ad_group_sort",
//       order: "DESC",
//       adgroupOnlineStatus: 1,
//       page: currentPage,
//       size: 50,
//     }),
//     _csrf: csrf

//   };
//   return Axios({
//     url,
//     method: "post",
//     data: qs.stringify(data)
//   }).then(async res => {
//     if (res && res.data) {
//       let { data, totalPages } = res;
//       if (totalPages > currentPage) {
//         data.push(...await windowListPromise(showcaseId, currentPage + 1))
//       }
//       return data;
//     }
//     return [];
//   }).catch(err => {
//     console.log(`检测橱窗操作失败 ${err}`);
//   })
// }
// async function windowListPromiseold(currentPage = 1) {
//   let url = ALI_REPORT.postAliWindowList;
//   let form = windowListForm(currentPage)
//   return Axios({
//     method: "post",
//     url,
//     data: form,
//     headers: nonFormHeaders
//   }).then(async res => {
//     if (Object.hasOwn(res, "status") && res.status) {
//       let { sumLimit, data } = res
//       if (sumLimit - currentPage * 50 > 0) {
//         data.push(...await windowListPromiseold(currentPage + 1))
//       }
//       return data;
//     }
//     return []
//   }).catch((err) => {
//     console.log(`检测橱窗操作windowListPromise：${err}`)
//     return [];
//   })
// }
// 橱窗产品对应的关键词
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
    _csrf: csrf,
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
      console.log(`橱窗产品对应的关键词windowKeywordPromise：${err}`);
      return [];
    });
}
// 信保订单
function last10CreditGuaranteeOrderPromise(ctoken) {
  let { dateBegin: startTime, dateEnd: endTime } = recently30DaysRange();
  let url = ALI_REPORT.getAliLast30DayCreditGuaranteeOrder;
  let params = {
    ctoken,
    pageIndex: 1,
    pageSize: 10,
    startTime: `${startTime}`,
    endTime: `${endTime}`,
  };
  return Axios({
    method: "get",
    url,
    params,
  })
    .then((res) => {
      if (Object.hasOwn(res, "code") && res.code === 200) {
        let {
          data: {
            result: { dealList },
          },
        } = res;
        if (dealList && dealList.length > 0) {
          return dealList.filter((item) => item.orderType === "信用保障订单");
        }
        return [];
      }
      return [];
    })
    .catch((err) => {
      console.log(`检测信保情况last30DayCreditGuaranteeOrderPromise：${err}`);
      return [];
    });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function partition(array, size) {
  return array.length
    ? [array.splice(0, size)].concat(partition(array, size))
    : [];
}
// 橱窗产品最近14天数据合计
async function packProductEffect(ctoken, showcaseProductList) {
  for (let product of showcaseProductList) {
    //控制请求速率
    let productEffects = await mydataService.getWeeksProductEffect(
      ctoken,
      product.productId
    );
    await sleep(500);
    if (productEffects) {
      let productEffectSlice = productEffects
        .sort((p1, p2) => p2.startDate.localeCompare(p1.startDate))
        .slice(0, 4);
      let clicks = productEffectSlice
        .map((item) => item.clicks)
        .reduce((result, i) => result + i, 0);

      let inquiries = productEffectSlice
        .map((item) => item.inquiries)
        .reduce((result, i) => result + i, 0);

      let views = productEffectSlice
        .map((item) => item.views)
        .reduce((result, i) => result + i, 0);

      let visitors = productEffectSlice
        .map((item) => item.visitors)
        .reduce((result, i) => result + i, 0);

      product["clicks"] = clicks;
      product["views"] = views;
      product["clickRate"] = clicks / views;
      product["inquiries"] = inquiries;
      product["inquiryRate"] = inquiries / clicks;
      product["visitors"] = visitors;
    }
    infoProgress(20 / showcaseProductList.length);
  }
}
// 刷新橱窗分析表
async function get14RefreshShowcaseListPromise(ctoken) {
  const total = await get14RefreshShowcaseTotalPromise(ctoken);
  const pages = total % 30 === 0 ? total / 30 : total / 30 + 1;
  let freshs = [];
  for (let i = 0; i < 14; i++) {
    for (let j = 1; j <= pages; j++) {
      const p = get14RefreshShowcasePagesPromise(ctoken, i, j);
      freshs.push(p);
    }
    (await Promise.all(freshs))
      .flatMap((x) => x)
      .map((item) => item.id)
      .forEach((id) => {
        get14RefreshShowcaseTopPagesPromise(ctoken, i, id);
      });
  }
  const newFreshs = (await Promise.all(freshs)).flatMap((x) => x);
  console.log(newFreshs);
  return newFreshs;
}
function get14RefreshShowcasePagesPromise(ctoken, selected, page) {
  let url = "https://hz-mydata.alibaba.com/self/.json";
  let params = RefreshShowcaseParam(ctoken);
  let form = RefreshShowcaseForm(selected, page);
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
            products: { data },
          },
        } = res;
        return data;
      }
      return [];
    })
    .catch((err) => {
      console.log(`刷新橱窗产品出错: ${err}`);
      return [];
    });
}

function get14RefreshShowcaseTotalPromise(ctoken) {
  let url = "https://hz-mydata.alibaba.com/self/.json";
  let params = RefreshShowcaseParam(ctoken);
  let form = RefreshShowcaseForm(0, 1);
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
          value: { products },
        } = res;
        return products.recordCount;
      }
      return 0;
    })
    .catch((err) => {
      console.log(`刷新橱窗产品出错: ${err}`);
      return 0;
    });
}

function RefreshShowcaseParam(ctoken) {
  return {
    action: "CommonAction",
    iName: "getVipEffectiveProductsAndStats",
    isVip: true,
    ctoken,
  };
}
function RefreshShowcaseForm(selected, pageNo) {
  let form = {
    statisticsType: "day",
    selected: selected,
    terminalType: "total",
    isMyselfUpgraded: true,
    orderBy: "views",
    orderModel: "desc",
    pageSize: 30,
    pageNO: pageNo,
    prodRateLevel: "",
    maxClicks: "",
    minClicks: "",
    PS: "PS",
    statisticType: "os",
    region: "os",
    isVip: true,
  };
  return qs.stringify(form);
}
//橱窗分析Top5
async function get14RefreshShowcaseTopPromise(ctoken) {
  const freshsTop = [];
  for (let i = 0; i < 14; i++) {
    const p = get14RefreshShowcaseTopPagesPromise(ctoken, i);
    freshsTop.push(p);
  }
  const newFreshsTop = (await Promise.all(freshsTop)).flatMap((x) => x);
  console.log(newFreshsTop);
  return newFreshsTop;
}
function get14RefreshShowcaseTopPagesPromise(ctoken, i, id) {
  let url = "https://hz-mydata.alibaba.com/self/.json";
  let params = RefreshShowcaseTopParam(ctoken, i, id);
  return Axios({
    method: "get",
    url,
    params,
  }).then((res) => {
    if (res && res.code === 0) {
      let { data } = res;
      return data;
    }
    return [];
  });
}
function RefreshShowcaseTopParam(ctoken, selected, id) {
  return {
    action: "OneAction",
    iName: "vip/product/360/wordAnalysis/content",
    isVip: true,
    terminalType: "TOTAL",
    statisticType: "os",
    selected,
    statisticsType: "day",
    prodId: id,
    orderField: "detailUv",
    orderDirection: "desc",
    ctoken,
  };
}

let currentProgress = 0;
function infoProgress(progress) {
  const moduleName = "showcaseAnalyse";
  currentProgress += progress;
  progressPort.postMessage({ moduleName, progress: currentProgress });
}
function resetScore() {
  currentProgress = 0;
}

function get4WeekReduce(skuArray) {
  const temp = {};
  for (let i in skuArray) {
    const key = skuArray[i].id;
    if (temp[key]) {
      temp[key].atmFbUv += skuArray[i].atmFbUv;
      temp[key].sumProdShowNum += skuArray[i].sumProdShowNum;
      temp[key].sumProdClickNum += skuArray[i].sumProdClickNum;
      temp[key].sumProdClickRate += skuArray[i].sumProdClickRate;
      temp[key].sumProdVisitorCnt += skuArray[i].sumProdVisitorCnt;
      temp[key].sumProdFbNum += skuArray[i].sumProdFbNum;
      temp[key].orderBuyerCnt += skuArray[i].orderBuyerCnt;
    } else {
      temp[key] = {};
      temp[key].atmFbUv = skuArray[i].atmFbUv;
      temp[key].sumProdShowNum = skuArray[i].sumProdShowNum;
      temp[key].sumProdClickNum = skuArray[i].sumProdClickNum;
      temp[key].sumProdClickRate = skuArray[i].sumProdClickRate;
      temp[key].sumProdVisitorCnt = skuArray[i].sumProdVisitorCnt;
      temp[key].sumProdFbNum = skuArray[i].sumProdFbNum;
      temp[key].orderBuyerCnt = skuArray[i].orderBuyerCnt;
    }
    temp[key].id = skuArray[i].id;
    temp[key].imageURL = skuArray[i].imageURL;
    temp[key].detailURL = skuArray[i].detailURL;
    temp[key].subject = skuArray[i].subject;
  }
  const newArray = [];
  for (let k in temp) {
    newArray.push(temp[k]);
  }
  return newArray;
}

function getKeywordRank(keyword, ctoken) {
  const params = {
    action: "CommonAction",
    iName: "getKeywordSearchProducts",
    ctoken,
  };
  const form = {
    keyword,
  };
  return Axios({
    url: `https://hz-mydata.alibaba.com/self/.json`,
    method: "post",
    params,
    data: qs.stringify(form),
  })
    .then((res) => {
      if (res && res.value && res.value.length) {
        const obj = res.value[0];
        return {
          rank: obj.pageNO,
          rankIndex: obj.rowNO,
        };
      }
      return {
        rank: 0,
        rankIndex: 0,
      };
    })
    .catch((err) => {
      console.log(`获取关键词排名页面出错了:${err}`);
    });
}

const showcaseService = {
  /**
   * 橱窗新报
   * @param {*} ctoken
   * @param isReport true内部报告, false外部诊断
   */
  async showcaseTableData(ctoken, isReport = true, port, href) {
    await getCsrfToken();
    await getCsrf();
    resetScore();
    progressPort = port;
    // 获取橱窗产品 占比10%
    // 近四周橱窗产品
    let showcaseProductList = await get4WeekShowcasePromiseList(ctoken);
    // 橱窗4周累加
    showcaseProductList = get4WeekReduce(showcaseProductList);
    // 近一周橱窗产品
    const showcaseProductList1Week = await get1WeekShowcaseList(ctoken);
    const productIds = showcaseProductList1Week.map((i) => i.id);
    showcaseProductList = showcaseProductList.filter((item) =>
      productIds.some((i) => i === item.id)
    );
    // 获取关键词 占比5%
    let showcaseKeywordSet = new Set();
    let keywordArrPromiseList = [];
    const cloneShowcaseProductList = showcaseProductList.map((a) => ({ ...a }));
    let showcaseProductPartitionList = partition(cloneShowcaseProductList, 5);
    for (let partition of showcaseProductPartitionList) {
      keywordArrPromiseList.push(
        ...partition.map(async (showcase) => {
          const keywords = await windowKeywordPromise(showcase.id, ctoken);
          const show = showcaseProductList.find(
            (item) => item.id === showcase.id
          );
          if (show) {
            show["keywords"] = keywords;
          }
          infoProgress(
            5 / showcaseProductPartitionList.length / partition.length
          );
          return keywords;
        })
      );
    }
    await Promise.all(keywordArrPromiseList).then((keywordArrList) => {
      if (!isReport) {
        keywordArrList
          .flatMap((keywordArr) => keywordArr)
          .forEach((keyword) => showcaseKeywordSet.add(keyword.toLowerCase()));
      }
    });

    // 获取橱窗产品效果 占比35%
    for (const item of showcaseProductList) {
      item["keywordEffect"] = [];
      if (item.keywords.length > 0) {
        for (const keyword of item.keywords) {
          getKeywordRank(keyword, ctoken).then((ranks) => {
            const { rank, rankIndex } = ranks;
            mydataService.getHeatByKeyword(ctoken, keyword).then((heat) => {
              item.keywordEffect.push({ rank, rankIndex, keyword, heat });
            });
          });
        }
      }
      item.keywordEffect = item.keywordEffect.sort((a, b) => b.heat - a.heat);
      infoProgress(35 / showcaseProductList.length);
    }
    if (isReport) {
      let emphasisKeywordList = await getEmphasisKeywordList(href);
      if (emphasisKeywordList) {
        showcaseKeywordSet = new Set([
          ...showcaseKeywordSet,
          ...emphasisKeywordList,
        ]);
      }
    }
    // 全部关键词排名查询信息(内部数据使用) 20%
    let totalEmphasisKeywordRankList = [];
    // 重点关键词
    let emphasisKeywordRankList = [];
    let showcaseKeywordRankPromiseList = [];
    let showcaseKeywordPartition = partition(Array.from(showcaseKeywordSet), 5);
    for (let partition of showcaseKeywordPartition) {
      // 根据关键词排名分配到各个产品
      showcaseKeywordRankPromiseList.push(
        ...partition.map(async (keyword) => {
          let rank = await getKeywordRank(keyword, ctoken);
          totalEmphasisKeywordRankList.push(rank);
          rank["keyword"] = keyword;
          let heat = await mydataService.getHeatByKeyword(ctoken, keyword);
          rank["heat"] = heat;
          let showcaseProduct = showcaseProductList.find(
            (item) => rank.rankProductId === item.id
          );
          if (showcaseProduct) {
            if (!showcaseProduct["rankKeywordList"]) {
              showcaseProduct["rankKeywordList"] = [];
            }
            showcaseProduct["rankKeywordList"].push(rank);
          }
          emphasisKeywordRankList.push(rank);
          infoProgress(20 / showcaseKeywordPartition.length / partition.length);
        })
      );
    }
    await Promise.all(showcaseKeywordRankPromiseList);
    console.log("橱窗信保-获取关键词排名 finish");
    // 查询产品效果数据 20%
    await packProductEffect(ctoken, showcaseProductList);
    emphasisKeywordRankList = emphasisKeywordRankList.sort(
      (p1, p2) => p2.heat - p1.heat
    );
    // 获取信保数据 10%
    let creditOrderList = await last10CreditGuaranteeOrderPromise(ctoken);
    infoProgress(10);
    const moduleName = "showcaseAnalyse";
    progressPort.postMessage({ moduleName, progress: 100 });
    return {
      showcaseProductList,
      emphasisKeywordRankList,
      creditOrderList,
      totalEmphasisKeywordRankList,
    };
  },
  async get14RefreshShowcaseList(ctoken) {
    return await get14RefreshShowcaseListPromise(ctoken);
  },
  async get14RefreshShowcaseTop(ctoken) {
    return await get14RefreshShowcaseTopPromise(ctoken);
  },
};

export default showcaseService;
