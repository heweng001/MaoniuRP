import amazonProductService from "@/js/ali_service/amazon_product_service";
import inquiryService from "@/js/ali_service/inquiry_service";
import mydataService from "@/js/ali_service/mydata_service";
import productService from "@/js/ali_service/product-service";
import sameIndustryAnalyseService from "@/js/ali_service/same_industry_analyse_service";
import campaignService from "@/js/service/campaign";
import productCheckService from "@/js/service/checkProductScoreService";
import collectProductManage from "@/js/service/collect-product-manage";
import gatherProductService from "@/js/service/gather-product";
import keywordService from "@/js/service/keyword";
import reportService from "@/js/service/report";
import reportDetailService from "@/js/service/report-detail";
import searchProductService from "@/js/service/search-product";
import shopDataService from "@/js/service/shop-data";
import uploadImageService from "@/js/service/upload-image";
import uploadVideoService from "@/js/service/upload-video";
import "@/js/util/loki";
import { Axios } from "common";
import _ from "lodash";
import { isArrayLength } from "util";
import "../img/AI.png";
import "../img/logo-128.png";
import "../img/logo-48.png";
import companyService from "./ali_service/company_service";

import photobankService from "./ali_service/photobank-service";
import {
  DEFAULT_TEMPLATE_INFO,
  SUPPORT_DOMAIN_ARRAY,
} from "./const/collect-product";
import headerConfig from "./header-config";
import bookmarksService from "./service/bookmarks-service";
import industryHotInquiries from "./service/industry-hot-inquiries";
import sleep from "./util/sleep";
// import { group } from "console";

const QUERY_KEYWORD_BY_GROUPS = "queryKeywordByGroups";
const QUERY_GROUP = "queryGroup";
const GATHER_HOT_SEARCH_WORD = "gatherHotSearchWord";
const QUERY_CATEGORY = "queryCategory";
const CHECK_PRODUCT_SCORE = "checkProductScore";
// deprecated
const QUERY_PEER_KEYWORD = "queryPeerKeyword";
const GATHER_PRODUCT = "gatherProduct";
const GATHER_PRODUCT_NEW = "gatherProductNew";
const GATHER_CATEGORY_URLS = "gatherCategoryUrls";
const SYNC_CATEGORY = "syncCategory";
const CHECK_PRODUCT_SHOP = "checkProductShop";
const SYNC_CATEGORY_SPARE = "syncCategorySpare";
const GET_COOKIE = "getCookie";
const GET_VERSION = "getVersion";
const SEARCH_PRODUCT_BY_IMAGE = "searchProductByImage";
const SEARCH_PRODUCT_BY_1688_IMAGE = "searchProductBy1688Image";
const UPLOAD_URL_TO_ALI = "uploadUrlToAli";
const DATA_REPORT = "getDataReport";
const DATA_REPORT_DETAIL = "getDataReportDetail";
const SHOP_DATA = "getShopData";
const SYNC_RANK = "syncRank";
const SYNC_RANK_NEW = "syncRankNew";
const SYNC_RANK_ONE = "syncRankOne";

const NOEFFECT_PRODUCT = "noEffectProduct";
const NO_EFFECT_UNDER_PRODUCT = "noEffectUnderProduct";
// const REFRESH_SHOWCASE = "refreshShowcase";
// const REFRESH_SHOWCASE_TOP = "refreshShowcaseTop";
const IMAGE_SHIELD_CHECK = "imageShieldCheck";
const LOGIN_CHECK = "loginCheck";
const UPLOAD_IMAGE = "uploadImage";
const UPLOAD_FILE_BROKER = "uploadFileToPhotoBank";
const SYNC_CAMPAIGN_DATA = "syncCampaignData";
const UPDATE_CAMPAIGN_DATA = "updateCampaignData";
const SYNC_CAMPAIGN_PRODUCT_DATA = "syncCampaignProductData";
const SYNC_CAMPAIGN_KEYWORD_DATA = "syncCampaignKeywordData";
const PRODUCT_RISK_CHECK = "productRiskCheck";
const UPLOAD_PRODUCT_VIDEO = "productVideo";
const PRODUCT_DETAIL_TEMPLATE = "productDetailTemplate";
const KEYWORDS_GROUP = "keywordsGroup";
const ADD_MY_KEYWORD_LIBRARY = "addMyKeywordLibrary";
const ZERO_EFFECT_PRODUCT_ID = "zeroEffectProductId";
const SMART_DETAIL_PRODUCT_ID = "smartDetailProductId";
const AMAZON_PRODUCT_CATEGORY = "amazonProductCategory";
const UPLOAD_VIDEO_TO_VIDEO_BANK = "uploadVideoToVideoBank";
const INEFFECTIVE_PRODUCTS = "ineffectiveProducts";
const OFF_SHELF_INVALID_PRODUCTS = "offShelfInvalidProducts";
const DELETE_OFF_SHELF_INVALID_PRODUCTS = "deleteOffShelfInvalidProducts";
const DELETE_INEFFECTIVE_PRODUCTS = "deleteIneffectiveProducts";
const OFFLINE_INEFFECTIVE_PRODUCTS = "offlineIneffectiveProducts";
const CHECK_ALI_LOGIN = "checkAliLogin";
const SHOP_CATEGORY_INQUIRIES = "shopCategoryInquiries";
const PRODUCT_DETAIL_REVIEWS = "productDetailReviews";
const PRODUCT_DETAIL_TRANSACTIONS = "productDetailTransactions";
const PRODUCT_DETAIL = "productDetail";
const PRODUCT_LIST = "productList";
const SHOWCASE_PRODUCTS = "showcaseProducts";
const COMPANY_TRANSACTION_HISTORY = "getCompanyTransactionHistory";
const COMPANY_INFO = "getCompanyInfo";
const CHECK_BOOKMARKS = "check_bookmarks";
const TRADEABLE_SOURCING = "tradeableSourcing";

let progressPort;
let keywordPort;
let weeklyDataPort;
let productHelperPort;
let pluginVersionPort;
let ctoken;
let nickname;
// 同行重点产品分析
const Same_Industry_Key_Analyse_Service = "sameIndustryKeyAnalyseService";

