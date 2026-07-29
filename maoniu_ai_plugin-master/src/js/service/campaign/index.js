import { ALI_REPORT } from "@/js/service/report/api";
import { Axios } from "common";
import qs from "qs";
import { getNested, isArrayLength } from "util";
// import {log} from "logan-web";
import moment from "moment";
import axios from "axios";
let csrf;
const byPluginTypes = [15, 16];

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
async function getCampaignDataFromApi(type, isRecommendAd = false) {
  const form = {
    type: "normal",
    data: `{"page":1,"size":20,"typeList":[${type}]}`,
    _csrf: csrf,
  };
  if (isRecommendAd) {
    form.ads = `{"productLineId":110103}`;
  }
  return Axios({
    url: "https://www2.alibaba.com/api/campaign",
    method: "post",
    data: qs.stringify(form),
  }).then((res) => {
    console.log(res);
    return getNested(res, "data");
  });
}

async function init() {
  await getCsrf();
}

async function getKeywordCount(idArray, productLineId) {
  const form = buildCampaignOtherDataForm(productLineId, idArray);
  return Axios({
    url: "https://www2.alibaba.com/api/campaign/keyword/count",
    method: "post",
    data: qs.stringify(form),
  })
    .then((res) => {
      console.log(res);
      return getNested(res, "data");
    })
    .catch((err) => {
      console.error(err);
      return [];
    });
}

async function getProductCount(idArray, productLineId) {
  const form = buildCampaignOtherDataForm(productLineId, idArray);
  return Axios({
    url: "https://www2.alibaba.com/api/campaign/adgroup/count",
    method: "post",
    data: qs.stringify(form),
  })
    .then((res) => {
      return getNested(res, "data");
    })
    .catch((err) => {
      console.error(err);
      return [];
    });
}

function buildCampaignOtherDataForm(productLineId, idArray) {
  const form = {
    ads: `{"productLineId":${productLineId}}`,
    type: "normal",
    data: `{"adgroupOnlineStatus":1,"campaignIdList":[${idArray.join(",")}]}`,
    _csrf: csrf,
  };
  return form;
}

async function getCostData(idArray, productLineId) {
  const form = buildCampaignOtherDataForm(productLineId, idArray);
  return Axios({
    url: "https://www2.alibaba.com/api/campaign/cost",
    method: "post",
    data: qs.stringify(form),
  })
    .then((res) => {
      return getNested(res, "data");
    })
    .catch((err) => {
      console.error(err);
      return [];
    });
}

async function collectOtherData(newProductCampaigns, productLineId) {
  let idArray = newProductCampaigns.map((item) => item.id);
  let keywordCount = await getKeywordCount(idArray, productLineId);
  let productCount = await getProductCount(idArray, productLineId);
  let costData = await getCostData(idArray, productLineId);
  newProductCampaigns.forEach((campaign) => {
    let countObj = keywordCount.find((item) => item.campaignId === campaign.id);
    campaign.keywordCount = getNested(countObj, "keywordCount");
    campaign.promotionProductCount = getNested(productCount, campaign.id);
    campaign.cost = getNested(costData, campaign.id, "cost");
  });
}

