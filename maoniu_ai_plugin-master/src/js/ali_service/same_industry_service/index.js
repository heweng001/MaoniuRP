import inquiryService from "@/js/ali_service/inquiry_service";
import axios from "axios";
import { Axios } from "@/js/common";
import md5 from "crypto-js/md5";
import { isObject } from "lodash";
import { getNested, isBoolean, isJson } from "util/index";
import _ from "lodash";

//关键词搜索结果
let keywordSearchResult = [];
//总共要搜索几页
const searchPageNumber = 5;
//同行数据
// let industryDataResult = [];
//信保数据公司网址
// let transactionCompanyData = [];
//请求间隔
// const delay = 1000;
//店铺自身数据
let ownSupplierData = {};
//同行重点店铺名称
let sameIndustrySupplierNameSet = new Set();
let category = "";

function analyseIsOwnProductFromData(data, shopUrl = "") {
  if (data) {
    for (let i = 0; i < data.length; i++) {
      const product = data[i];
      let supplier = product.supplier.supplierHref.split("/company_profile")[0];
      if (supplier && shopUrl.indexOf(supplier) > -1) {
        product.isOwn = true;
        ownSupplierData.productId = product.id;
        ownSupplierData.isOwn = true;
        ownSupplierData.supplierName = product.supplier.supplierName;
        ownSupplierData.supplierYear = product.supplier.supplierYear;
        ownSupplierData.transactionLevel = product.company.transactionLevel;
      } else {
        product.isOwn = false;
      }
    }
  }
}

function markSameIndustryShop(data, sameIndustryUrlArray) {
  if (sameIndustryUrlArray && sameIndustryUrlArray.length > 0) {
    if (data) {
      for (let i = 0; i < data.length; i++) {
        const product = data[i];
        let supplier =
          product.supplier.supplierHref.split("/company_profile")[0];
        for (let shopUrl of sameIndustryUrlArray) {
          if (supplier && shopUrl.indexOf(supplier) > -1) {
            product.isSameIndustry = true;
            sameIndustrySupplierNameSet.add(product.supplier.supplierName);
            break;
          } else {
            product.isSameIndustry = false;
          }
        }
      }
    }
  }
}

async function getKeywordSearchResult(
  keyword,
  shopUrl,
  page,
  sameIndustryUrlArray
) {
  let result = [];
  let state = false;
  // 获取关键词搜索结果-途径1
  let promise1 = Axios({
    url: "https://www.alibaba.com/trade/search",
    params: {
      page: page,
      fsb: "y",
      IndexArea: "product_en",
      n: 50,
      SearchText: keyword,
      XPJAX: "1",
    },
  })
    .then((res) => {
      let normalList;
      if (typeof res === "string") {
        state = isExistCaptchaPage(res);
        let dataStr = res.replace(/:\s*,/g, ": null,").replace("↵/g", "");
        let startFlag = '"offerList":';
        let endFlag = "p4pCount";
        dataStr = dataStr.substring(dataStr.indexOf(startFlag), dataStr.length);
        dataStr = dataStr.substring(startFlag.length, dataStr.indexOf(endFlag));
        dataStr = dataStr.substr(0, dataStr.lastIndexOf(","));
        dataStr = unicodeToChar(dataStr);
        const data = JSON.parse(dataStr);
        if (data) {
          normalList = data;
        }
      } else {
        normalList = res.normalList;
      }
      if (normalList) {
        result.push(...normalList);
      }
    })
    .catch((err) => {
      console.log(`获取同行数据出错(关键词搜索结果页)--途径1${err}`);
    });

  // 获取关键词搜索结果-途径2
  let searchWord = keyword.split(" ").join("_");
  let promise2 = Axios({
    url: "https://open-s.alibaba.com/openservice/galleryProductOfferResultViewService",
    params: {
      appName: "magellan",
      appKey: "a5m1ismomeptugvfmkkjnwwqnwyrhpb1",
      searchweb: "Y",
      SearchText: searchWord,
      IndexArea: "product_en",
      page: page,
      ISJSON: 1,
      waterfallReqCount: 1,
      asyncLoadIndex: 2,
      asyncLoad: true,
    },
  })
    .then((res) => {
      let data = getNested(res, "data", "offerList");
      if (data) {
        result.push(...data);
      }
    })
    .catch((err) => {
      console.log(`获取同行数据出错(关键词搜索结果页--途径2)${err}`);
    });
  await promise1;
  await promise2;
  // 信保数据取前50条
  // prepareDataForTradeAssurance(result);
  // 标识本店数据
  analyseIsOwnProductFromData(result, shopUrl);
  // 标识同行重点店铺
  markSameIndustryShop(result, sameIndustryUrlArray);
  // 筛选出需要的数据
  for (let item of result) {
    let filterData = {};
    filterData.productId = item.id;
    filterData.isOwn = item.isOwn;
    filterData.isSameIndustry = item.isSameIndustry;
    filterData.supplierName = item.supplier.supplierName;
    filterData.supplierYear = item.supplier.supplierYear;
    filterData.transactionLevel = item.company.transactionLevel;
    filterData.displayStarLevel = item.company.displayStarLevel;
    filterData.page = page;
    keywordSearchResult.push(filterData);
  }
  return state;
}

