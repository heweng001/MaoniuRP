import axios, { AxiosRequestConfig } from "axios";
import { encode } from "util/index";
import sleep from "util/sleep";

axios.interceptors.request.use((request) => {
  return request;
});

axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (typeof error.response === "undefined") {
      return Promise.resolve({
        success: false,
        message: "会话过期，请重新登录阿里国际站",
      });
    } else {
      return Promise.reject(error);
    }
  }
);

// 限制单位时间内数据管家放行请求数量
let allowCount = 15;
let current = 0;
let timeInterval = 3000;

//关键词查询排名
let syncRankCurrent = 0;
let syncRankAllowCount = 10;
let syncRankTimeInterval = 3000;

// 限制单位时间内1688产品采集请求放行数量
let gather1688ProductAllowCount = 1;
let gather1688ProductCurrent = 0;
let gather1688ProductTimeInterval = 1000;

// 限制单位时间内叶子类目top同行接口请求放行数量
let sameIndustryAnalyseAllowCount = 1;
let currentSameIndustryAnalyseCount = 0;
let sameIndustryAnalyseTimeInterval = 3000;

// 限制单位时间内抓取产品交易数据接口请求放行量
let fetchProductTransaction = {
  current: 0,
  allowCount: 5,
  timeInterval: 1000,
};

setInterval(() => {
  fetchProductTransaction.current = 0;
}, fetchProductTransaction.timeInterval);

setInterval(() => {
  currentSameIndustryAnalyseCount = 0;
}, sameIndustryAnalyseTimeInterval);

setInterval(() => {
  current = 0;
}, timeInterval);

setInterval(() => {
  syncRankCurrent = 0;
}, syncRankTimeInterval);

setInterval(() => {
  gather1688ProductCurrent = 0;
}, gather1688ProductTimeInterval);

function isFetchProductTransactionData(url) {
  return (
    url.indexOf(
      "https://www.alibaba.com/event/app/productExportOrderQuery/transactionOverview.htm"
    ) != -1
  );
}

function needLimitRate(url) {
  if (url.indexOf("https://hz-mydata.alibaba.com") != -1) {
    return true;
  }
  if (url.indexOf("https://www2.alibaba.com/api/report") != -1) {
    return true;
  }
  return false;
}

function isSyncRank(url) {
  return url.indexOf("https://hz-productposting.alibaba.com") != -1;
}

function isGather1688Product(url) {
  return (
    url.indexOf("https://detail.1688.com/") != -1 ||
    url.includes("https://search.1688.com/")
  );
}

function isSameIndustryAnalyse(url) {
  return (
    url.indexOf("https://www.alibaba.com/trade/search") !== -1 ||
    url.indexOf(
      "https://open-s.alibaba.com/openservice/galleryProductOfferResultViewService"
    ) !== -1
  );
}

/**
 *
 * @param {AxiosRequestConfig} options
 * @returns
 */
export const Axios = async function (options) {
  if (needLimitRate(options.url)) {
    while (current >= allowCount) {
      await sleep(500);
    }
    current++;
  }

  if (isFetchProductTransactionData(options.url)) {
    while (
      fetchProductTransaction.current >= fetchProductTransaction.allowCount
    ) {
      await sleep(500);
    }
    fetchProductTransaction.current++;
  }

  if (isSyncRank(options.url)) {
    while (syncRankCurrent >= syncRankAllowCount) {
      await sleep(500);
    }
    syncRankCurrent++;
  }

  if (isGather1688Product(options.url)) {
    while (gather1688ProductCurrent >= gather1688ProductAllowCount) {
      await sleep(500);
    }
    gather1688ProductCurrent++;
  }

  if (isSameIndustryAnalyse(options.url)) {
    while (currentSameIndustryAnalyseCount >= sameIndustryAnalyseAllowCount) {
      await sleep(500);
    }
    currentSameIndustryAnalyseCount++;
  }

  return new Promise((resolve, reject) => {
    options = Object.assign(
      {
        paramsSerializer(params) {
          return encode(params, []);
        },
        headers: { "X-Requested-With": "XMLHttpRequest" },
        timeout: 1000 * 60 * 10,
      },
      options
    );
    axios(options)
      .then((res) => {
        if (res && res.data) {
          resolve(res.data);
        } else {
          resolve();
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
};