async function getCampaignData() {
  await init();
  let result = [];
  // 关键词推广 type: 1 productLineId:110101
  let keywordPromotionCampaigns = await getCampaignDataFromApi("1");
  if (Array.isArray(keywordPromotionCampaigns)) {
    await collectOtherData(keywordPromotionCampaigns, 110101);
    result.push(...keywordPromotionCampaigns);
  }
  // 新品成长 type:23  productLineId:110101
  let newProductCampaigns = await getCampaignDataFromApi("23");
  if (Array.isArray(newProductCampaigns)) {
    await collectOtherData(newProductCampaigns, 110101);
    result.push(...newProductCampaigns);
  }
  // 推荐推广 搜索人群再营销 type:15 productLineId:110103
  let searchCrowdCampaigns = await getCampaignDataFromApi("15", true);
  if (Array.isArray(searchCrowdCampaigns)) {
    await collectOtherData(searchCrowdCampaigns, 110103);
    result.push(...searchCrowdCampaigns);
  }
  // 推荐推广 行业高价值人群 type:16
  let valuableCrowdCampaigns = await getCampaignDataFromApi("16", true);
  if (Array.isArray(valuableCrowdCampaigns)) {
    await collectOtherData(valuableCrowdCampaigns, 110103);
    result.push(...valuableCrowdCampaigns);
  }
  // 趋势明星
  let trendCampaigns = await getCampaignDataFromApi("21", false);
  if (Array.isArray(trendCampaigns)) {
    await collectOtherData(trendCampaigns, 110101);
    result.push(...trendCampaigns);
  }
  // 优品抢位 type:24 productLineId: 110101
  let superiorCampaigns = await getCampaignDataFromApi("24");
  if (Array.isArray(superiorCampaigns)) {
    await collectOtherData(superiorCampaigns, 110101);
    result.push(...superiorCampaigns);
  }
  // 优选人群引流 type: 22 productLineId: 110101
  let drainageCampaigns = await getCampaignDataFromApi("22");
  if (Array.isArray(drainageCampaigns)) {
    await collectOtherData(drainageCampaigns, 110101);
    result.push(...drainageCampaigns);
  }
  // 定制营销 type: 10 productLineId: 110101
  let customMarketing = await getCampaignDataFromApi("10");
  if (Array.isArray(customMarketing)) {
    await collectOtherData(customMarketing, 110101);
    result.push(...customMarketing);
  }
  console.log(result);
  return result;
}

async function getCampaignEffects(campaign) {
  // eslint-disable-next-line no-unused-vars
  let { id, type, productLineId } = campaign;
  let dateEnd = moment().format("YYYY-MM-DD");
  let dateBegin = moment().subtract(3, "month").format("YYYY-MM-DD");
  let form = {
    ads: `{"productLineId":${productLineId}}`,
    type: "normal",
    data: `{"campaignId":${id},"word":"","pageIndex":1,"dateBegin":"${dateBegin}","dateEnd":"${dateEnd}"}`,
    _csrf: csrf,
  };
  return Axios({
    url: "https://www2.alibaba.com/api/report/account",
    method: "post",
    data: qs.stringify(form),
  }).then((res) => {
    console.log(res);
    return getNested(res, "data");
  });
}

async function getCampaignEffectData(campaigns) {
  let result = {};
  for (let campaign of campaigns) {
    let campaignEffects = await getCampaignEffects(campaign);
    result[campaign.id] = campaignEffects;
  }
  console.log(result);
  return result;
}

async function getCampaignKeywords(campaign) {
  let endDate = await getIntervalEndDate(campaign.productLineId);
  let beginDate = moment(new Date(endDate))
    .subtract(6, "days")
    .format("YYYY-MM-DD");
  let form = {
    ads: `{"productLineId":${campaign.productLineId}}`,
    type: "normal",
    data: `{"beginDate":"${beginDate}","endDate":"${endDate}"}`,
    _csrf: csrf,
  };
  return Axios({
    url: `https://www2.alibaba.com/api/campaign/${campaign.id}/bidword/query`,
    method: "post",
    data: qs.stringify(form),
  }).then((res) => {
    return getNested(res, "data");
  });
}

async function getIntervalEndDate(productLineId) {
  let form = {
    ads: `{"productLineId":${productLineId}}`,
    type: "normal",
    data: `{}`,
    _csrf: csrf,
  };
  return Axios({
    url: "https://www2.alibaba.com/api/report/account/interval",
    method: "post",
    data: qs.stringify(form),
  }).then((res) => {
    return getNested(res, "data", "maxDate");
  });
}

async function getCampaignKeywordData(campaigns) {
  let result = [];
  for (let campaign of campaigns) {
    let campaignKeywords = await getCampaignKeywords(campaign);
    result.push(...campaignKeywords);
  }
  console.log(result);
  return result;
}

// async function getCampaignKeywordEffectData(campaign, endDate, dateRange) {
//     let form = {
//         type: "normal",
//         ads: `{"productLineId":${campaign.productLineId}}`,
//         data: `{"pageIndex":1,"pageSize":100,"campaignId":${campaign.id},"dateRange":${dateRange},"dateEnd":"${endDate}"}`,
//         _csrf: csrf
//     }
//     return Axios({
//         url: "https://www2.alibaba.com/api/report/keyword",
//         method: "post",
//         data:qs.stringify(form)
//     }).then(res => {
//         return getNested(res,"data").map(item => {
//             item.campaignId = campaign.id;
//             if(dateRange === 7){
//                 item.type = "WEEK";
//             }else {
//                 item.type = "MONTH";
//             }
//             return item;
//         })
//     })
// }