console.log(
  `操盘手插件id: ${chrome?.runtime?.id}, 版本：${
    chrome?.runtime?.getManifest()?.version
  }`
);

// 加载 header 处理
headerConfig.loadHandler(chrome);

chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    console.log(
      "chrome.runtime.onMessageExternal.addListener get request",
      request
    );
    messageCallbackWithCtoken(request, sender, sendResponse);
    return true;
  }
);

function initCtoken() {
  return getTokenAndNickname().then(({ ctoken: ct, nickname: nick }) => {
    ctoken = ct;
    nickname = nick;
  });
}

initCtoken();

function getSaveProductUrl(domain) {
  if (domain === "localhost") {
    return "http://192.168.5.123:8761/api/v1/products/web-products/by-plugin-new";
  }
  return `https://${domain}/api/v1/products/web-products/by-plugin-new`;
}

async function uploadProductVideoToAli(data, ctoken) {
  const { formList } = data;
  if (isArrayLength(formList)) {
    const idVideoList = formList
      .map((m) => {
        return {
          value: m.videoUrl || "",
          model: m.model || "",
        };
      })
      .filter((f) => f && f.value);
    if (isArrayLength(idVideoList)) {
      const param = {
        idVideoList,
      };
      const res = await gatherProductService.postProductVideo(param, ctoken);
      return !isArrayLength(res);
    }
    return false;
  }
  return false;
}

async function saveProductToAi(domain, nick, res, ctoken, productHelperPort) {
  let templateName = await new Promise((resolve) => {
    chrome.storage.sync.get("templateName", (res) => {
      resolve(res["templateName"]);
    });
  });
  if (!templateName) {
    templateName = setDefaultTemplateInfo();
  }
  const url = getSaveProductUrl(domain);
  const data = await collectProductManage.getCollectProductData(
    res.result,
    templateName,
    domain
  );
  // 上传产品视频
  const state = await uploadProductVideoToAli(data, ctoken);
  productHelperPort.postMessage({ type: "uploadProductVideo", data: state });
  const params = {
    nick,
  };
  return Axios({
    url,
    method: "post",
    data,
    params,
  }).then((res) => {
    return res;
  });
}

function setDefaultTemplateInfo() {
  return DEFAULT_TEMPLATE_INFO;
}

// async function handleGatherProductFromCatUrl(categoryUrl, domain, nick) {
//   let urls = await gatherProductService.getProductUrlsFromCat(categoryUrl);
//   let totalResult = {result:[],failUrls:[]}
//   let currentScore = 0;
//   let eachUrlScore = 90 / urls.length;
//   for (let url of urls) {
//     let res = await gatherProductService.gatherProductFromUrlList([url], ctoken)
//     let {result,failUrls} = res;
//     totalResult.result.push(...result);
//     totalResult.failUrls.push(...failUrls);
//     currentScore += eachUrlScore;
//     productHelperPort.postMessage({type:"gatherProductProgress", data: currentScore})
//   }
//   let response = await saveProductToAi(domain,nick,totalResult);
//   productHelperPort.postMessage({type:"gatherProductResponse", data: response})
// }

function addMessageListener(productHelperPort) {
  productHelperPort.onMessage.addListener(async function (msg) {
    console.log(msg, "msg");
    const { type, reply } = msg;
    // 检测操盘手登录
    if (type === "checkAiLogin") {
      checkAiLogin().then((loginResult) => {
        productHelperPort.postMessage({ type: reply, data: loginResult });
      });
    }
    // 检测阿里登录
    if (type === CHECK_ALI_LOGIN) {
      initCtoken().then(() => {
        productHelperPort.postMessage({
          type: reply,
          data: { login: !!ctoken, nickname },
        });
      });
    }
    // 获取采集品设置列表发送给页面组件
    if (type === "getCollectProductConfig") {
      const { domain } = msg;
      collectProductManage.getCollectProductConfig(domain).then((res) => {
        productHelperPort.postMessage({ type: reply, data: res });
      });
    }
    // 获取采集品设置详情发送给页面组件
    if (type === "getCollectProductConfigDetail") {
      const { id, domain } = msg;
      collectProductManage
        .getCollectProductConfigDetail(id, domain)
        .then((res) => {
          productHelperPort.postMessage({ type: reply, data: res });
        });
    }
    if (type === GATHER_PRODUCT) {
      initCtoken();
      let { url, domain, nick, isCategoryPage, number, origin } = msg;
      if (isCategoryPage) {
        // 缓存1688产品页host
        localStorage.setItem("product1688Host", origin);
        let urls = await gatherProductService.getProductUrlsFromCat(
          url,
          number
        );
        let totalResult = { result: [], failUrls: [] };
        let currentScore = 0;
        let eachUrlScore = 90 / urls.length;
        for (let url of urls) {
          let res = await gatherProductService.gatherProductFromUrlList(
            [url],
            ctoken
          );
          let { result, failUrls } = res;
          totalResult.result.push(...result);
          totalResult.failUrls.push(...failUrls);
          currentScore += eachUrlScore;
          productHelperPort.postMessage({
            type: "gatherProductProgress",
            data: currentScore,
          });
        }
        // 验证码提示
        if (!isArrayLength(totalResult.result)) {
          productHelperPort.postMessage({
            type: "collectProductPrompt",
            data: urls.length,
          });
          return;
        } else {
          const diff = urls.length - totalResult.result.length;
          if (diff) {
            productHelperPort.postMessage({
              type: "collectProductPrompt",
              data: diff,
            });
          }
        }
        let response = await saveProductToAi(
          domain,
          nick,
          totalResult,
          ctoken,
          productHelperPort
        );
        productHelperPort.postMessage({
          type: "gatherProductResponse",
          data: response,
        });
      } else {
        gatherProductService
          .gatherProductFromUrlList([url], ctoken)
          .then(async (res) => {
            let response = await saveProductToAi(
              domain,
              nick,
              res,
              ctoken,
              productHelperPort
            );
            productHelperPort.postMessage({
              type: "gatherProductProgress",
              data: 90,
            });
            productHelperPort.postMessage({
              type: "gatherProductResponse",
              data: response,
            });
          });
      }
    }
    if (type === "gatherProductByLink") {
      initCtoken();
      let { url, domain, nick } = msg;
      gatherProductService
        .gatherProductFromUrlList([url], ctoken)
        .then(async (res) => {
          let response = await saveProductToAi(
            domain,
            nick,
            res,
            ctoken,
            productHelperPort
          );
          // console.log(response, "response");
          productHelperPort.postMessage({
            type: "gatherProductByLinkResponse",
            data: response,
          });
        });
    }
  });
}

