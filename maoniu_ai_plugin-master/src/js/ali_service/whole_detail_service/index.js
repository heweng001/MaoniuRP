import { Axios } from "@/js/common";
import { ALI_REPORT } from "@/js/service/report/api";
import shopDataService from "@/js/service/shop-data";
import axios from "axios";
import qs from "qs";
import { getNested, isArrayLength } from "util";

export async function showDataOverviewAllField(ctoken) {
  const p_csrf = await getCsrfToken();
  const params = {
    ctoken,
    p_csrf,
  };
  const form = {
    selections:
      "15001,15002,15003,15004,15005,15006,15007,15008,15009,39001,25001,25002,37001",
  };
  return axios({
    url: `https://data.alibaba.com/json/homepage/customize/selections`,
    method: "post",
    params,
    data: qs.stringify(form),
  })
    .then(() => {
      console.log(`已显示数据总览的所有字段`);
    })
    .catch((err) => {
      console.log(`showDataOverviewAllField接口出错了:${err}`);
    });
}

function isVipAccount(ctoken) {
  const params = {
    action: "OneAction",
    iName: "diLab/getRecentOpenInstances",
    ctoken,
  };
  return axios({
    url: `https://hz-mydata.alibaba.com/self/.json`,
    method: "get",
    params,
  })
    .then((res) => {
      return getNested(res, "data", "data", "isVip") || false;
    })
    .catch((err) => {
      console.log(`获取isVipAccount出错了:${err}`);
    });
}

function isFilterChinaTraffic() {
  const url = `https://data.alibaba.com`;
  return axios({
    url,
    method: "get",
  }).then((res) => {
    if (res && res.data) {
      const start = "window.excludeDomesticTraffic =  ";
      const end = " ;";
      const data = res.data.slice(res.data.indexOfEnd(start));
      const str = data.slice(0, data.indexOf(end));
      return str ? JSON.parse(str) : true;
    }
    return true;
  });
}

export async function getDynamicParams(ctoken) {
  const isVip = await isVipAccount(ctoken);
  const isFilterTraffic = await isFilterChinaTraffic();
  return {
    statisticType: isFilterTraffic ? "os" : "all",
    region: isFilterTraffic ? "os" : "all",
    isVip,
  };
}

async function getShopSummary(ctoken, i, industryId, month) {
  const url = ALI_REPORT.getAliIndustries;
  const dynamicParams = await getDynamicParams(ctoken);
  let params = {};
  let weekMonthDelimiter = 4 * month;
  if (i <= weekMonthDelimiter) {
    params = {
      action: "OneAction",
      iName: "vip/home/custom/getShopSummary",
      statisticsType: "week",
      selected: i,
      terminalType: "total",
      isMyselfUpgraded: true,
      cateId: industryId,
      seperateByCate: false,
      ctoken: ctoken,
      ...dynamicParams,
    };
  } else {
    params = {
      action: "OneAction",
      iName: "vip/home/custom/getShopSummary",
      statisticsType: "month",
      selected: i - weekMonthDelimiter,
      terminalType: "total",
      isMyselfUpgraded: true,
      cateId: industryId,
      seperateByCate: false,
      ctoken: ctoken,
      ...dynamicParams,
    };
  }
  return Axios({
    url,
    method: "get",
    params,
  })
    .then((res) => {
      let result = {};
      const values = getNested(res, "data", "returnValue");
      const code = getNested(res, "code");
      if (isArrayLength(values) && code === 0) {
        let data = values[0];
        result.natureClickCnt = getShopSummaryObjectValues(
          data,
          "natureClickCnt"
        );
        result.natureExposureCnt = getShopSummaryObjectValues(
          data,
          "natureExposureCnt"
        );
        result.searchClicks = getShopSummaryObjectValues(data, "searchClicks");
        result.searchImps = getShopSummaryObjectValues(data, "searchImpls");
        result.shopUv = getShopSummaryObjectValues(data, "shopUv");
        result.shopPv = getShopSummaryObjectValues(data, "shopPv");
        result.fbPv = getShopSummaryObjectValues(data, "fbPv");
        result.statDateRange = getNested(data, "statDateRange") || "";
        result.clickRate =
          Math.round((result.searchClicks / result.searchImps) * 10000) /
            10000 || 0;
        result.fbRate =
          Math.round((result.fbPv / result.shopUv) * 10000) / 10000 || 0;
        result.tmUv = getShopSummaryObjectValues(data, "tmUv");
        result.orderCount = getShopSummaryObjectValues(data, "ordCnt");
        result.orderAmount = getShopSummaryObjectValues(data, "ordAmt");
        result.uvAbRate = getShopSummaryObjectValues(data, "uvAbRate");
      } else {
        result.break = true;
      }
      return result;
    })
    .catch((err) => {
      console.log(`获取整体数据出错${err}`);
    });
}