async function getCampaignKeywordEffects(campaigns) {
  let result = [];
  let endDate = await getIntervalEndDate(110101);
  for (let campaign of campaigns) {
    let weekData = await getAllPagesCampaignApiReport(
      "https://www2.alibaba.com/api/report/keyword",
      campaign,
      endDate,
      7
    );
    result.push(...weekData);
    let monthData = await getAllPagesCampaignApiReport(
      "https://www2.alibaba.com/api/report/keyword",
      campaign,
      endDate,
      30
    );
    result.push(...monthData);
  }
  return result;
}

async function getCampaignForbiddenKeyword(campaign) {
  let form = {
    ads: `{"productLineId":${campaign.productLineId}}`,
    type: "normal",
    data: `{}`,
    _csrf: csrf,
  };
  return Axios({
    url: `https://www2.alibaba.com/api/campaign/${campaign.id}/forbidden/keyword`,
    method: "post",
    data: qs.stringify(form),
  }).then((res) => {
    return getNested(res, "data");
  });
}

async function getCampaignForbiddenKeywords(campaigns) {
  let result = {};
  for (let campaign of campaigns) {
    if (campaign.type === 23 || campaign.type === 21) {
      let forbiddenKeywords = await getCampaignForbiddenKeyword(campaign);
      result[campaign.id] = forbiddenKeywords;
    }
  }
  return result;
}
function getProductLineId(type) {
  let productLineId = 110101;
  if (byPluginTypes.includes(type)) {
    productLineId = 110103;
  }
  return productLineId;
}
async function updateStatus(param, _csrf) {
  const { id, onlineStatus, type, name, activeName } = param;
  let url = "";
  let data = "";
  if (name === "campaign") {
    url = `https://www2.alibaba.com/api/campaign/update/batch`;
    data = `{"campaignOperationList":[{"id":"${id}","onlineStatus":${onlineStatus},"settleStatus":1}]}`;
  }
  if (name === "keyword") {
    url = `https://www2.alibaba.com/api/campaign/${activeName}/bidword/update`;
    data = `{"updateType":"update_status","keywordList":[{"id":"${id}"}],"updateInfo":{"onlineStatus":${onlineStatus}}}`;
  }
  if (name === "product") {
    url = `https://www2.alibaba.com/api/campaign/${activeName}/adgroup/update`;
    data = `{"adGroupOperationList":[{"id":${id},"onlineStatus":${onlineStatus}}]}`;
  }
  const form = {
    ads: `{"productLineId":${getProductLineId(type)}}`,
    type: `normal`,
    data,
    _csrf,
  };
  return axios({
    url,
    method: "post",
    data: qs.stringify(form),
  })
    .then((res) => {
      const {
        data: { ok },
      } = res;
      if (ok) {
        return true;
      }
      return false;
    })
    .catch((err) => {
      console.log(`修改状态失败了：${err}`);
    });
}

