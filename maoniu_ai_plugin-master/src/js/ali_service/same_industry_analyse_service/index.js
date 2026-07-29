import companyService from "@/js/ali_service/company_service";
import { Axios } from "common";
import { subStringBetween } from "../../util";

let progressPort;
// function getRankResults(a, b) {
//     return b.inquiry - a.inquiry
// }

// function getToken() {
//     return new Promise(resolve => {
//         chrome.cookies.getAll({
//             domain: '.alibaba.com',
//             name: '_m_h5_tk'
//         }, (cookies2) => {
//             if (cookies2[0] && cookies2[0].value) {
//                 let token = cookies2[0].value.split("_")[0];
//                 resolve(token);
//             }
//         })
//     })
// }

// async function getInquirys(productId) {
//     let token = await getToken();
//     let inquiry = await inquiryService.getInquiry(productId, token);
//     return inquiry
// }

// function getTotalTransactions(obj) {
//     const result = getNested(obj, "productOrderValue", "totalTransactions")
//     if (result) {
//         return result
//     } else {
//         return 0
//     }
// }
// function getAliShowCaseProductFromUrl(url) {
//     return Axios({
//         url,
//         method: "get",
//     }).then(async res => {
//         // 详细属性
//         let jsonStr = res.substring(res.indexOfEnd("window._PAGE_SCHEMA_ = "), res.indexOf(";\n" +
//             "window._ASSETS_DOMAIN_"));
//         let result = {};
//         if (jsonStr) {
//             let jsonData = null;
//             if (isJson(jsonStr)) {
//                 jsonData = JSON.parse(jsonStr);
//             }
//             let image = getNested(jsonData, "children", "2", "children", "3", "children", "2", "attributes", "productImage", "value", "url", "big");
//             let attributeJson = getNested(jsonData, "children", "1", "children", "1", "children", "0", "attributes");
//             let productOrderValue = getNested(jsonData, "children", "2", "children", "2", "children", "0", "attributes", "productOrderOverview", "value");
//             //产品id
//             let productId = getNested(attributeJson, "detailId");
//             //价格
//             let tradePrice = getNested(jsonData, "children", "1", "children", "1", "children", "2", "attributes", "productTransactionProperties", "value", "0", "attrValue");
//             result.tradePrice = tradePrice;
//             result.isLadderPrice = false;
//             let quantityPrices = getNested(jsonData, "children", "1", "children", "1", "children", "2", "attributes", "productTransactionProperties", "value");
//             if (quantityPrices && quantityPrices.length > 0) {
//                 result.ladderPrice = quantityPrices[1].attrValue;
//                 result.isLadderPrice = true;
//             }
//             // 图片
//             result.image = image;
//             // 订单数
//             result.productOrderValue = productOrderValue;
//             result.productId = productId;
//             result.detailProductUrl = url;
//             return result;
//         } else {
//             let resultJson = res.substring(res.indexOfEnd("window.detailData = "), res.indexOf("\"js_ssr\"}}}")) + "\"js_ssr\"}}}";
//             let resultStrData = null;
//             if (isJson(resultJson)) {
//                 resultStrData = JSON.parse(resultJson);
//             }
//             // 图片
//             let mediaItems = getNested(resultStrData, "globalData", "product", "mediaItems")
//             let img = "";
//             if(mediaItems){
//                 let firstImageUrlObj = mediaItems.find(i => i.imageUrl)
//                 img = getNested(firstImageUrlObj,  "imageUrl", "big")
//             }
//             // id
//             let id = getNested(resultStrData, "globalData", "extend", "detailId")
//             // fob
//             let ladderFob = getNested(resultStrData, "globalData", "product", "price", "productLadderPrices")
//             let onlyFob = getNested(resultStrData, "globalData", "product", "price", "productRangePrices", "priceRangeText")
//             let fob
//             if (ladderFob && ladderFob.length > 0) {
//                 let fobArr = ladderFob.map(i => i.formatPrice)
//                 let minFob = fobArr[fobArr.length - 1]
//                 let maxFob = fobArr[0]
//                 fob = `US ${minFob} - ${maxFob} / Piece`
//                 result.isLadderPrice = true
//             }
//             if (onlyFob) {
//                 fob = `US ${onlyFob} / Piece`
//                 result.isLadderPrice = false
//             }
//             // moq
//             let moq = getNested(resultStrData, "globalData", "product", "moq")
//             let moqPiece
//             if (moq) {
//                 moqPiece = moq + " Piece/Pieces"
//             }
//             result.image = img
//             result.productId = id
//             result.detailProductUrl = url
//             result.ladderPrice = moqPiece
//             result.tradePrice = fob
//             //order
//             url = url.slice(0, url.indexOf(".com")) + ".com"
//             if(id){
//                 let getProductValue = await getTransaction(id, url)
//                 result.productOrderValue = getProductValue
//             }
//             return result
//         }
//     })
// }
// async function getTransaction(detailId, url) {
//     return Axios({
//         url: `${url}/event/app/productExportOrderQuery/transactionOverview.htm?detailId=${detailId}`,
//         method: "get"
//     }).then(res => {
//         return res.data ? res.data : {}
//     })
// }

