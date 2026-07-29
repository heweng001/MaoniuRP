import feedbackService from "@/js/ali_service/feedback_quality_service";
import productService from "@/js/ali_service/product-service";
import wholeDetailService, {
  showDataOverviewAllField,
} from "@/js/ali_service/whole_detail_service";
import axios from "axios";
import { Axios } from "@/js/common/index";
import qs from "qs";
import { getNested } from "util";
import commonService from "../commonService";
import moment from "moment";

let currentWeeklyDataScore = 0;
export function infoWeeklyDataProgress(port, score) {
  currentWeeklyDataScore += score;
  if (port) {
    port.postMessage({
      moduleName: "周数据详细记录",
      progress: currentWeeklyDataScore,
    });
  }
}
function restCurrentWeeklyDataScore() {
  currentWeeklyDataScore = 0;
}
function getCsrf() {
  let url = "https://www2.alibaba.com/api/csrf";
  return Axios({
    url,
    method: "get",
  }).then((res) => {
    if (res) {
      return res.token;
    }
    return null;
  });
}

async function getP4pData(ctoken, shopSummary, isRecommend) {
  let csrf = await getCsrf();
  let statDateRange = shopSummary.statDateRange;
  if (statDateRange && statDateRange.indexOf("~") != -1) {
    shopSummary.startDate = statDateRange.substring(
      0,
      statDateRange.indexOf("~")
    );
    shopSummary.endDate = statDateRange.substring(
      statDateRange.indexOf("~") + 1
    );
  } else {
    shopSummary.startDate = statDateRange + "-01";
    shopSummary.endDate = statDateRange + "-20";
  }
  // 关闭直通车推广的店铺不抓p4p相关数据
  if (null === csrf) {
    return;
  }
  let dateRange = shopSummary.statDateRange;
  let dateBegin, dateEnd;
  if (dateRange && dateRange.includes("~")) {
    dateBegin = dateRange.substring(0, dateRange.indexOf("~"));
    dateEnd = dateRange.substring(dateRange.indexOf("~") + 1);
  } else {
    dateBegin = dateRange + "-01";
    dateEnd = moment(dateBegin).endOf("month").format("YYYY-MM-DD");
  }

  const data = {
    ads: `{"productLineId":110101}`,
    type: "normal",
    data: JSON.stringify({
      dataMode: "struct",
      tableName: "component_offline_account",
      filters: [
        { field: "summaryTypes", value: ["search"] },
        { field: "fbAttribution", value: "0" },
        ...(isRecommend ? [{ field: "channelType", value: "101,102" }] : []),
      ],
      time: {
        granularity: "DAY",
        beginDateTime: `${dateBegin} 00:00:00`,
        endDateTime: `${dateEnd} 23:59:59`,
      },
      derives: [{ mode: "MAIN" }],
      extendParams: {
        context: { summaryTypes: ["search"], productLineId: 110101 },
      },
    }),
    _csrf: csrf,
  };

  await Axios({
    url: "https://www2.alibaba.com/api/data/dynamic/component/data",
    method: "post",
    data: qs.stringify(data),
    withCredentials: true,
  }).then((res) => {
    let totalSummary = res.data?.queryResult?.totalSummary;
    console.log("🚀 ~ getP4pData ~ totalSummary:", totalSummary);
    if (totalSummary) {
      // let length = data.length;
      if (isRecommend) {
        shopSummary.reImpr = totalSummary?.impsCnt?.main;
        shopSummary.reClick = totalSummary?.clickCnt?.main;
        shopSummary.reCtr = totalSummary?.ctr?.main;
        shopSummary.reCost = totalSummary?.cost?.main;
        shopSummary.reCpc = totalSummary.cpc?.main;
        shopSummary.reOnlineHours = totalSummary?.onlineHours?.main;
      } else {
        shopSummary.p4pClick = totalSummary?.clickCnt?.main;
        shopSummary.p4pImpression = totalSummary?.impsCnt?.main;
        shopSummary.onlineHours = totalSummary?.onlineHours?.main;
        shopSummary.p4pCost = totalSummary?.cost?.main;
        shopSummary.cpf2 = totalSummary?.cpf2?.main;
      }
    }
  });
}

async function getUpdateProductCount(ctoken, i, shopSummary, month) {
  const url = "https://hz-mydata.alibaba.com/self/.json";
  let weekMonthDelimiter = month * 4;
  let params;
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
  return Axios({
    url,
    method: "get",
    params,
  })
    .then((res) => {
      let alterProductCount = getNested(
        res,
        "data",
        "total",
        "alterProductCount"
      );
      shopSummary.alterProductCount = alterProductCount;
    })
    .catch((err) => {
      console.log(`获取员工数据出错：${err}`);
    });
}