async function updateName(param, _csrf) {
  const { id, title, type } = param;
  const url = `https://www2.alibaba.com/api/campaign/update`;
  const form = {
    ads: `{"productLineId":${getProductLineId(type)}}`,
    type: `normal`,
    data: `{"id":"${id}","title":"${title}"}`,
    _csrf,
  };
  return axios({
    url,
    method: "post",
    data: qs.stringify(form),
  })
    .then((res) => {
      const {
        data: { ok },
      } = res;
      if (ok) {
        return true;
      }
      return false;
    })
    .catch((err) => {
      console.log(`修改计划名失败了：${err}`);
    });
}
async function updateBudget(param, _csrf) {
  const { id, budget, type } = param;
  const url = `https://www2.alibaba.com/api/campaign/update`;
  const form = {
    ads: `{"productLineId":${getProductLineId(type)}}`,
    type: `normal`,
    data: `{"id":"${id}","budget":${budget}}`,
    _csrf,
  };
  return axios({
    url,
    method: "post",
    data: qs.stringify(form),
  })
    .then((res) => {
      const {
        data: { ok },
      } = res;
      if (ok) {
        return true;
      }
      return false;
    })
    .catch((err) => {
      console.log(`修改每日预算失败了：${err}`);
    });
}
async function updateBid(param, _csrf) {
  const { id, bidType, maxPrice, type } = param;
  let data = "";
  if (bidType === 1) {
    data = `{"id":"${id}","bidType":${bidType}}`;
  } else {
    data = `{"id":"${id}","maxPrice":${maxPrice},"bidType":${bidType}}`;
  }
  const url = `https://www2.alibaba.com/api/campaign/update`;
  const form = {
    ads: `{"productLineId":${getProductLineId(type)}}`,
    type: `normal`,
    data,
    _csrf,
  };
  return axios({
    url,
    method: "post",
    data: qs.stringify(form),
  })
    .then((res) => {
      const {
        data: { ok },
      } = res;
      if (ok) {
        return true;
      }
      return false;
    })
    .catch((err) => {
      console.log(`修改出价失败了：${err}`);
    });
}
async function updateShieldKeyword(param, _csrf) {
  const { id, type, isCreate, keywords } = param;
  const prefix = `https://www2.alibaba.com/api/campaign/${id}/forbidden/keyword/`;
  let url = "";
  if (isCreate) {
    url = prefix + "create";
  } else {
    url = prefix + "delete";
  }
  const keywordParams = [];
  if (keywords && keywords.length) {
    for (const keyword of keywords) {
      keywordParams.push({ keyword });
    }
  }
  const form = {
    ads: `{"productLineId":${getProductLineId(type)}}`,
    type: `normal`,
    data: `{"forbiddenKeywordOperationList":${JSON.stringify(keywordParams)}}`,
    _csrf,
  };
  return axios({
    url,
    method: "post",
    data: qs.stringify(form),
  })
    .then((res) => {
      const {
        data: { ok },
      } = res;
      if (ok) {
        return true;
      }
      return false;
    })
    .catch((err) => {
      console.log(`修改屏蔽词失败了：${err}`);
    });
}

async function getCampaignProduct(campaign) {
  let form = {
    ads: `{"productLineId":${campaign.productLineId}}`,
    type: "normal",
    data: `{"page":1,"size":500}`,
    _csrf: csrf,
  };
  return Axios({
    url: `https://www2.alibaba.com/api/campaign/${campaign.id}/adgroup`,
    method: "post",
    data: qs.stringify(form),
  }).then((res) => {
    return getNested(res, "data");
  });
}

async function getCampaignProducts(campaigns) {
  let result = [];
  for (let campaign of campaigns) {
    let campaignProducts = await getCampaignProduct(campaign);
    if (isArrayLength(campaignProducts)) {
      result.push(...campaignProducts);
    }
  }
  return result;
}

function getCampaignProductEffectByApi(
  campaign,
  startDate,
  endDate,
  dateRange
) {
  let form = {
    ads: `{"productLineId":${campaign.productLineId}}`,
    type: "normal",
    data: `{"pageIndex":1,"pageSize":500,"startDate":"${startDate}","campaignId":${campaign.id},"dateRange":${dateRange},"dateEnd":"${endDate}"}`,
    _csrf: csrf,
  };
  return Axios({
    url: "https://www2.alibaba.com/api/report/product",
    method: "post",
    data: qs.stringify(form),
  }).then((res) => {
    return getNested(res, "data");
  });
}

async function getCampaignProductEffect(campaign, param) {
  let { month, week } = param.dateRange;
  let result = [];
  // 周数据
  if (Array.isArray(week)) {
    for (let eachWeek of week) {
      let { endDate, startDate } = eachWeek;
      let campaignProductEffects = await getCampaignProductEffectByApi(
        campaign,
        startDate,
        endDate,
        7
      );
      campaignProductEffects.forEach((item) => (item.type = "week"));
      result.push(...campaignProductEffects);
    }
  }
  // 月数据
  if (Array.isArray(month)) {
    for (let eachMonth of month) {
      let { endDate, startDate } = eachMonth;
      let campaignProductEffects = await getCampaignProductEffectByApi(
        campaign,
        startDate,
        endDate,
        30
      );
      campaignProductEffects.forEach((item) => (item.type = "month"));
      result.push(...campaignProductEffects);
    }
  }
  result.forEach((item) => (item.campaignId = campaign.id));
  console.log(result);
  return result;
}