// async function getShowCaseDetailProduct(productUrls) {
//     let promiseArray = [];
//     for (let url of productUrls) {
//         const dataPromise = getAliShowCaseProductFromUrl(url);
//         promiseArray.push(dataPromise);
//     }
//     const result = await Promise.all(promiseArray);
//     let top10Result =  result.slice(0, 10)
//     // 新询盘接口
//     const inquiryPromiseArray = []
//     for (const item of top10Result) {
//         const inquiryPromise = inquiryService.getInquiryNew(item.productId).then(res => {
//             if (res && typeof res === "string") {
//                 const inquiry = res.split(",")
//                 item.inquiry = inquiry.length > 0 ? Number(inquiry[0]) : 0
//             } else {
//                 item.inquiry = 0
//             }
//         })
//         inquiryPromiseArray.push(inquiryPromise)
//         await sleep(500)
//     }
//     await Promise.all(inquiryPromiseArray)
//     const inquiryResult = top10Result.sort((a, b) => {
//         if(a.inquiry > b.inquiry) {
//             return -1;
//         }
//         if(a.inquiry < b.inquiry){
//             return 1;
//         }
//         return getTotalTransactions(b) - getTotalTransactions(a)
//     });
//     return inquiryResult;
// }

// function getTotalPage(url) {
//     return Axios({
//         url,
//         method: "get"
//     }).then(res => {
//         const parser = new DOMParser();
//         const htmlParser = parser.parseFromString(res, "text/html");
//         const elementNode = htmlParser.querySelector("div[module-title=\"productListPc\"]");
//         const elementAttr = elementNode.getAttribute("module-data")
//         let objs = unescape(elementAttr)
//         if (isJson(objs)){
//             objs = JSON.parse(objs)
//         }
//         const total = getNested(objs, "mds", "moduleData", "data", "pageNavView", "totalLines")
//         const page = getNested(objs, "mds", "moduleData", "data", "pageNavView", "pageLines")
//         if (total && page) {
//             return total % page === 0 ? total / page : total / page + 1
//         } else {
//             return 1
//         }
//     })
// }

// function getProductUrlsPerpage(url, i) {
//     const host = "https:";
//     const params = {
//         filterSimilar: true,
//         filter: null,
//         sortType: "ctrOrder-desc"
//     }
//     return Axios({
//         url,
//         method: "get",
//         params
//     }).then(res => {
//         let domParser = new DOMParser();
//         let document = domParser.parseFromString(res, "text/html");
//         let productListNode = document.querySelector("div.component-product-list");
//         if (!productListNode) {
//             let listNode = document.querySelector("div.grid960 div");
//             if (listNode && listNode.hasAttribute("module-data")) {
//                 let productListNode1 = document.querySelector("div.grid960 div").getAttribute("module-data");
//                 if (productListNode1) {
//                     let unescapeArr = unescape(productListNode1);
//                     let jsonData = null;
//                     if (isJson(unescapeArr)) {
//                         jsonData = JSON.parse(unescapeArr);
//                     }
//                     let productList = getNested(jsonData, "mds", "moduleData", "data", "productList");
//                     console.log(productList);
//                     if (productList) {
//                         let productUrls1 = [];
//                         for (let link of productList) {
//                             productUrls1.push(host + link.url);
//                         }
//                         return productUrls1
//                     }
//                     return []
//                 }
//                 console.log("productListNode is null");
//                 return []
//             }
//             console.log("div.grid960 div is null");
//             return []
//         } else {
//             let productUrls = [];
//             let aLinks = productListNode.getElementsByTagName("a");
//             for (const link of aLinks) {
//                 if (link.getAttribute("class").includes("title-link")) {
//                     productUrls.push(host + link.getAttribute("href"));
//                 }
//             }
//             return productUrls
//         }
//     })
// }