async function checkAiLogin() {
  const domainArray = SUPPORT_DOMAIN_ARRAY;
  let promiseArray = [];
  domainArray.forEach((domain) => {
    let promise = new Promise((resolve) => {
      // check tab exist`
      chrome.tabs.query({ url: `*://${domain}/*` }, (res) => {
        // console.log(res);
        if (!res || res.length === 0) {
          resolve({ login: false, domain });
        }
        // check nick
        chrome.cookies.getAll(
          {
            domain,
          },
          function (cookies) {
            // console.log("cookies", cookies);
            let nickCookie = cookies.filter((c) => c.name === "nick");
            if (Array.isArray(nickCookie) && nickCookie.length > 0) {
              resolve({ login: true, domain, nick: nickCookie[0].value });
            }
            resolve({ login: false, domain });
          }
        );
      });
    });
    promiseArray.push(promise);
  });
  let result = await Promise.all(promiseArray);
  console.log("check login result", result);
  return result;
}

chrome.runtime.onConnect.addListener(function (port) {
  if (port.name === "progressContent") {
    progressPort = port;
  }
  if (port.name === "queryKeywordByGroups") {
    keywordPort = port;
  }
  if (port.name === "weeklyData") {
    weeklyDataPort = port;
  }
  if (port.name === "productHelper") {
    productHelperPort = port;
    addMessageListener(productHelperPort);
  }
  if (port.name === "pluginVersion") {
    pluginVersionPort = port;
  }
});

function checkUsername(nicknameReq, nickname) {
  if (
    nicknameReq &&
    nickname &&
    nicknameReq.trim().toLowerCase() === nickname.trim().toLowerCase()
  ) {
    return true;
  }
  return false;
}

async function searchProductByImage(param, sendResponse) {
  console.log(param);
  let data = await searchProductService.searchAliProductByImageUrl(param);
  sendResponse(data);
}
async function searchProductBy1688Image(param, sendResponse) {
  const res = await searchProductService.searchAliProductBy1688ImageUrl(param);
  sendResponse({ success: true, data: res });
}

function getHrefDomain(href) {
  const hostRegex = /\/\/([^/]+)\//;
  const hostMatch = href.match(hostRegex);
  const domain = hostMatch && hostMatch[1];
  return domain;
}

function uploadImage(param, ctoken, href, sendResponse) {
  /**
   * @ignoreExists 是否忽略已存在的图片
   * @autoCompress 是否自动压缩图片
   */
  let { urls, groupId, model, ignoreExists, autoCompress } = param;

  const domain = getHrefDomain(href);

  uploadImageService
    .uploadImageUrlArray(
      ctoken,
      urls,
      groupId,
      model,
      ignoreExists,
      domain,
      autoCompress
    )
    .then((res) => {
      sendResponse({ success: true, data: res });
    });
}

async function uploadFile(param, ctoken, href, sendResponse) {
  let { base64, model, autoCompress } = param;

  const domain = getHrefDomain(href);

  let { url } = await uploadImageService.uploadFile(base64).then((res) => {
    const { url } = res;
    if (!model) {
      model = url?.substring(url.length - 16, url.length);
    }
    return { url }
  });
  for (let i = 0; i < 5; i++) {
    const res = await uploadImageService.uploadUrlToPhotoBank(
      ctoken,
      url,
      undefined,
      model,
      domain,
      autoCompress
    );

    if (res == undefined || res?.reason === "302") {
      await sleep(1000);
    } else {
      const { success, newUrl, message } = res;
      sendResponse({ success, message, data: { url: newUrl } });
      break;
    }
  }
}

async function syncCampaignData(param, ctoken, sendResponse) {
  let data = await campaignService.syncCampaignData();
  sendResponse({ success: true, data });
}

async function syncCampaignKeywordData(param, ctoken, sendResponse) {
  let data = await campaignService.syncCampaignKeywordData();
  sendResponse({ success: true, data });
}

async function updateCampaignData(param, sendResponse) {
  let data = await campaignService.updateCampaignData(param);
  sendResponse({ success: true, data });
}

async function syncCampaignProductData(param, ctoken, sendResponse) {
  let data = await campaignService.syncCampaignProductData(ctoken, param);
  sendResponse({ success: true, data });
}

async function checkProductScore(param, sendResponse) {
  let promiseArray = [];
  if (Array.isArray(param)) {
    for (let data of param) {
      let promise = await productCheckService.checkScore(data);
      promiseArray.push(promise);
    }
  }
  let result = await Promise.all(promiseArray);
  sendResponse({ success: true, data: result });
}

async function checkProductRisk(param, ctoken, sendResponse) {
  let promiseArray = [];
  if (Array.isArray(param)) {
    for (let data of param) {
      let promise = await productCheckService.checkProductRisk(data);
      promiseArray.push(promise);
    }
  }
  let result = await Promise.all(promiseArray);
  sendResponse({ success: true, data: result });
}

async function uploadUrlToAli(param, sendResponse) {
  let result = await uploadImageService.uploadUrlToAli(param.url);
  sendResponse({ success: true, data: result });
}

async function amazonProductCategory(sendResponse) {
  const result = await amazonProductService.getAmazonProductCategoryList();
  sendResponse({ success: true, data: result });
}