async function fetchPredictedStars() {
  let params = {
    _: new Date().getTime(),
  };
  return axios({
    url: "https://merchant-rating.alibaba.com/capability/fetchPredictedStars.jsonp",
    method: "get",
    params,
  }).then((res) => {
    let {
      data: { values },
    } = res;
    if (values && values.length) {
      values = values.sort((a, b) => {
        if (a.star > b.star) {
          return -1;
        }
        if (a.star < b.star) {
          return 1;
        }
        return a.type.localeCompare(b.type);
      });
      const star = getNested(values, "0", "star");
      const type = getNested(values, "0", "type");
      return {
        star,
        type,
      };
    }
    return 0;
  });
}

async function fetchFinalStar() {
  let url = "https://supplier.alibaba.com/capability/fetchFinalStar.json";
  let params = {
    _: new Date().getTime(),
  };
  return axios({
    url,
    method: "get",
    params,
  }).then((res) => {
    return getNested(res, "data", "values", "star");
  });
}

async function getStarInfo() {
  let predictedStars = await fetchPredictedStars();
  let finalStar = await fetchFinalStar();
  return { predictedStars, finalStar };
}

const shopDataService = {
  async getShopData(param, ctoken, nickname, weeklyDataPort) {
    restCurrentWeeklyDataScore();
    weeklyDataPort.postMessage({ showWeeklyDataCard: true });
    console.log(param);
    //类目id
    let industryId = await feedbackService.checkIndustryId(ctoken);
    //店铺整体数据
    let shopSummaryArray = [];
    // 显示数据总览的所有字段
    await showDataOverviewAllField(ctoken);

    const month = param && param.init ? Number.parseInt(param.init) : 0;
    let select = month + month * 4;
    if (select > 0) {
      for (let i = 1; i <= select; i++) {
        let shopSummary = await wholeDetailService.getShopSummary(
          ctoken,
          i,
          industryId,
          month
        );
        shopSummary.index = i;
        // 若店铺数据异常则跳过循环
        if (shopSummary.break) {
          continue;
        }
        //产品数据
        await wholeDetailService.getProductData(ctoken, i, shopSummary, month);
        //新发产品数
        await wholeDetailService.getNewProductCount(
          ctoken,
          i,
          shopSummary,
          month
        );
        // p4p相关数据
        await fetchP4pEffectData(ctoken, shopSummary);

        // 修改产品数
        await getUpdateProductCount(ctoken, i, shopSummary, month);
        infoWeeklyDataProgress(weeklyDataPort, 40 / select);

        if (shopSummary) {
          shopSummaryArray.push(shopSummary);
        }
      }
      // 获取优品数与爆品数，定位到最新一个月的数据
      const maxData = shopSummaryArray.find(
        (item) => item.index === 4 * month + 1
      );
      if (maxData) {
        const csrfToken = commonService.getCsrfToken();
        const highQualityItem = await productService.highQualityProductList(
          ctoken,
          csrfToken
        );
        maxData.topProduct = highQualityItem?.count;
        const superHightQualityItem =
          await productService.superHighQualityProductList(ctoken, csrfToken);
        maxData.superProduct = superHightQualityItem?.count;
      }
    } else {
      infoWeeklyDataProgress(weeklyDataPort, 40);
    }
    console.log("🚀 ~ getShopData ~ shopSummaryArray:", shopSummaryArray);
    // 近3个月询盘数据
    let threeMonthFeedbackList = await feedbackService.get3MonthFeedbackData(
      ctoken,
      weeklyDataPort,
      { syncShopWeeklyData: true }
    );
    // 商家星等级
    let starInfo = await getStarInfo(ctoken);
    const { predictedStars, finalStar } = starInfo;
    const starObj = {
      predictedStars: predictedStars.star,
      finalStar,
    };
    // console.log(starInfo);
    // console.log(threeMonthFeedbackList);

    const moduleName = "weeklyData";
    weeklyDataPort.postMessage({ moduleName, progress: 100 });
    weeklyDataPort.postMessage({ closeWeeklyDataCard: true });
    return {
      success: true,
      shopSummaryArray,
      threeMonthFeedbackList,
      starObj,
      nickname,
      message: "",
    };
  },
  async getShopStartInfo() {
    return getStarInfo();
  },
};
export default shopDataService;
async function fetchP4pEffectData(ctoken, shopSummary) {
  await getP4pData(ctoken, shopSummary, false);
  // 直通车推荐推广
  await getP4pData(ctoken, shopSummary, true);

  if (shopSummary?.reClick) {
    shopSummary.p4pClick = shopSummary.p4pClick - shopSummary.reClick;
  }
  if (shopSummary?.reImpr) {
    shopSummary.p4pImpression = shopSummary.p4pImpression - shopSummary.reImpr;
  }
  if (shopSummary?.reCost) {
    shopSummary.p4pCost = shopSummary.p4pCost - shopSummary.reCost;
  }
}