function unicodeToChar(text) {
  return text.replace(/\\u[\dA-F]{4}/gi, function (match) {
    return String.fromCharCode(parseInt(match.replace(/\\u/g, ""), 16));
  });
}

function convertStringInquiryToInt(a) {
  if (a) {
    let str = a;
    str = str.replace(",", "");
    str = str.replace("+", "");
    return parseInt(str);
  }
}

function getTransactionHistoryData(item, industryData) {
  let transactionHistory = item.compareCompanyView.transactionHistory;
  if (transactionHistory) {
    let transactionNumber = transactionHistory.substring(
      0,
      transactionHistory.indexOf("Transaction")
    );
    let transactionPrice = transactionHistory.substring(
      transactionHistory.indexOf("$"),
      transactionHistory.indexOf(" in")
    );
    if (transactionNumber && transactionPrice) {
      industryData.transactionNumber = transactionNumber;
      industryData.transactionPrice = transactionPrice;
    }
  }
}

function addOwnSupplierDataIfNotIncluded(top20, data) {
  if (ownSupplierData && ownSupplierData.supplierName) {
    let supplierNameList = top20.map((d) => d.compareCompanyView?.companyName);
    if (!supplierNameList.includes(ownSupplierData.supplierName)) {
      let filterData = data.find(
        (d) =>
          d.compareCompanyView?.companyName === ownSupplierData.supplierName
      );
      if (filterData) {
        top20.push(filterData);
      }
    }
  }
  if (sameIndustrySupplierNameSet && sameIndustrySupplierNameSet.size > 0) {
    let supplierNameList = top20.map((d) => d.compareCompanyView?.companyName);
    for (let supplierName of sameIndustrySupplierNameSet) {
      if (!supplierNameList.includes(supplierName)) {
        let filterData = data.find(
          (d) => d.compareCompanyView?.companyName === supplierName
        );
        if (filterData) {
          top20.push(filterData);
        }
      }
    }
  }
}

function partition(array, size) {
  return array.length
    ? [array.splice(0, size)].concat(partition(array, size))
    : [];
}

function sortByInquiry(a, b) {
  let aInquery = convertStringInquiryToInt(a.compareCompanyView.iquiries);
  let aPageViews = convertStringInquiryToInt(a.compareCompanyView.pageViews);

  let bInquery = convertStringInquiryToInt(b.compareCompanyView.iquiries);
  let bPageViews = convertStringInquiryToInt(b.compareCompanyView.pageViews);

  if (!aInquery) {
    return 1;
  }
  if (!bInquery) {
    return -1;
  }
  if (aInquery === bInquery) {
    if (aPageViews && bPageViews) {
      return bPageViews - aPageViews;
    }
  }
  return bInquery - aInquery;
}

function getCompareId(partition) {
  let compareSalt = "91801202compare";
  let c = partition.concat(compareSalt);
  let u = c.join(",");
  let d = md5(u).toString();
  return d;
}

function getCompareProductsData(productIds) {
  const url = "https://www.alibaba.com/detail/compareProducts.html";
  let compareId = getCompareId(productIds);
  let params = {
    ids: productIds.join(","),
    compareId,
  };
  return Axios({
    url,
    method: "get",
    params,
  })
    .then((res) => {
      if (isObject(res)) {
        throw new Error(res?.ret?.[1]);
      }
      let startFlag = "  data: ";
      let endFlag = " });";
      let startIndex = res.indexOf(startFlag) + startFlag.length;
      let htmlStr = res.substring(startIndex);
      let data = htmlStr.substring(0, htmlStr.indexOf(endFlag));
      data = JSON.parse(data).listView;
      return data;
    })
    .catch((err) => {
      console.error(err);
      throw err;
    });
}