async function dealMessageWithCtoken(
  ctoken,
  nickname,
  request,
  sender,
  sendResponse
) {
  console.log(`ctoken is ${ctoken}, nickname is ${nickname}`);
  const { type } = request;
  switch (type) {
    // 检测国际站登录状态
    case CHECK_ALI_LOGIN: {
      if (ctoken) {
        sendResponse({
          success: true,
          login: true,
          message: `国际站 ${nickname} 已登录`,
        });
      } else {
        sendResponse({ success: true, login: false, message: "国际站未登录" });
      }
      return;
    }
    // 检测插件当前版本
    case GET_VERSION: {
      getVersion(sendResponse, pluginVersionPort);
      return;
    }
    case CHECK_BOOKMARKS: {
      const result = await bookmarksService.checkBookmarks();
      sendResponse(result);
      return;
    }
    // 获取店铺基本信息
    // case "supplierIdentity": {
    //   try {
    //     const res = await companyService.supplierIdentity(ctoken);
    //     sendResponse({ success: true, data: res });
    //   } catch (e) {
    //     sendResponse({ success: false, message: e.message });
    //   }
    //   break;
    // }
    // 店铺类目询盘统计
    case SHOP_CATEGORY_INQUIRIES: {
      const { query } = request;
      const shopUrl = "https://" + query.shop;

      try {
        const data = await industryHotInquiries.shopCategoryInquries(shopUrl);
        sendResponse({
          success: true,
          data,
        });
      } catch (e) {
        console.error(e);
        sendResponse({ success: false, message: e.message });
      }
      return;
    }
    // 前台店铺信息
    case COMPANY_INFO: {
      const { query } = request;
      const shopUrl = "https://" + query.shop;
      try {
        const data = await companyService.getCompanyInfo(shopUrl);

        sendResponse({ success: true, data });
      } catch (e) {
        console.error(e);
        sendResponse({ success: false, message: e.message });
      }
      return;
    }
    // 前台店铺交易数据
    case COMPANY_TRANSACTION_HISTORY: {
      const { query } = request;
      const shopUrl = "https://" + query.shop;
      try {
        const data = await companyService.getTransactionHistory(
          ctoken,
          shopUrl
        );
        sendResponse({ success: true, data: data });
      } catch (e) {
        console.error(e);
        sendResponse({ success: false, message: e.message });
      }
      return;
    }
    // 前台橱窗产品
    case SHOWCASE_PRODUCTS: {
      const { query } = request;
      const shopUrl = "https://" + query.shop;
      try {
        const data = await companyService.getShowcaseProductList(shopUrl);
        sendResponse({ success: true, data: data });
      } catch (e) {
        console.error(e);
        sendResponse({ success: false, message: e.message });
      }
      return;
    }
    // 前台产品列表
    case PRODUCT_LIST: {
      const { query } = request;
      const { sortType, page, shop } = query;
      const shopUrl = `https://${shop}`;
      try {
        const data = await companyService.getProductList(shopUrl, {
          sortType,
          page,
        });
        sendResponse({ success: true, data: data });
      } catch (e) {
        console.error(e);
        sendResponse({ success: false, message: e.message });
      }
      return;
    }
    // 前台产品详情页
    case PRODUCT_DETAIL: {
      const { query } = request;
      const url = query.url;
      try {
        const data = await productService.getProductDetail(url);
        sendResponse({ success: true, data: data });
      } catch (e) {
        console.error(e);
        sendResponse({ success: false, message: e.message });
      }
      return;
    }
    // 前台产品详情交易数据
    case PRODUCT_DETAIL_TRANSACTIONS: {
      const { query } = request;
      const id = query.id;
      try {
        const data = await productService.getProductDetailTransactions(id);
        sendResponse({ success: true, data: data });
      } catch (e) {
        console.error(e);
        sendResponse({ success: false, message: e.message });
      }
      return;
    }
    // 前台详情评论数据
    case PRODUCT_DETAIL_REVIEWS: {
      const { query } = request;
      const { companyId, productId } = query;
      chrome.cookies.getAll(
        {
          domain: ".alibaba.com",
          name: "_m_h5_tk",
        },
        async function (cookies2) {
          if (cookies2[0] && cookies2[0].value) {
            let token = cookies2[0].value.split("_")[0];
            productService
              .getProductDetailReviews(token, companyId, productId)
              .then((res) => {
                sendResponse({ success: true, data: res });
              })
              .catch((e) => {
                sendResponse({ success: false, message: e.message });
              });
          }
        }
      );
      return;
    }
  }
  // 国际站登录场景使用
  if (ctoken) {
    let prepare = await prepareDeal();
    if (!prepare && request.type !== GET_VERSION) {
      sendResponse({
        success: false,
        message: "账号未登录或者账号登录过期，请重新登录",
      });
      return;
    }
    const { type, query: param, extensions, href } = request;
    // let type = request.type;
    // let param = request.query;
    // let extensions = request.extensions;
    // let href = request.href;
    // console.log(request);
    switch (type) {
      case TRADEABLE_SOURCING: {
        if (!checkUsername(request.nickname, nickname)) {
          sendResponse({
            success: false,
            message: "AI操盘手和阿里国际站登录账号不一样",
          });
          break;
        }
        try {
          const products = await productService.getAllTradeableSourcingProducts(
            ctoken
          );
          sendResponse({ success: true, data: products });
        } catch (e) {
          console.error(" tradeableSourcing 请求异常: ", e);
          sendResponse({ success: false, message: e.message });
        }
        return;
      }
      case "deletePhotoBankImages": {
        if (!checkUsername(request.nickname, nickname)) {
          sendResponse({
            success: false,
            message: "AI操盘手和阿里国际站登录账号不一样",
          });
          break;
        }
        const { ids } = request.query;
        photobankService.deletePhotoBankImage(ctoken, ids).then((res) => {
          const { isSuccess, message } = res;
          if (isSuccess) {
            sendResponse({ success: true, data: res });
          } else {
            sendResponse({ success: false, message, data: res });
          }
        });
        break;
      }
      case "validateDescriptionImage": {
        const { content } = request.query;
        if (!checkUsername(request.nickname, nickname)) {
          sendResponse({
            success: false,
            message: "AI操盘手和阿里国际站登录账号不一样",
          });
          break;
        }
        productService
          .ajaxValidateDescriptionImage(ctoken, content)
          .then((res) => {
            sendResponse({ success: true, data: res });
          });
        break;
      }
      case SYNC_CATEGORY: {
        syncCatogery(param, ctoken, href, sendResponse);
        break;
      }
      case SYNC_CATEGORY_SPARE: {
        syncCatogerySpare(param, ctoken, href, sendResponse);
        break;
      }
      case CHECK_PRODUCT_SHOP: {
        checkProductShop(param, sendResponse);
        break;
      }
      case GET_COOKIE: {
        getCookie(sendResponse);
        break;
      }
      case UPLOAD_IMAGE: {
        uploadImage(param, ctoken, href, sendResponse);
        break;
      }
      // 上传图片到 FileBroker 改为直接上传到图片银行
      case UPLOAD_FILE_BROKER: {
        uploadFile(param, ctoken, href, sendResponse);
        break;
      }
      case PRODUCT_RISK_CHECK: {
        checkProductRisk(param, ctoken, sendResponse);
        break;
      }
      case SYNC_CAMPAIGN_DATA: {
        console.log(request);
        let nicknameReq = request.nickname;
        if (
          nicknameReq &&
          nickname &&
          nicknameReq.trim().toLowerCase() === nickname.trim().toLowerCase()
        ) {
          syncCampaignData(param, ctoken, sendResponse);
          break;
        } else {
          sendResponse({
            success: false,
            message: "AI操盘手和阿里国际站登录账号不一样",
          });
          break;
        }
      }
      case UPDATE_CAMPAIGN_DATA: {
        console.log(request);
        let nicknameReq = request.nickname;
        if (
          nicknameReq &&
          nickname &&
          nicknameReq.trim().toLowerCase() === nickname.trim().toLowerCase()
        ) {
          updateCampaignData(param, sendResponse);
          break;
        } else {
          sendResponse({
            success: false,
            message: "AI操盘手和阿里国际站登录账号不一样",
          });
          break;
        }
      }
      case SYNC_CAMPAIGN_PRODUCT_DATA: {
        let nicknameReq = request.nickname;
        if (
          nicknameReq &&
          nickname &&
          nicknameReq.trim().toLowerCase() === nickname.trim().toLowerCase()
        ) {
          syncCampaignProductData(param, ctoken, sendResponse);
          break;
        } else {
          sendResponse({
            success: false,
            message: "AI操盘手和阿里国际站登录账号不一样",
          });
          break;
        }
      }
      case SYNC_CAMPAIGN_KEYWORD_DATA: {
        let nicknameReq = request.nickname;
        if (
          nicknameReq &&
          nickname &&
          nicknameReq.trim().toLowerCase() === nickname.trim().toLowerCase()
        ) {
          syncCampaignKeywordData(param, ctoken, sendResponse);
          break;
        } else {
          sendResponse({
            success: false,
            message: "AI操盘手和阿里国际站登录账号不一样",
          });
          break;
        }
      }
      // case GET_VERSION:{
      //   getVersion(sendResponse, pluginVersionPort);
      //   break;
      // }
      case SYNC_RANK: {
        // let nicknameReq = request.nickname;
        // if (nicknameReq && nickname && nicknameReq.trim().toLowerCase() === nickname.trim().toLowerCase()) {
        //   syncRank(param, href, extensions, sendResponse);
        //   break;
        // } else {
        //   sendResponse({ success: false, message: "AI操盘手和阿里国际站登录账号不一样" });
        //   break
        // }
        syncRank(param, href, extensions, sendResponse);
        break;
      }
      case SYNC_RANK_NEW: {
        // let nicknameReq = request.nickname;
        // if (nicknameReq && nickname && nicknameReq.trim().toLowerCase() === nickname.trim().toLowerCase()) {
        //   syncRankNew(param, href, ctoken, sendResponse);
        //   break;
        // } else {
        //   sendResponse({ success: false, message: "AI操盘手和阿里国际站登录账号不一样" });
        //   break
        // }
        syncRankNew(param, href, ctoken, sendResponse);
        break;
      }
      case SYNC_RANK_ONE: {
        syncRankOne(param, href, ctoken, sendResponse);
        break;
      }
      case QUERY_CATEGORY: {
        queryCatogery(param, ctoken, sendResponse);
        break;
      }
      case UPLOAD_VIDEO_TO_VIDEO_BANK: {
        uploadVideoToVideoBank(param, ctoken, sendResponse);
        break;
      }
      // deprecated
      case QUERY_PEER_KEYWORD: {
        queryPeerKeyword(param, href, sendResponse);
        break;
      }
      case GATHER_PRODUCT: {
        gatherProduct(param, sendResponse, ctoken);
        break;
      }
      case GATHER_PRODUCT_NEW: {
        gatherProductNew(param, sendResponse, ctoken);
        break;
      }
      case GATHER_CATEGORY_URLS: {
        gatherCategoryUrls(param, sendResponse);
        break;
      }
      // 同行重点产品分析
      case Same_Industry_Key_Analyse_Service: {
        sameIndustryKeyAnalyseService(param, sendResponse);
        break;
      }
      case QUERY_GROUP: {
        queryGroup(param, sendResponse);
        break;
      }
      case QUERY_KEYWORD_BY_GROUPS: {
        queryKeywordByGroups(param, href, sendResponse);
        break;
      }
      // 报告基础诊断信息
      case DATA_REPORT: {
        getConclusionReport(param, ctoken, nickname, sendResponse);
        break;
      }
      // 报告详细诊断
      case DATA_REPORT_DETAIL: {
        getDataReportDetail(param, sendResponse, ctoken, nickname, href);
        break;
      }
      case SHOP_DATA: {
        if (checkUsername(request.nickname, nickname)) {
          getShopData(param, ctoken, nickname, sendResponse);
          break;
        } else {
          sendResponse({
            success: false,
            message: "当前账号和阿里国际站登录账号不一样",
          });
          break;
        }
      }
      // 产品分析-零效果产品，全部
      case NOEFFECT_PRODUCT: {
        if (checkUsername(request.nickname, nickname)) {
          noEffectProduct(ctoken, sendResponse, param);
          break;
        } else {
          sendResponse({
            success: false,
            message: "AI操盘手和阿里国际站登录账号不一样",
          });
          break;
        }
      }
      // 产品诊断优化-零效果下架产品，全部
      case NO_EFFECT_UNDER_PRODUCT: {
        if (checkUsername(request.nickname, nickname)) {
          noEffectUnderProduct(ctoken, sendResponse);
          break;
        } else {
          sendResponse({
            success: false,
            message: "AI操盘手和阿里国际站登录账号不一样",
          });
          break;
        }
      }
      case CHECK_PRODUCT_SCORE: {
        checkProductScore(param, sendResponse);
        break;
      }
      // case REFRESH_SHOWCASE: {
      //   if(checkUsername(request.nickname, nickname)){
      //     refreshShowcase(ctoken, sendResponse);
      //     break;
      //   } else {
      //     sendResponse({ success: false, message: "AI操盘手和阿里国际站登录账号不一样" });
      //     break;
      //   }
      // }
      // case REFRESH_SHOWCASE_TOP: {
      //   if(checkUsername(request.nickname, nickname)){
      //     refreshShowcaseTop(ctoken, sendResponse);
      //     break;
      //   } else {
      //     sendResponse({success: false, message: "AI操盘手和阿里国际站登录账号不一样"});
      //     break;
      //   }
      // }
      case GATHER_HOT_SEARCH_WORD: {
        gatherHotSearchWord(ctoken, param, sendResponse);
        break;
      }
      case "inquiry":
        chrome.cookies.getAll(
          {
            domain: ".alibaba.com",
            name: "_m_h5_tk",
          },
          async function (cookies2) {
            if (cookies2[0] && cookies2[0].value) {
              let token = cookies2[0].value.split("_")[0];
              let inquiry = await inquiryService.getInquiry(
                request.productId,
                token
              );
              sendResponse(inquiry);
            }
          }
        );
        break;
      case IMAGE_SHIELD_CHECK: {
        checkImageShield(param, ctoken, sendResponse);
        break;
      }
      case UPLOAD_PRODUCT_VIDEO: {
        if (checkUsername(request.nickname, nickname)) {
          productVideo(param, ctoken, sendResponse);
          break;
        } else {
          sendResponse({
            success: false,
            message: "AI操盘手和阿里国际站登录账号不一样",
          });
          break;
        }
      }
      case PRODUCT_DETAIL_TEMPLATE: {
        productDetailTemplate(param, sendResponse);
        break;
      }
      case KEYWORDS_GROUP: {
        if (checkUsername(request.nickname, nickname)) {
          keywordsGroup(ctoken, sendResponse);
          break;
        } else {
          sendResponse({
            success: false,
            message: "AI操盘手和阿里国际站登录账号不一样",
          });
          break;
        }
      }
      case ADD_MY_KEYWORD_LIBRARY: {
        if (checkUsername(request.nickname, nickname)) {
          addMyKeywordLibrary(param, ctoken, sendResponse);
          break;
        } else {
          sendResponse({
            success: false,
            message: "AI操盘手和阿里国际站登录账号不一样",
          });
          break;
        }
      }
      // @deprecated 使用 SMART_DETAIL_PRODUCT_ID
      case ZERO_EFFECT_PRODUCT_ID: {
        if (checkUsername(request.nickname, nickname)) {
          zeroEffectProductId(ctoken, sendResponse);
          break;
        } else {
          sendResponse({
            success: false,
            message: "AI操盘手和阿里国际站登录账号不一样",
          });
          break;
        }
      }
      // 获取智能编辑的产品id
      case SMART_DETAIL_PRODUCT_ID: {
        if (checkUsername(request.nickname, nickname)) {
          const res = await productService.smartDetailProductId(ctoken);
          sendResponse({ success: true, data: res });
          break;
        } else {
          sendResponse({
            success: false,
            message: "AI操盘手和阿里国际站登录账号不一样",
          });
          break;
        }
      }
      case LOGIN_CHECK: {
        console.log(request.nickName, nickname);
        if (checkUsername(request.nickName, nickname)) {
          sendResponse({ success: true, message: "已登录" });
          break;
        } else {
          sendResponse({
            success: false,
            message: "AI操盘手和阿里国际站登录账号不一样",
          });
          break;
        }
        // break;
      }
      case SEARCH_PRODUCT_BY_IMAGE: {
        searchProductByImage(param, sendResponse);
        break;
      }
      case SEARCH_PRODUCT_BY_1688_IMAGE: {
        searchProductBy1688Image(param, sendResponse);
        break;
      }
      case UPLOAD_URL_TO_ALI: {
        uploadUrlToAli(param, sendResponse);
        break;
      }
      case AMAZON_PRODUCT_CATEGORY: {
        amazonProductCategory(sendResponse);
        break;
      }
      // 产品诊断优化-零效果下架产品
      case OFF_SHELF_INVALID_PRODUCTS: {
        if (!checkUsername(request.nickname, nickname)) {
          sendResponse({
            success: false,
            message: "AI操盘手和阿里国际站登录账号不一样",
          });
          break;
        }
        const { page } = param;
        productService
          .offShelfInvalidProductListAjax(ctoken, page)
          .then((res) => {
            sendResponse({ success: true, data: res });
          })
          .catch(() => {
            sendResponse({
              success: false,
              message: "获取产品诊断分析-零效果下架产品异常",
            });
          });
        break;
      }
      // 删除产品诊断分析-零效果下架产品
      case DELETE_OFF_SHELF_INVALID_PRODUCTS: {
        if (!checkUsername(request.nickname, nickname)) {
          sendResponse({
            success: false,
            message: "AI操盘手和阿里国际站登录账号不一样",
          });
          break;
        }
        const { productIds } = param;
        productService
          .deleteOffShelfInvalidProductByIds(productIds, ctoken)
          .then((res) => {
            const { errMessage, errorCodeMap } = res;
            if (errMessage) {
              throw new Error(errMessage);
            }
            if (!_.isEmpty(errorCodeMap)) {
              throw new Error(_.uniq(Object.values(errorCodeMap)).join(", "));
            }
            sendResponse({ success: true });
          })
          .catch((e) => {
            sendResponse({
              success: false,
              message: "执行删除零效果下架产品异常: " + e.message,
            });
          });
        break;
      }
      // 产品分析-零效果产品-列表数据
      case INEFFECTIVE_PRODUCTS: {
        if (!checkUsername(request.nickname, nickname)) {
          sendResponse({
            success: false,
            message: "AI操盘手和阿里国际站登录账号不一样",
          });
          break;
        }
        const { page, time } = param;
        mydataService
          .getIneffectiveProductsPromise(ctoken, page, time)
          .then((res) => {
            sendResponse({ success: true, data: res });
          })
          .catch(() => {
            sendResponse({
              success: false,
              message: "获取产品分析-零效果产品异常",
            });
          });
        break;
      }
      // 产品分析-零效果产品-删除操作
      case DELETE_INEFFECTIVE_PRODUCTS: {
        if (!checkUsername(request.nickname, nickname)) {
          sendResponse({
            success: false,
            message: "AI操盘手和阿里国际站登录账号不一样",
          });
          break;
        }
        const { productIds } = param;
        productService
          .deleteIneffectiveProductByIds(productIds, ctoken)
          .then((res) => {
            const { errMessage, errorCodeMap } = res;
            if (errMessage) {
              throw new Error(errMessage);
            }
            if (!_.isEmpty(errorCodeMap)) {
              throw new Error(_.uniq(Object.values(errorCodeMap)).join(", "));
            }
            sendResponse({ success: true });
          })
          .catch((e) => {
            sendResponse({
              success: false,
              message: "执行删除产品异常: " + e.message,
            });
          });

        break;
      }
      // 产品分析-零效果产品-下架操作
      case OFFLINE_INEFFECTIVE_PRODUCTS: {
        if (!checkUsername(request.nickname, nickname)) {
          sendResponse({
            success: false,
            message: "AI操盘手和阿里国际站登录账号不一样",
          });
          break;
        }
        const { productIds } = param;
        productService
          .offlineIneffectiveProductByIds(productIds, ctoken)
          .then(() => {
            sendResponse({ success: true });
          })
          .catch(() => {
            sendResponse({ success: false, message: "执行下架产品异常" });
          });
        break;
      }
      default: {
        sendResponse({ success: false, message: "插件版本过低，请升级到新版" });
      }
    }
  }
  // 不要求国际站登录
  else {
    let href = request.href;
    let type = request.type;
    let param = request.query;
    // deprecated
    if (type === QUERY_PEER_KEYWORD) {
      queryPeerKeyword(param, href, sendResponse);
    } else if (type === QUERY_GROUP) {
      queryGroup(param, sendResponse);
    } else if (type === CHECK_PRODUCT_SHOP) {
      checkProductShop(param, sendResponse);
    } else if (type === QUERY_KEYWORD_BY_GROUPS) {
      queryKeywordByGroups(param, href, sendResponse);
    } else if (type === GATHER_PRODUCT) {
      gatherProduct(param, sendResponse);
    } else if (type === GATHER_PRODUCT_NEW) {
      gatherProductNew(param, sendResponse);
    } else if (type === GATHER_CATEGORY_URLS) {
      gatherCategoryUrls(param, sendResponse);
    } else if (type === Same_Industry_Key_Analyse_Service) {
      sameIndustryKeyAnalyseService(param, sendResponse);
      // }else if( type === GET_VERSION){
      //   getVersion(sendResponse, pluginVersionPort)
    } else if (type === SEARCH_PRODUCT_BY_IMAGE) {
      searchProductByImage(param, sendResponse);
    } else if (type === SEARCH_PRODUCT_BY_1688_IMAGE) {
      searchProductBy1688Image(param, sendResponse);
    } else if (type === DATA_REPORT_DETAIL) {
      const {
        sameIndustryAnalyse,
        popularProductHighInquiry,
        popularProductHotSelling,
        sameIndustryService,
        highInquiryProducts,
        highInquiryProductList,
      } = param;
      if (
        sameIndustryAnalyse ||
        popularProductHighInquiry ||
        popularProductHotSelling ||
        sameIndustryService ||
        highInquiryProducts ||
        highInquiryProductList
      ) {
        getDataReportDetail(param, sendResponse, href);
      } else {
        sendResponse({ success: false, message: "请先登录阿里国际站" });
      }
    } else if (type === PRODUCT_DETAIL_TEMPLATE) {
      productDetailTemplate(param, sendResponse);
    } else if (type === AMAZON_PRODUCT_CATEGORY) {
      amazonProductCategory(sendResponse);
    } else if (type === CHECK_PRODUCT_SCORE) {
      checkProductScore(param, sendResponse);
    } else {
      sendResponse({ success: false, message: "请先登录阿里国际站" });
    }
  }
}