function getShopSummaryObjectValues(data, name) {
  return getNested(data, name, "value") || "";
}

async function getProductData(ctoken, i, shopSummary, month) {
  const url = "https://hz-mydata.alibaba.com/self/.json";
  let params = {};
  let weekMonthDelimiter = month * 4;
  if (i <= weekMonthDelimiter) {
    params = {
      action: "OneAction",
      iName: "vip/product/getProdcutSummary",
      statisticsType: "week",
      selected: i,
      statisticType: "os",
      region: "os",
      isVip: true,
      ctoken: ctoken,
    };
  } else {
    params = {
      action: "OneAction",
      iName: "vip/product/getProdcutSummary",
      statisticsType: "month",
      selected: i - weekMonthDelimiter,
      statisticType: "os",
      region: "os",
      isVip: true,
      ctoken: ctoken,
    };
  }

  await Axios({
    url,
    method: "get",
    params,
  }).then((res) => {
    if (res.data) {
      let data = res.data;
      shopSummary.totalProductCount = data.totalProductCount.value;
      shopSummary.totalVisitProductCount = data.totalVisitProductCount.value;
    }
  });
}

async function getNewProductCount(ctoken, i, shopSummary, month) {
  const url = "https://hz-mydata.alibaba.com/self/.json";
  let params = {};
  let weekMonthDelimiter = month * 4;
  if (i <= weekMonthDelimiter) {
    params = {
      action: "OneAction",
      iName: "vip/home/getAccountsAndTotal",
      ctoken: ctoken,
      statisticType: "os",
      region: "os",
      isVip: true,
      statisticsType: "week",
      selected: i,
    };
  } else {
    params = {
      action: "OneAction",
      iName: "vip/home/getAccountsAndTotal",
      ctoken: ctoken,
      statisticType: "os",
      region: "os",
      isVip: true,
      statisticsType: "month",
      selected: i - weekMonthDelimiter,
    };
  }
  await Axios({
    url,
    method: "get",
    params,
  }).then((res) => {
    if (res.data) {
      let data = res.data;
      shopSummary.newProductCount = data.total.newProductCount;
      shopSummary.alterProductCount = data.total.alterProductCount;
    }
  });
}

function infoProgress(progressPort, progress) {
  const moduleName = "wholeDetailAnalyse";
  progressPort.postMessage({ moduleName, progress });
}

async function getIndustryData(ctoken, nickname, progressPort) {
  const { shopSummaryArray } = await shopDataService.getShopData(
    { init: 3 },
    ctoken,
    nickname,
    progressPort
  );
  return shopSummaryArray;
}

function getCsrfToken() {
  const url = "https://data.alibaba.com";
  return Axios({
    url,
    method: "get",
  })
    .then((res) => {
      const start = "window.csrfToken = '";
      const end = "';";
      const csrfTokenNode = res.slice(res.indexOfEnd(start));
      return csrfTokenNode.slice(0, csrfTokenNode.indexOf(end));
    })
    .catch((err) => {
      console.log(`获取加入词库csrfToken失败了${err}`);
    });
}

const wholeDetailService = {
  async wholeDetail(ctoken, isTrade, nick, progressPort) {
    let result = {};
    //整体数据
    let industryData = await getIndustryData(ctoken, nick, progressPort);
    result.industryData = industryData;
    infoProgress(progressPort, 100);
    return result;
  },
  async getShopSummary(ctoken, i, industryId, month) {
    return await getShopSummary(ctoken, i, industryId, month);
  },
  async getProductData(ctoken, i, shopSummary, month) {
    return getProductData(ctoken, i, shopSummary, month);
  },
  async getNewProductCount(ctoken, i, shopSummary, month) {
    return getNewProductCount(ctoken, i, shopSummary, month);
  },
};
export default wholeDetailService;