async function getProductComparePageData(
  progressPort,
  length,
  isCheckHighInquiryProduct
) {
  let productIds = keywordSearchResult.map((item) => item.productId);
  let productIdsPartitionArray = partition(productIds, 20);
  let totalResult = [];
  let supplierIdSet = new Set();
  // let promiseArray = [];
  let eachScore = 30 / productIdsPartitionArray.length / length;
  for (let productIdsPartition of productIdsPartitionArray) {
    // 获取产品和公司比较数据
    let compareProductData = await getCompareProductsData(productIdsPartition);
    // 去除重复公司id
    for (const item of compareProductData) {
      if (!supplierIdSet.has(item.compareCompanyView.supplierId)) {
        supplierIdSet.add(item.compareCompanyView.supplierId);
        totalResult.push(item);
      }
    }
    if (isCheckHighInquiryProduct) {
      const score = 15 / productIdsPartitionArray.length / length;
      infoHighInquiryProductProgress(progressPort, score);
    } else {
      infoProgress(progressPort, eachScore);
    }
    // promiseArray.push(compareProductData);
  }
  // await Promise.all(promiseArray);
  let industryDataResult = [];
  if (totalResult) {
    // console.log("TOTAL RESULT IS ", totalResult);
    let categoryGrouped = {};
    let page = 1;
    const size = 20;
    let maxLen = 0;
    do {
      //按询盘降序
      totalResult.sort(sortByInquiry);

      //同行数据取前20
      let slice20 = totalResult.slice((page - 1) * size, page * size);

      // top20.sort(sortByInquiry);
      console.log(
        `same industry service get ${totalResult.length} data, slice 20 is: `,
        slice20
      );
      for (let item of slice20) {
        // 转化为同行对象
        let industryData = toIndustryData(item);
        industryDataResult.push(industryData);
      }
      //抓取产品类目信息
      await getProductCategoryInfo(industryDataResult);
      //抓取店铺产品总数
      await getShopTotalProductCount(industryDataResult);
      categoryGrouped = _.merge(
        categoryGrouped,
        _.groupBy(industryDataResult, "category")
      );
      // console.log(categoryGrouped);
      maxLen = _.maxBy(
        Object.values(categoryGrouped).map((item) => item.length)
      );
      // console.log(maxLen);
      page++;
    } while (page * size < totalResult.length && maxLen < 20);
    //若本店和重点同行店铺不在top20，则把数据加入
    addOwnSupplierDataIfNotIncluded(industryDataResult, totalResult);
    // const first = groupedList[0];
    // console.log("AFTER SORTED, TOTAL RESULT IS ", industryDataCategoryGrouped);
    const returnGrouped = Object.entries(categoryGrouped)
      .reduce((pre, [category, value]) => {
        pre.push({ key: category, category, value });
        return pre;
      }, [])
      .sort((a, b) => b.value.length - a.value.length);
    return {
      industryDataResult,
      industryDataCategoryGrouped: returnGrouped,
    };
  }
  return { industryDataResult };
}

function toIndustryData(item) {
  let industryData = {};
  let {
    compareCompanyView: { companyName, iquiries, pageViews, mainProducts },
    compareProductView: { productId },
  } = item;
  industryData.companyName = companyName;
  industryData.iquiries = iquiries;
  industryData.pageViews = pageViews;
  industryData.mainProducts = mainProducts;
  industryData.home = item.compareCompanyView.companyUrl;
  industryData.productDetailUrl = item.compareProductView.productDetailUrl;
  getTransactionHistoryData(item, industryData);

  let result = keywordSearchResult.find(
    (r) => r.productId === Number.parseInt(productId)
  );
  if (result) {
    industryData.isOwn = result.isOwn;
    industryData.isSameIndustry = result.isSameIndustry;
    industryData.supplierName = result.supplierName;
    industryData.supplierYear = result.supplierYear;
    industryData.transactionLevel = result.transactionLevel;
    industryData.displayStarLevel = result.displayStarLevel;
  }
  return industryData;
}

/**
 * 从产品详情页URL中获取类目信息
 * @param {string} productDetailUrl - 产品详情页的URL
 * @return {Promise<string>} - 返回一个Promise，解析后的品类信息字符串，如果无法解析则返回空字符串
 */
export function getCategoryInProductDetailPage(productDetailUrl) {
  // 使用Axios发起GET请求获取产品详情页内容
  let url = productDetailUrl;
  if (url.startsWith("//")) {
    url = "https:" + url;
  }
  if (!url.startsWith("http")) {
    url = "https://" + url;
  }
  return Axios({
    url: url,
    method: "get",
  }).then((res) => {
    // 截取响应内容中与"pathList"相关的部分
    res = res.substring(res.indexOfEnd('"pathList":'));
    // 截取到数组闭合括号"]"的位置，确保我们拿到的是一个有效的JSON数组
    res = res.substring(0, res.indexOf("]") + 1);
    // 检查截取到的内容是否是JSON格式
    if (isJson(res)) {
      let json = JSON.parse(res);
      // 如果截取到的内容是数组，尝试从最后一个元素中提取品类信息
      if (Array.isArray(json)) {
        return getNested(json[json.length - 1], "hrefObject", "name");
      }
    }
    // 如果无法解析或截取到预期的内容，则返回空字符串
    return "";
  });
}

async function getProductCategoryInfo(industryDataResult) {
  for (let data of industryDataResult) {
    try {
      const result = await getCategoryInProductDetailPage(
        data.productDetailUrl
      );
      data.category = result;
    } catch (err) {
      console.log(`获取${data.productDetailUrl}出错了:${err}`);
    }
  }
}

async function getTotalProductCount(homeUrl) {
  return Axios({
    url: homeUrl,
  }).then((res) => {
    res = res.substring(
      res.indexOf("totalLines%22%3A") + "totalLines%22%3A".length
    );
    res = res.substring(0, res.indexOf("%2C%22"));
    if (Number(res)) {
      return res;
    }
    return "";
  });
}

