import { Axios } from "@/js/common";
import { getNested, isObject, subStringBetween } from "@/js/util";

async function getAliMemberEncryptId(url) {
  return Axios({
    url,
  }).then((res) => {
    const data_uid = subStringBetween(res, 'data-uid="', '"');
    return data_uid;
  });
}

// 前台橱窗产品列表
async function getShowcaseProductList(shopAddress) {
  return Axios({
    url: `${shopAddress}/featureproductlist.html`,
    method: "get",
  }).then((res) => {
    let jsonData = getJsonFromTargetDiv(res, "icbu-pc-productListPc");
    return getNested(jsonData, "mds", "moduleData", "data", "productList");
  });
}

// 前台产品列表
async function getProductList(shopAddress, { sortType, page = 1 }) {
  return Axios({
    url: `${shopAddress}/productlist-${page}.html?filter=all&sortType=${sortType}`,
    method: "get",
  }).then((res) => {
    let jsonData = getJsonFromTargetDiv(res, "icbu-pc-productListPc");
    return getNested(jsonData, "mds", "moduleData", "data", "productList");
  });
}

// 前台交易数据
async function getTransactionHistory(ctoken, shopAddress) {
  let aliMemberEncryptId = await getAliMemberEncryptId(
    `${shopAddress}/company_profile/transaction_history.html`
  );
  let params = {
    ctoken,
    aliMemberEncryptId,
  };
  return Axios({
    url: `${shopAddress}/core/CommonSupplierTransactionHistoryWidget/chart.action`,
    params,
  }).then((res) => {
    return res.data;
  });
}

// 前台店铺信息
async function getCompanyInfo(shopAddress) {
  return Axios({
    url: `${shopAddress}/company_profile.html`,
  }).then((res) => {
    // console.log(res);
    if (isObject(res)) {
      throw new Error(res?.ret?.[1]);
    }
    let shopSign = getJsonFromTargetDiv(res, "icbu-pc-shopSign");
    let supplierStars = getNested(
      shopSign,
      "mds",
      "moduleData",
      "data",
      "supplierStars"
    );
    let companyName = getNested(
      shopSign,
      "mds",
      "moduleData",
      "data",
      "companyName"
    );
    let year = getNested(
      shopSign,
      "mds",
      "moduleData",
      "data",
      "companyJoinYears"
    );
    let supplierMainProducts = getNested(
      shopSign,
      "mds",
      "moduleData",
      "data",
      "supplierMainProducts"
    );

    let supplierResponseRate, supplierResponseTime, averageStar, isVerified;
    let verifiedOverview = getJsonFromTargetDiv(
      res,
      "icbu-pc-verifiedOverview"
    );
    if (verifiedOverview) {
      isVerified = true;
      supplierResponseRate = getNested(
        verifiedOverview,
        "mds",
        "moduleData",
        "data",
        "supplierResponseRate",
        "value"
      );
      supplierResponseTime = getNested(
        verifiedOverview,
        "mds",
        "moduleData",
        "data",
        "supplierResponseTime",
        "value"
      );
      averageStar = getNested(
        verifiedOverview,
        "mds",
        "moduleData",
        "data",
        "averageStar",
        "value"
      );
    }
    let cpCompanyOverviewJsonData = getJsonFromTargetDiv(
      res,
      "icbu-pc-cpCompanyOverview"
    );
    if (!verifiedOverview) {
      isVerified = false;
      if (cpCompanyOverviewJsonData) {
        supplierResponseRate = getNested(
          cpCompanyOverviewJsonData,
          "mds",
          "moduleData",
          "data",
          "supplierResponseRate",
          "value"
        );
        supplierResponseTime = getNested(
          cpCompanyOverviewJsonData,
          "mds",
          "moduleData",
          "data",
          "supplierResponseTime",
          "value"
        );
        averageStar = getNested(
          cpCompanyOverviewJsonData,
          "mds",
          "moduleData",
          "data",
          "supplierRatingReviews",
          "value",
          "averageStar"
        );
      }
    }
    let verifiedInquery = getJsonFromTargetDiv(res, "icbu-pc-verifiedInquery");
    let tradeHalfYear = getNested(
      cpCompanyOverviewJsonData,
      "mds",
      "moduleData",
      "data",
      "tradeHalfYear",
      "value"
    );
    let result = {
      tradeHalfYear,
      shopSign,
      verifiedOverview,
      verifiedInquery,
      companyName,
      year,
      averageStar,
      supplierResponseRate,
      supplierResponseTime,
      supplierStars,
      supplierMainProducts,
      isVerified,
    };
    // console.log(result);
    return result;
  });
}

function getJsonFromTargetDiv(res, id) {
  try {
    let domParser = new DOMParser();
    let document = domParser.parseFromString(res, "text/html");
    let targetDiv = document.querySelector(`div[module-name='${id}']`);
    let moduleData = targetDiv.getAttribute("module-data");
    moduleData = decodeURIComponent(moduleData);
    let jsonData = JSON.parse(moduleData);
    // console.log(jsonData);
    return jsonData;
  } catch (e) {
    console.log(`getJsonFromTargetDiv fail, id is ${id}`);
    return null;
  }
}

export default {
  getCompanyInfo,
  getProductList,
  getTransactionHistory,
  getShowcaseProductList,

  // supplierIdentity(ctoken) {
  //   return Axios({
  //     url: "https://crmweb.alibaba.com/rightcenter/right/supplierIdentity.json",
  //     params: { ctoken },
  //   });
  // },
};