async function getCampaignProductEffects(campaigns, param) {
  console.log(param);
  let result = [];
  for (let campaign of campaigns) {
    let campaignProductEffects = await getCampaignProductEffect(
      campaign,
      param
    );
    result.push(...campaignProductEffects);
  }
  return result;
}

async function getProductEffectsPageByApi(
  ctoken,
  statisticsType,
  selected,
  pageSize,
  pageNO
) {
  let params = {
    action: "CommonAction",
    iName: "getVipEffectiveProductsAndStats",
    isVip: true,
    ctoken: ctoken,
  };
  let form = {
    statisticsType: statisticsType,
    selected: selected,
    terminalType: "total",
    isMyselfUpgraded: true,
    orderBy: "views",
    orderModel: "desc",
    pageSize: pageSize,
    pageNO: pageNO,
    statisticType: "os",
    region: "os",
    isVip: true,
  };
  return Axios({
    url: "https://hz-mydata.alibaba.com/self/.json",
    method: "post",
    params,
    data: qs.stringify(form),
  }).then((res) => {
    return getNested(res, "value", "products");
  });
}

async function getAllProductEffectsByApi(ctoken, statisticsType, selected) {
  let result = [];
  let pageSize = 100;
  let pageNO = 1;
  let { data, recordCount } = await getProductEffectsPageByApi(
    ctoken,
    statisticsType,
    selected,
    pageSize,
    pageNO
  );
  console.log(data);
  console.log(recordCount);
  result.push(...data);
  let totalPage =
    recordCount % pageSize === 0
      ? recordCount / pageSize
      : recordCount / pageSize + 1;
  while (pageNO < totalPage) {
    pageNO++;
    let { data } = await getProductEffectsPageByApi(
      ctoken,
      statisticsType,
      selected,
      pageSize,
      pageNO
    );
    if (Array.isArray(data)) {
      result.push(...data);
    }
  }
  return result;
}

async function getProductLastFourWeekEffects(ctoken, week) {
  let result = [];
  if (Array.isArray(week)) {
    let select = 1;
    for (let item of week) {
      let productWeekEffects = await getAllProductEffectsByApi(
        ctoken,
        "week",
        select++
      );
      let { endDate } = item;
      productWeekEffects.forEach((item) => {
        item.type = "week";
        item.statDate = endDate;
      });
      result.push(...productWeekEffects);
    }
  }
  return result;
}

async function getProductMonthEffects(ctoken, month) {
  let result = [];
  if (Array.isArray(month)) {
    let select = 1;
    for (let item of month) {
      let productMonthEffects = await getAllProductEffectsByApi(
        ctoken,
        "month",
        select++
      );
      let { endDate } = item;
      productMonthEffects.forEach((item) => {
        item.type = "month";
        item.statDate = endDate;
      });
      result.push(...productMonthEffects);
    }
  }
  return result;
}

async function getProductEffects(ctoken, param) {
  let result = [];
  let { month, week } = param.dateRange;
  // 月数据
  let productMonthEffects = await getProductMonthEffects(ctoken, month);
  result.push(...productMonthEffects);
  // 周数据
  let productLastFourWeekEffects = await getProductLastFourWeekEffects(
    ctoken,
    week
  );
  result.push(...productLastFourWeekEffects);
  return result;
}

async function getCampaigns(productLineId, typeList) {
  const form = {
    type: "normal",
    ads: `{"productLineId":${productLineId}}`,
    data: `{"page":1,"size":1000,"typeList":[${typeList}]}`,
    _csrf: csrf,
  };

  return Axios({
    url: "https://www2.alibaba.com/api/campaign",
    method: "post",
    data: qs.stringify(form),
  }).then((res) => {
    return getNested(res, "data");
  });
}

async function getAllCampaigns() {
  let searchCampaigns = await getCampaigns(
    110101,
    [23, 6, 8, 4, 1, 21, 2, 10, 11, 22, 21, 7]
  );
  let recomendCampaigns = await getCampaigns(110103, [15, 16, 18, 19, 28, 29]);
  return [...searchCampaigns, ...recomendCampaigns];
}