async function getShopTotalProductCount(industryDataResult) {
  let promiseArray = [];
  for (let data of industryDataResult) {
    let homeUrl = getNested(data, "home");
    if (homeUrl.includes("/company_profile.html")) {
      homeUrl = homeUrl.replace("/company_profile.html", "");
    }
    if (!homeUrl.startsWith("http")) {
      homeUrl = "https:" + homeUrl;
    }
    homeUrl =
      homeUrl + "/productlist.html?spm=a2700.shop_cp.88.5.4de0168fPwPEa4";
    let promise = getTotalProductCount(homeUrl)
      .then((count) => {
        data.totalProductCount = count;
      })
      .catch((err) => {
        console.log(`获取getTotalProductCount出错${err}`);
      });
    promiseArray.push(promise);
  }
  await Promise.all(promiseArray);
}

async function getEffectData(
  ctoken,
  keyword,
  shopUrl,
  sameIndustryUrlArray,
  progressPort,
  length,
  isCheckHighInquiryProduct
) {
  //同行数据需抓取前20页，按询盘降序取top20 本店数据需以灰底标识
  //抓取关键词搜索结果页数据
  let eachScore = 60 / searchPageNumber / length;
  for (let i = 1; i <= searchPageNumber; i++) {
    const state = await getKeywordSearchResult(
      keyword,
      shopUrl,
      i,
      sameIndustryUrlArray
    );
    if (state) {
      return true;
    }
    if (isCheckHighInquiryProduct) {
      const score = 25 / searchPageNumber / length;
      infoHighInquiryProductProgress(progressPort, score);
    } else {
      infoProgress(progressPort, eachScore);
    }
  }
  //抓取对比页内的数据
  let { industryDataResult, industryDataCategoryGrouped } =
    await getProductComparePageData(
      progressPort,
      length,
      isCheckHighInquiryProduct
    );

  const score = 10 / length;
  if (isCheckHighInquiryProduct) {
    infoHighInquiryProductProgress(progressPort, score);
  } else {
    infoProgress(progressPort, score);
  }
  return { industryDataResult, industryDataCategoryGrouped };
}

// async function extractedEncryptId(data) {
//     const url = "https:" + data.companyTransactionPageUrl;
//     await Axios({
//         url,
//         method: "get"
//     }).then(res => {
//         const data_uid = subStringBetween(res, 'data-uid="', '"');
//         data.aliMemberEncryptId = data_uid;
//     }).catch(err => {
//         console.log(`获取同行数据解密id出错${err}`);
//     })
// }

// function minusDay(startDate, n) {
//     if (startDate instanceof Date) {
//         return new Date(startDate.getTime() - n * 24 * 3600 * 1000);
//     } else {
//         return new Date(startDate - n * 24 * 3600 * 1000);
//     }
// }

// // 同行信保金额预估
// function getAmt(amt) {
//     amt = amt.replace(',', '').replace('.**', '');
//     let res = '5';
//     for (let i = 0; i < amt.length - 1; i++) {
//         res += '0'
//     }
//     return Number(res);
// }

// async function extractedTradeAssuranceData(supplier, ctoken, tradeAssuranceData) {
//     let found = false;
//     await Axios({
//         url: "https:" + supplier.transactionUrl,
//         params: {
//             ctoken,
//             page: 1,
//             size: 200,
//             aliMemberEncryptId: supplier.aliMemberEncryptId,
//             _: Date.now()
//         }
//     })
//         .then(res => {
//             const data = res.data;
//             if (data) {
//                 const today = new Date();
//                 const startDate = minusDay(new Date(today.getFullYear(), today.getMonth(), today.getDate()), 32);
//                 let resultList = data.tradeList.value.resultList.filter(t => t.tradeDate >= startDate.getTime());
//                 resultList.forEach(r => {
//                     found = true;
//                     tradeAssuranceData.push({
//                         companyName: supplier.companyName,
//                         amt: r.amt,
//                         predAmt: getAmt(r.amt),
//                         buyerCountry: r.buyerCountry,
//                         countryFullName: r.countryFullName,
//                         currency: r.currency,
//                         tradeDate: r.tradeDate,
//                     })
//                 });
//             }
//         })
//         .catch((err) => {
//             console.log(`获取信保数据出错${err}`);
//         });
//     if (!found) {
//         tradeAssuranceData.push({
//             companyName: supplier.companyName,
//             predAmt: 0
//         })
//     }

// }

// function sleep(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }

// function formatTradeAssuranceData(tradeAssuranceData) {
//     let resultList = [];
//     if (tradeAssuranceData) {
//         let companyTransactionListMap = new Map();
//         tradeAssuranceData.forEach(item => {
//             if (companyTransactionListMap.has(item.companyName)) {
//                 companyTransactionListMap.get(item.companyName).push(item);
//             } else {
//                 companyTransactionListMap.set(item.companyName, [item]);
//             }
//         });
//         for (let companyName of companyTransactionListMap.keys()) {

//             let transactionList = companyTransactionListMap.get(companyName).filter(t => t.predAmt !== 0);