// 获取 ctoken 和 nickname 的函数
async function getTokenAndNickname() {
  return new Promise((resovle) => {
    chrome.cookies.getAll(
      {
        domain: ".alibaba.com",
        name: "xman_us_t",
      },
      (cookies) => {
        let ctoken, nickname;

        const cookie = cookies.find((cookie) => cookie.name === "xman_us_t");
        if (cookie) {
          const kvPairs = cookie.value.split("&");
          ctoken = kvPairs
            .find((pair) => pair.startsWith("ctoken="))
            ?.split("=")[1];
          nickname = kvPairs
            .find((pair) => pair.startsWith("x_lid="))
            ?.split("=")[1];
        }

        resovle({ ctoken, nickname });
      }
    );
  });
}

async function messageCallbackWithCtoken(request, sender, sendResponse) {
  const { ctoken, nickname } = await getTokenAndNickname();

  dealMessageWithCtoken(ctoken, nickname, request, sender, sendResponse);
}

async function prepareDeal() {
  let url = "https://hzmy.alibaba.com/user/account_settings.htm";
  return Axios({
    method: "get",
    url,
  })
    .then((res) => {
      let parser = new DOMParser();
      let parsedHtml = parser.parseFromString(res, "text/html");
      return parsedHtml.querySelector(".head-picture");
    })
    .catch((err) => {
      console.log(`prepare出错：${err}`);
      return false;
    });
}
async function getDataReportDetail(
  param,
  sendResponse,
  ctoken,
  nickname,
  href
) {
  let res = await reportDetailService.getReportDetail(
    param,
    ctoken,
    nickname,
    progressPort,
    href
  );
  sendResponse(res);
}
async function getConclusionReport(param, ctoken, nickname, sendResponse) {
  let res = await reportService.getConclusionReport(
    param,
    ctoken,
    nickname,
    progressPort
  );
  sendResponse(res);
}
async function getShopData(param, ctoken, nickname, sendResponse) {
  let res = await shopDataService.getShopData(
    param,
    ctoken,
    nickname,
    weeklyDataPort
  );
  sendResponse(res);
}
async function queryGroup(param, sendResponse) {
  let res = await keywordService.queryGroup(param);
  sendResponse(res);
}
async function queryKeywordByGroups(param, href, sendResponse) {
  let res = await keywordService.queryKeywordByGroups(param, href, keywordPort);
  sendResponse(res);
}
// 20230330 前端基本上没有调用这个接口，准备废弃
async function queryPeerKeyword(param, href, sendResponse) {
  let res = await keywordService.queryPeerKeyword(param, href);
  sendResponse(res);
}
async function queryCatogery(param, ctoken, sendResponse) {
  let res = await keywordService.queryCategoryByKeyword(param, ctoken);
  sendResponse(res);
}