// async function getCampaignSearchWordsByApi(campaign, endDate, dateRange) {
//     let form = {
//         type: "normal",
//         ads: `{"productLineId":${campaign.productLineId}}`,
//         data: `{"pageIndex":1,"pageSize":100,"campaignId":${campaign.id},"dateRange":${dateRange},"dateEnd":"${endDate}"}`,
//         _csrf: csrf
//     }
//     return Axios({
//         url: "https://www2.alibaba.com/api/report/searchword",
//         method: "post",
//         data:qs.stringify(form)
//     }).then(res => {
//         return getNested(res,"data").map(item => {
//             item.campaignId = campaign.id;
//             if(dateRange === 7){
//                 item.type = "WEEK";
//             }else {
//                 item.type = "MONTH";
//             }
//             return item;
//         })
//     })
// }

async function getCampaignApiReportPage(
  url,
  campaign,
  endDate,
  dateRange,
  pageIndex,
  pageSize
) {
  let form = {
    type: "normal",
    ads: `{"productLineId":${campaign.productLineId}}`,
    data: `{"pageIndex":${pageIndex},"pageSize":${pageSize},"campaignId":${campaign.id},"dateRange":${dateRange},"dateEnd":"${endDate}"}`,
    _csrf: csrf,
  };
  return Axios({
    url,
    method: "post",
    data: qs.stringify(form),
  });
}

async function getAllPagesCampaignApiReport(url, campaign, endDate, dateRange) {
  let result = [];
  let pageIndex = 1,
    pageSize = 100;
  let { data, totalPages } = await getCampaignApiReportPage(
    url,
    campaign,
    endDate,
    dateRange,
    pageIndex,
    pageSize
  );
  if (Array.isArray(data)) {
    result.push(...data);
    while (totalPages > pageIndex) {
      pageIndex++;
      let { data } = await getCampaignApiReportPage(
        url,
        campaign,
        endDate,
        dateRange,
        pageIndex,
        pageSize
      );
      if (Array.isArray(data)) {
        result.push(...data);
      }
    }
  }
  result.forEach((item) => {
    item.campaignId = campaign.id;
    if (dateRange === 7) {
      item.type = "WEEK";
    } else {
      item.type = "MONTH";
    }
  });
  return result;
}

async function getCampaignSearchWords() {
  let campaigns = await getAllCampaigns();
  let result = [];
  let endDate = await getIntervalEndDate(110101);
  for (let campaign of campaigns) {
    // let weekData = await getCampaignSearchWordsByApi(campaign,endDate,7);
    let weekData = await getAllPagesCampaignApiReport(
      "https://www2.alibaba.com/api/report/searchword",
      campaign,
      endDate,
      7
    );
    if (Array.isArray(weekData)) {
      result.push(...weekData);
    }
    let monthData = await getAllPagesCampaignApiReport(
      "https://www2.alibaba.com/api/report/searchword",
      campaign,
      endDate,
      30
    );
    if (Array.isArray(monthData)) {
      result.push(...monthData);
    }
  }
  console.log(result);
  return result;
}

const campaignService = {
  async syncCampaignData() {
    let campaigns = await getCampaignData();
    let campaignEffectData = await getCampaignEffectData(campaigns);
    return { campaigns, campaignEffectData };
  },
  async syncCampaignKeywordData() {
    await init();
    let campaigns = await getCampaignData();
    let campaignKeywords = await getCampaignKeywordData(campaigns);
    let campaignKeywordEffects = await getCampaignKeywordEffects(campaigns);
    let campaignForbiddenKeywords = await getCampaignForbiddenKeywords(
      campaigns
    );
    let campaignSearchWords = await getCampaignSearchWords();
    return {
      campaignKeywords,
      campaignKeywordEffects,
      campaignForbiddenKeywords,
      campaignSearchWords,
    };
  },
  async updateCampaignData(param) {
    await getCsrf();
    switch (param.status) {
      case 0:
        return await updateStatus(param, csrf);
      case 1:
        return await updateName(param, csrf);
      case 2:
        return await updateBudget(param, csrf);
      case 3:
        return await updateBid(param, csrf);
      case 4:
        return await updateShieldKeyword(param, csrf);
      default:
        return false;
    }
  },
  async syncCampaignProductData(ctoken, param) {
    let campaigns = await getCampaignData();
    let campaignProducts = await getCampaignProducts(campaigns);
    let campaignProductEffects = await getCampaignProductEffects(
      campaigns,
      param
    );
    let productEffects = await getProductEffects(ctoken, param);
    return { campaignProducts, campaignProductEffects, productEffects };
  },
};
export default campaignService;