//             //小于$100单数
//             let less100 = transactionList.filter(t => t.predAmt < 100).length;
//             //小于$1000单数
//             let less1000 = transactionList.filter(t => t.predAmt > 100 && t.predAmt < 1000).length;
//             //小于$10000单数
//             let less10000 = transactionList.filter(t => t.predAmt > 1000 && t.predAmt < 10000).length;
//             //大于$10000单数
//             let moreThan10000 = transactionList.filter(t => t.predAmt > 10000).length;
//             //总订单数
//             let totalCount = less100 + less1000 + less10000 + moreThan10000;
//             //总价
//             let totalPrice = transactionList.map(t => t.predAmt).reduce((a, b) => a + b, 0);

//             resultList.push({
//                 companyName,
//                 less100,
//                 less1000,
//                 less10000,
//                 moreThan10000,
//                 totalCount,
//                 totalPrice
//             });
//         }
//     }
//     return resultList;
// }

// async function getTradeAssuranceData(ctoken) {
//     let tradeAssuranceData = [];
//     for (let data of transactionCompanyData) {
//         //先获取接口所需的encryptId
//         await extractedEncryptId(data);
//         // 获取信保数据
//         await extractedTradeAssuranceData(data, ctoken, tradeAssuranceData);
//     }
//     //信保数据转化成需要的格式
//     return formatTradeAssuranceData(tradeAssuranceData);
// }

function getShopUrl(ctoken) {
  const url = "https://i.alibaba.com/ajax/sellerProfileAjax.do";
  //获取_tb_token_
  let _tb_token_ = "";
  chrome.cookies.get(
    {
      name: "_tb_token_",
      url: "https://i.alibaba.com",
    },
    function (cookie) {
      _tb_token_ = cookie.value;
    }
  );

  let params = {
    ctoken: ctoken,
    _tb_token_: _tb_token_,
  };
  return Axios({
    url,
    params,
  }).then((res) => {
    if (res) {
      return res.minisite;
    }
    return "";
  });
}

function initData() {
  //关键词搜索结果
  keywordSearchResult = [];
  //同行数据
  // industryDataResult = [];
  //信保数据公司网址
  // transactionCompanyData = [];
  //店铺自身数据
  ownSupplierData = {};
  //同行重点信息
  sameIndustrySupplierNameSet = new Set();
  category = "";
}

function getPopularProduct(keyword) {
  let url = "https://www.alibaba.com/trade/search";
  let params = {
    SearchScene: "themePage",
    themeScene: "cloudTheme",
    themeIds: "feed,order",
    sceneId: "leaderBoard",
    SearchText: keyword,
    themeId: "feed",
    themeName: "leaderBoard",
  };
  return Axios({
    url: url,
    params,
  }).then((res) => {
    let data = res;
    const state = isExistCaptchaPage(data);
    if (state) {
      return true;
    }
    let startFlag = 'themeList":';
    data = data.substring(data.indexOfEnd(startFlag));
    let endFlag = ',"title":"Popular on Alibaba.com"';
    let resultStr = data.substring(0, data.indexOf(endFlag));
    let result = null;
    if (isJson(resultStr)) {
      result = JSON.parse(resultStr);
    }
    return result;
  });
}

function isExistCaptchaPage(data) {
  const message = '"action": "captcha"';
  return data.includes(message);
}

// function getHotProduct(keyword) {
//     let url = "https://www.alibaba.com/trade/search";
//     let params = {
//         SearchScene: "themePage",
//         themeScene: "cloudTheme",
//         themeIds: "5238101001085",
//         sceneId: "22_33",
//         SearchText: encodeURIComponent(keyword.toLowerCase())+"=",
//         themeId: "5238101001085",
//         postCatId: 0
//     };
//     return Axios({
//         url: url,
//         params
//     }).then(res => {
//         let data = res;
//         let startFlag = "themeList\":";
//         data = data.substring(data.indexOfEnd(startFlag));
//         let endFlag = ",\"title\":\"Popular and trending products\"";
//         let resultStr = data.substring(0,data.lastIndexOf(endFlag));
//         let result = null;
//         if(isJson(resultStr)){
//             result = JSON.parse(resultStr);
//         }
//         return result;
//     })
// }

function toProduct(item) {
  let result = {};
  result.id = item.id;
  result.image = getNested(item, "image", "mainImage");
  let url = getNested(item, "information", "productUrl");
  if (!url.startsWith("http")) {
    url = "https:" + url;
  }
  result.productUrl = url;
  // 价格
  result.tradePrice = getNested(item, "tradePrice");
  result.isLadderPrice = false;
  let quantityPrices = getNested(item, "promotionInfoVO", "quantityPrices");
  if (quantityPrices && quantityPrices.length > 0) {
    result.ladderPrice = quantityPrices;
    result.isLadderPrice = true;
  }
  return result;
}