async function uploadVideoToVideoBank(param, ctoken, sendResponse) {
  let res = await uploadVideoService.uploadVideoToVideoBank(param, ctoken);
  sendResponse(res);
}

async function syncCatogery(param, ctoken, href, sendResponse) {
  let res = await keywordService.getCategoryByKeyword(param, ctoken, href);
  sendResponse(res);
}
async function syncCatogerySpare(param, ctoken, href, sendResponse) {
  let res = await keywordService.getCategoryByKeyword(param, ctoken, href);
  sendResponse(res);
}
async function checkProductShop(param, sendResponse) {
  let res = await gatherProductService.checkProductShop(param);
  sendResponse({ success: true, data: res });
}
async function syncRank(param, href, extensions, sendResponse) {
  let res = await keywordService.getRankByKeyword(param, href, extensions);
  sendResponse(res);
}
async function syncRankNew(param, href, ctoken, sendResponse) {
  let res = await keywordService.getRankByKeywordNew(param, href, ctoken);
  sendResponse(res);
}

async function syncRankOne(param, href, ctoken, sendResponse) {
  let res = await keywordService.getRankInfo(param, href, ctoken);
  sendResponse(res);
}

async function noEffectProduct(ctoken, sendResponse, param) {
  let res = await mydataService.getCustomNoEffectProductList(ctoken, param);
  sendResponse({ success: true, data: res });
}
async function noEffectUnderProduct(ctoken, sendResponse) {
  let res = await mydataService.getNoEffectUnderProductList(ctoken);
  sendResponse({ success: true, data: res });
}
//同行重点产品分析
async function sameIndustryKeyAnalyseService(param, sendResponse) {
  sameIndustryAnalyseService.init(sendResponse);
  let { urlArray } = param;
  await sameIndustryAnalyseService.sameIndustryService(urlArray).then((res) => {
    console.log(res);
    let result = { success: true, message: "", data: res };
    sendResponse(result);
  });
}