// async function getProductDetailUrl(url) {
//     let page = await getTotalPage(url);
//     let urlArray = [];
//     if (page >= 1) {
//         let urls = await getProductUrlsPerpage(url, 1);
//         urlArray.push(...urls);
//     }
//     return urlArray;
// }

// function getShopUrl(ctoken) {
//     const url = "https://i.alibaba.com/ajax/sellerProfileAjax.do";
//     //获取_tb_token_
//     let _tb_token_ = "";
//     chrome.cookies.get({
//         name: "_tb_token_",
//         url: "https://i.alibaba.com"
//     }, function (cookie) {
//         _tb_token_ = cookie.value;
//     });

//     let params = {
//         ctoken: ctoken,
//         _tb_token_: _tb_token_
//     };
//     return Axios({
//         url,
//         params
//     }).then(res => {
//         if (res) {
//             return res.minisite;
//         }
//         return "";
//     });
// }

let currentProgress = 0;
let eachScore = 10;
function infoProgress(progress) {
  const moduleName = "industryProductAnalyse";
  currentProgress += progress;
  progressPort.postMessage({ moduleName, progress: currentProgress });
}

function resetScore(port, urlArray) {
  progressPort = port;
  currentProgress = 0;
  eachScore = 100 / urlArray.length / 10;
}

// async function getCompanyInfo(shopAddress) {
//   return Axios({
//     url: `${shopAddress}/company_profile.html`,
//   }).then((res) => {
//     let shopSignJsonData = getJsonFromTargetDiv(res, "icbu-pc-shopSign");
//     let supplierStars = getNested(
//       shopSignJsonData,
//       "mds",
//       "moduleData",
//       "data",
//       "supplierStars"
//     );
//     let companyName = getNested(
//       shopSignJsonData,
//       "mds",
//       "moduleData",
//       "data",
//       "companyName"
//     );
//     let year = getNested(
//       shopSignJsonData,
//       "mds",
//       "moduleData",
//       "data",
//       "companyJoinYears"
//     );
//     let supplierMainProducts = getNested(
//       shopSignJsonData,
//       "mds",
//       "moduleData",
//       "data",
//       "supplierMainProducts"
//     );

//     let supplierResponseRate, supplierResponseTime, averageStar, isVerified;
//     let verifiedOverviewJsonData = getJsonFromTargetDiv(
//       res,
//       "icbu-pc-verifiedOverview"
//     );
//     if (verifiedOverviewJsonData) {
//       isVerified = true;
//       supplierResponseRate = getNested(
//         verifiedOverviewJsonData,
//         "mds",
//         "moduleData",
//         "data",
//         "supplierResponseRate",
//         "value"
//       );
//       supplierResponseTime = getNested(
//         verifiedOverviewJsonData,
//         "mds",
//         "moduleData",
//         "data",
//         "supplierResponseTime",
//         "value"
//       );
//       averageStar = getNested(
//         verifiedOverviewJsonData,
//         "mds",
//         "moduleData",
//         "data",
//         "averageStar",
//         "value"
//       );
//     }
//     if (!verifiedOverviewJsonData) {
//       isVerified = false;
//       let cpCompanyOverviewJsonData = getJsonFromTargetDiv(
//         res,
//         "icbu-pc-cpCompanyOverview"
//       );
//       if (cpCompanyOverviewJsonData) {
//         supplierResponseRate = getNested(
//           cpCompanyOverviewJsonData,
//           "mds",
//           "moduleData",
//           "data",
//           "supplierResponseRate",
//           "value"
//         );
//         supplierResponseTime = getNested(
//           cpCompanyOverviewJsonData,
//           "mds",
//           "moduleData",
//           "data",
//           "supplierResponseTime",
//           "value"
//         );
//         averageStar = getNested(
//           cpCompanyOverviewJsonData,
//           "mds",
//           "moduleData",
//           "data",
//           "supplierRatingReviews",
//           "value",
//           "averageStar"
//         );
//       }
//     }
//     let result = {
//       companyName,
//       year,
//       averageStar,
//       supplierResponseRate,
//       supplierResponseTime,
//       supplierStars,
//       supplierMainProducts,
//       isVerified,
//     };
//     console.log(result);
//     return result;
//   });
// }