function getTransactionData(url) {
  return Axios({
    url,
    method: "get",
  }).then(async (res) => {
    // 详细属性
    let jsonStr = res.substring(
      res.indexOfEnd("window._PAGE_SCHEMA_ = "),
      res.indexOf(";\n" + "window._ASSETS_DOMAIN_")
    );
    let result = {};
    if (jsonStr) {
      if (isJson(jsonStr)) {
        const jsonData = JSON.parse(jsonStr);
        // 订单
        let productOrderValue = getNested(
          jsonData,
          "children",
          "2",
          "children",
          "2",
          "children",
          "0",
          "attributes",
          "productOrderOverview",
          "value"
        );
        result.productOrderValue = productOrderValue;
        // 叶子类目
        let categoryArray = getNested(
          jsonData,
          "children",
          "0",
          "children",
          "1",
          "children",
          "0",
          "attributes",
          "breadCrumb",
          "pathList"
        );
        if (categoryArray && Array.isArray(categoryArray)) {
          result.leafCategory = categoryArray[categoryArray.length - 1].catName;
        }
      }
      return result;
    } else {
      let resultJson =
        res.substring(
          res.indexOfEnd("window.detailData = "),
          res.indexOf('"js_ssr"}}}')
        ) + '"js_ssr"}}}';
      let resultStrData = null;
      if (isJson(resultJson)) {
        resultStrData = JSON.parse(resultJson);
      }
      // 订单
      let id = getNested(resultStrData, "globalData", "extend", "detailId");
      url = url.slice(0, url.indexOf(".com")) + ".com";
      let getProductValue = await getTransaction(id, url);
      result.productOrderValue = getProductValue;
      // 叶子类目
      let categoryArr = getNested(
        resultStrData,
        "globalData",
        "seo",
        "breadCrumb",
        "pathList"
      );
      if (categoryArr && Array.isArray(categoryArr)) {
        result.leafCategory = getNested(
          categoryArr[categoryArr.length - 1],
          "hrefObject",
          "name"
        );
      }
      // 公司信息
      const companyInfo = {
        companyName: getNested(
          resultStrData,
          "globalData",
          "seller",
          "companyName"
        ),
        homeUrl: getNested(resultStrData, "globalData", "seller", "homeUrl"),
      };
      result.companyInfo = companyInfo;
      // RTS
      result.isRTS = getNested(
        resultStrData,
        "globalData",
        "product",
        "productIsMarketGoods"
      );
      return result;
    }
  });
}

export function getOtherTransaction(id) {
  const url =
    "https://www.alibaba.com/event/app/productExportOrderQuery/transactionOverview.htm";
  const params = {
    detailId: id,
    languageType: "en",
  };
  return axios({
    url,
    method: "get",
    params,
  })
    .then((res) => {
      const data = getNested(res, "data", "data");
      return data ? data : {};
    })
    .catch((err) => {
      console.log(`获取getOtherTransaction出错了:${err}`);
    });
}

async function getTransaction(detailId, url) {
  return Axios({
    url: `${url}/event/app/productExportOrderQuery/transactionOverview.htm?detailId=${detailId}`,
    method: "get",
  }).then((res) => {
    if (res && res.success && res.data) {
      return res.data;
    }
  });
}
function getToken() {
  return new Promise((resolve) => {
    chrome.cookies.getAll(
      {
        domain: ".alibaba.com",
        name: "_m_h5_tk",
      },
      (cookies2) => {
        if (cookies2[0] && cookies2[0].value) {
          let token = cookies2[0].value.split("_")[0];
          resolve(token);
        } else {
          console.log("inquiry token not found");
          resolve("");
        }
      }
    );
  });
}

// function getPopularProductSecondPageData(keyword,themeId) {
//     let url = "https://open-s.alibaba.com/openservice/themePageResultService";
//     let params = {
//         appKey: "a5m1ismomeptugvfmkkjnwwqnwyrhpb1",
//         appName: "magellan",
//         sceneId: "leaderBoard",
//         pageIndex: 2,
//         themeScene: "subCloudTheme",
//         SearchScene: "themePage",
//         themeId,
//         SearchText: encodeURIComponent(keyword.toLowerCase())+"=",
//         postCatId: 0,
//         callback: "jsonp_1605238403759_62473"
//     };
//     return Axios({
//         url,
//         params
//     }).then(res => {
//        let startFlag = "jsonp_1605238403759_62473(";
//        res = res.substring(res.indexOfEnd(startFlag));
//        let endFlag = ");";
//        let jsonStr = res.substring(0,res.indexOf(endFlag));
//        let result = [];
//        if(isJson(jsonStr)){
//            let data = getNested(JSON.parse(jsonStr), "data", "offerList");
//            if(data){
//                result = data;
//            }
//        }
//        return result;
//     })
// }

async function getHighInquiryProductFromPopularProduct(popularProduct) {
  let data = popularProduct.find((item) => item.title === "Trending products");
  if (data) {
    data = data.offerList;
    return data;
  }
  return [];
}