async function gatherProduct(param, sendResponse, ctoken) {
  let { activeTab, categoryUrl, urlArray } = param;
  if (urlArray) {
    urlArray = urlArray.map((url) => {
      if (url.includes("?")) {
        url = url.slice(0, url.indexOf("?"));
      }
      return url;
    });
  }
  if (activeTab === "productTab") {
    gatherProductService
      .gatherProductFromUrlList(urlArray, ctoken)
      .then((res) => {
        console.log(res);
        let result = {
          success: true,
          message: "",
          data: res.result,
          failUrls: res.failUrls,
        };
        sendResponse(result);
      })
      .catch((err) => {
        sendResponse({ success: false, message: err });
      });
  }
  if (activeTab === "categoryTab") {
    gatherProductService
      .gatherProductFromCategoryUrl(categoryUrl, ctoken)
      .then((res) => {
        console.log(res);
        let result = {
          success: true,
          message: "",
          data: res.result,
          failUrls: res.failUrls,
        };
        sendResponse(result);
      })
      .catch((err) => {
        sendResponse({ success: false, message: err });
      });
  }
}

async function gatherProductNew(param, sendResponse, ctoken) {
  let { productUrl } = param;
  if (productUrl.includes("?")) {
    productUrl = productUrl.slice(0, productUrl.indexOf("?"));
  }
  const result = await gatherProductService.newGatherProductFormUrl(
    productUrl,
    ctoken
  );
  const { data, failUrl } = result;
  sendResponse({
    data,
    failUrl,
    success: true,
  });
}