async function getAliMemberEncryptId(url) {
  return Axios({
    url,
  }).then((res) => {
    const data_uid = subStringBetween(res, 'data-uid="', '"');
    return data_uid;
  });
}

async function getTransactionInfo(ctoken, shopAddress) {
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

// function getJsonFromTargetDiv(res, id) {
//   try {
//     let domParser = new DOMParser();
//     let document = domParser.parseFromString(res, "text/html");
//     let targetDiv = document.querySelector(`div[module-name='${id}']`);
//     let moduleData = targetDiv.getAttribute("module-data");
//     moduleData = decodeURIComponent(moduleData);
//     let jsonData = JSON.parse(moduleData);
//     console.log(jsonData);
//     return jsonData;
//   } catch (e) {
//     console.log(`getJsonFromTargetDiv fail, id is ${id}`);
//     return null;
//   }
// }

async function getHotProductList(shopAddress) {
  return companyService.getProductList(shopAddress, {
    sortType: "ctrOrder-desc",
    page: 1,
  });
}

function toProductTransactionInfoPromise(id) {
  return Axios({
    url: `https://www.alibaba.com/event/app/productExportOrderQuery/transactionOverview.htm?detailId=${id}`,
    method: "get",
  }).then((res) => {
    return res.data ? res.data : {};
  });
}

async function getProductsTransactionInfo(hotProductList) {
  let promiseArray = hotProductList.map((item) => {
    return toProductTransactionInfoPromise(item.id).then((res) => {
      item.transactionInfo = res;
    });
  });
  await Promise.all(promiseArray);
}

async function getHotProductInfo(shopAddress) {
  let hotProductList = await getHotProductList(shopAddress);
  console.log(hotProductList);
  infoProgress(eachScore);
  await getProductsTransactionInfo(hotProductList);
  infoProgress(eachScore * 2);
  return hotProductList;
}

async function getShowCaseProductList(shopAddress) {
  return companyService.getShowcaseProductList(shopAddress);
}

async function getShowCaseProductInfo(shopAddress) {
  let showCaseProductList = await getShowCaseProductList(shopAddress);
  console.log(showCaseProductList);
  infoProgress(eachScore);
  await getProductsTransactionInfo(showCaseProductList);
  infoProgress(eachScore * 2);
  return showCaseProductList;
}

async function getProductInfo(shopAddress) {
  let hotProductInfo = await getHotProductInfo(shopAddress);
  let showCaseProductInfo = await getShowCaseProductInfo(shopAddress);
  return { hotProductInfo, showCaseProductInfo };
}

function formatToUrlArray(urlList) {
  let urlArray = urlList
    .split("\n")
    .filter((v) => {
      return v.trim() !== "";
    })
    .map((url) => {
      if (!url.endsWith("com")) {
        url = url.split(".com")[0] + ".com";
      }
      return url;
    });
  return urlArray;
}

const sameIndustryAnalyseService = {
  async sameIndustryService(ctoken, urlList, port) {
    let urlArray = formatToUrlArray(urlList);
    resetScore(port, urlArray);
    let result = [];
    for (let shopAddress of urlArray) {
      try {
        let companyInfo = await companyService.getCompanyInfo(shopAddress);
        infoProgress(eachScore);
        let transactionInfo = await getTransactionInfo(ctoken, shopAddress);
        infoProgress(eachScore);
        let productsInfo = await getProductInfo(shopAddress);
        result.push({
          shopAddress,
          companyInfo,
          transactionInfo,
          productsInfo,
        });
      } catch (err) {
        console.error(`获取${shopAddress}同行分析出错了:${err}`);
      }
    }
    console.log(result);
    return result;
  },
};

export default sameIndustryAnalyseService;