// async function getHighInquiryProductFromHotProduct(keyword) {
//     let data = await getHotProduct(keyword);
//     let result = [];
//     if(data){
//       data = getNested(data,"0","offerList");
//       if(data && Array.isArray(data)){
//           result = data;
//       }
//     }
//     return result;
// }

async function getHighInquiryProductData(popularProduct, keyword) {
  let result = [];
  if (popularProduct && Array.isArray(popularProduct)) {
    result = await getHighInquiryProductFromPopularProduct(
      popularProduct,
      keyword
    );
  }
  // if(!result || result.length === 0){
  //     result = await getHighInquiryProductFromHotProduct(keyword);
  // }
  return result;
}

async function setOrderData(highInquiryProducts, progressPort, length) {
  let promiseArray = [];
  let eachScore = 40 / highInquiryProducts.length / length;
  for (let product of highInquiryProducts) {
    try {
      let data = await getTransactionData(product.productUrl);
      product.transanctionData = data.productOrderValue;
      product.leafCategory = data.leafCategory;
      product.companyInfo = data.companyInfo;
      product.isRTS = data.isRTS;
      infoHotProductProgress(progressPort, eachScore);
    } catch (err) {
      console.log(`访问${product.productUrl}出错了: ${err}`);
      console.log("调用getOtherTransaction接口");

      const result = await getOtherTransaction(product.id);
      if (result) {
        product.transanctionData = result;
      }
    }
  }
  await Promise.all(promiseArray);
}

async function getTokenAfterSetCookie() {
  let token = await getToken();
  const productId = 60345111510;
  // this request would set the token we need
  try {
    await inquiryService.getInquiry(productId, token);
  } catch (e) {
    console.log("set inquiry cookie request fail");
    console.error(e);
  }
  return getToken();
}

// async function setInquiryData(highInquiryProducts,progressPort, length) {
//     // let token = await getTokenAfterSetCookie();
//     // console.log(token);
//     let inquiryPromiseArray = [];
//     let eachScore = 20 / highInquiryProducts.length / length;
//     for (let product of highInquiryProducts) {
//         let inquiryPromise = inquiryService.getInquiryNew(product.id).then(res => {
//             product.inquiry = res;
//             infoHotProductProgress(progressPort,eachScore);
//         })
//         await sleep(500)
//         inquiryPromiseArray.push(inquiryPromise);
//     }
//     await Promise.all(inquiryPromiseArray);
// }

// eslint-disable-next-line no-unused-vars
async function getHotSellProductData(popularProduct, keyword) {
  if (popularProduct) {
    let data = popularProduct.find(
      (item) => item.title === "Hot-selling products"
    );
    if (data) {
      data = data.offerList;
      return data;
    }
  }
  return [];
}

let currentProgress = 0;
function infoProgress(progressPort, progress) {
  const moduleName = "sameIndustryAnalyse";
  currentProgress += progress;
  progressPort.postMessage({ moduleName, progress: currentProgress });
}
export function resetScore() {
  currentProgress = 0;
}
export function resetScoreHotProduct() {
  hotProductCurrentProgress = 0;
}
let hotProductCurrentProgress = 0;
function infoHotProductProgress(progressPort, progress) {
  const moduleName = "hotProductAnalyse";
  hotProductCurrentProgress += progress;
  progressPort.postMessage({ moduleName, progress: hotProductCurrentProgress });
}

let highInquiryProductProgress;
let topSaleRankProductProgress;

export function infoTopSaleRankProductProgress(progressPort, progress) {
  const moduleName = "topSaleRankProduct";
  topSaleRankProductProgress += progress;
  progressPort.postMessage({
    moduleName,
    progress: topSaleRankProductProgress,
  });
}
export function resetHighInquiryProductProgress() {
  highInquiryProductProgress = 0;
}

export function resetTopSaleRankProductProgress() {
  topSaleRankProductProgress = 0;
}
export function infoHighInquiryProductProgress(progressPort, progress) {
  const moduleName = "highInquiryProducts";
  highInquiryProductProgress += progress;
  progressPort.postMessage({
    moduleName,
    progress: highInquiryProductProgress,
  });
}