async function gatherCategoryUrls(param, sendResponse) {
  const result = await gatherProductService.getProductUrlsFromCat(
    param.categoryUrl
  );
  sendResponse({ success: true, data: result });
}

function gatherHotSearchWord(ctoken, param, sendResponse) {
  console.log(param);
  keywordService.gatherHotSearchWord(ctoken, param, sendResponse);
}

function getCookie(sendResponse) {
  chrome.cookies.getAll(
    {
      domain: ".alibaba.com",
    },
    function (cookies) {
      console.log(cookies);
      let result = "";
      for (let cookieObj of cookies) {
        if (cookieObj.domain === ".alibaba.com") {
          let { name, value } = cookieObj;
          result = result + `${name}=${value};`;
        }
      }
      sendResponse({ success: true, value: result });
    }
  );
}

function getVersion(sendResponse, pluginVersionPort) {
  if (!pluginVersionPort) {
    sendResponse({ success: false });
  }
  let manifestData = chrome.runtime.getManifest();
  sendResponse({ success: true, value: manifestData.version });
}

function checkImageShield(param, ctoken, sendResponse) {
  gatherProductService.getImageShieldInfo(param.url, ctoken).then((res) => {
    // console.log(res);
    sendResponse({ success: true, value: res });
  });
}
async function productVideo(param, ctoken, sendResponse) {
  const res = await gatherProductService.postProductVideo(param, ctoken);
  sendResponse({ success: true, data: res });
}

async function productDetailTemplate(param, sendResponse) {
  const res = await gatherProductService.getProductDetailTemplate(param);
  sendResponse({ success: true, data: res });
}

async function keywordsGroup(ctoken, sendResponse) {
  const res = await keywordService.getKeywordsGroup(ctoken);
  sendResponse({ success: true, data: res });
}

async function addMyKeywordLibrary(param, ctoken, sendResponse) {
  const res = await keywordService.postMyKeywordLibrary(param, ctoken);
  sendResponse({ success: true, data: res });
}

async function zeroEffectProductId(ctoken, sendResponse) {
  const res = await mydataService.getZeroEffectProductId(ctoken);
  sendResponse({ success: true, data: res });
}