const sameIndustryService = {
  sameIndustryAnalyse: async function (
    ctoken,
    keyword,
    sameIndustryUrl,
    progressPort,
    length,
    isCheckHighInquiryProduct
  ) {
    if (keyword.indexOf(",") != -1) {
      keyword = keyword.substring(0, keyword.indexOf(","));
    }
    //初始化数据
    initData();
    //获取自身店铺旺铺网址
    let shopUrl = await getShopUrl(ctoken);
    //同行重点店铺网址
    let sameIndustryUrlArray = [];
    if (sameIndustryUrl) {
      sameIndustryUrlArray = sameIndustryUrl.split("\n");
    }
    console.log("same industry url array: ", sameIndustryUrlArray);
    //效果数据
    let {
      industryDataResult: effectData,
      industryDataCategoryGrouped: effectDataCategoryGrouped,
    } = await getEffectData(
      ctoken,
      keyword,
      shopUrl,
      sameIndustryUrlArray,
      progressPort,
      length,
      isCheckHighInquiryProduct
    );
    if (isBoolean(effectData)) {
      return effectData;
    }
    // //信保数据
    // let tradeAssuranceData = await getTradeAssuranceData(ctoken);
    return {
      category,
      keyword,
      effectData,
      effectDataCategoryGrouped,
    };
  },
  getHighInquiryProductPage(url) {
    if (url && url.startsWith("https:")) {
      /* empty */
    } else {
      url = "https:" + url;
    }
    return Axios({
      url,
      method: "get",
    })
      .then(async (res) => {
        const dataJson =
          res.substring(
            res.indexOfEnd("window.detailData = "),
            res.indexOf('"js_ssr"}}}')
          ) + '"js_ssr"}}}';
        let data = {};
        if (isJson(dataJson)) {
          data = JSON.parse(dataJson);
        }
        let productId;
        let mainImageUrl;
        let companyName;
        let homeUrl;
        let formatLadderPrice;
        let MOQ;
        let leafCategory;
        let isRTS;
        let transactionData;
        if (Object.keys(data).length) {
          // id
          productId = getNested(data, "globalData", "product", "productId");
          // 主图
          const mediaItems = getNested(
            data,
            "globalData",
            "product",
            "mediaItems"
          );
          if (mediaItems && mediaItems.length) {
            const mainImageObj = mediaItems.find((f) => f.type === "image");
            if (mainImageObj) {
              mainImageUrl = getNested(mainImageObj, "imageUrl", "big") || "";
            }
          }
          // 公司名
          companyName = getNested(data, "globalData", "seller", "companyName");
          // 公司地址
          homeUrl = getNested(data, "globalData", "seller", "homeUrl");
          // 区间价
          formatLadderPrice = getNested(
            data,
            "globalData",
            "product",
            "price",
            "formatLadderPrice"
          );
          if (!formatLadderPrice) {
            formatLadderPrice = getNested(
              data,
              "globalData",
              "product",
              "price",
              "productRangePrices",
              "priceRangeText"
            );
          }
          if (!formatLadderPrice) {
            formatLadderPrice = getNested(
              data,
              "globalData",
              "product",
              "price",
              "formatFixedPrice"
            );
          }
          MOQ = getNested(data, "globalData", "product", "moq");
          // 叶子类目
          const categoryArr = getNested(
            data,
            "globalData",
            "seo",
            "breadCrumb",
            "pathList"
          );
          if (categoryArr && categoryArr.length) {
            leafCategory =
              getNested(
                categoryArr[categoryArr.length - 1],
                "hrefObject",
                "name"
              ) || "";
          }
          // 产品类型
          isRTS =
            getNested(data, "globalData", "product", "productIsMarketGoods") ||
            false;
          // 订单数
          transactionData = await getOtherTransaction(productId);
        }
        return {
          url,
          productId,
          mainImageUrl,
          companyName,
          homeUrl,
          formatLadderPrice,
          MOQ,
          leafCategory,
          isRTS,
          transactionData,
        };
      })
      .catch((err) => {
        console.log(`获取getProductPage出错了：${err}`);
      });
  },
  async popularProductHighInquiry(
    ctoken,
    keyword,
    param,
    progressPort,
    length
  ) {
    if (keyword.indexOf(",") != -1) {
      keyword = keyword.substring(0, keyword.indexOf(","));
    }
    const popularProduct = await getPopularProduct(keyword);
    if (isBoolean(popularProduct)) {
      return true;
    }
    let result = {};
    let highInquiryProducts = [];
    let hotSellingProducts = [];

    if (param.popularProductHighInquiry) {
      let highInquiryProductData = await getHighInquiryProductData(
        popularProduct,
        keyword
      );
      infoHotProductProgress(progressPort, 10 / length);
      highInquiryProducts = highInquiryProductData.map((item) => {
        return toProduct(item);
      });
      // 订单数
      await setOrderData(highInquiryProducts, progressPort, length);
      // 询盘数
      // await setInquiryData(highInquiryProducts,progressPort, length);
      result.highInquiryProducts = highInquiryProducts;
    }
    if (param.popularProductHotSelling) {
      let hotSellProductData = await getHotSellProductData(
        popularProduct,
        keyword
      );
      hotSellingProducts = hotSellProductData.map((item) => {
        return toProduct(item);
      });
      infoHotProductProgress(progressPort, 10 / length);
      // 订单数
      await setOrderData(hotSellingProducts, progressPort, length);
      // 询盘数
      // await setInquiryData(hotSellingProducts,progressPort, length);
      result.hotSellingProducts = hotSellingProducts;
    }
    result["keyword"] = keyword;
    return result;
  },
  popularProduct(keyword) {
    return getPopularProduct(keyword);
  },
  transactionData(url) {
    return getTransactionData(url);
  },
  token() {
    return getTokenAfterSetCookie();
  },
  getCompareId(productIdArray) {
    return getCompareId(productIdArray);
  },
  getCompareProductsData,
};
export default sameIndustryService;
