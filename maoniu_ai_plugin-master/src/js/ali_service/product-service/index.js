// import * as Const from "const"
import { Axios } from "@/js/common";
import {
  URL_ASYNC_QUERY_PRODUCT_LIST,
  URL_HZ_MYDATA,
  URL_OFF_SHELF_INVALID_PRODUCT,
} from "@/js/const/ali-const";
import { FORM_URLENCODED } from "@/js/const/http-headers";
import commonService from "@/js/service/commonService";
import qs from "qs";
import { getNested, isJson, isObject } from "../../util";
import inquiryService from "../inquiry_service";
import productDetailService from "@/js/service/product-detail-service";

function getTradeableSourcingProductParams(
  ctoken,
  _csrf_token_,
  page = 1,
  size = 10
) {
  return {
    statisticsType: "month",
    repositoryType: "all",
    imageType: "all",
    showPowerScore: "",
    tradeType: "tradeableSourcing",
    uiAdvanceSearch: true,
    showType: "onlyMarket",
    status: "all",
    page,
    size,
    ctoken,
    _csrf_token_,
    lang: "en_US",
  };
}

async function getTradeableSourcingProductPage(
  ctoken,
  _csrf_token_,
  page = 1,
  size = 50
) {
  const url = URL_ASYNC_QUERY_PRODUCT_LIST;
  const params = getTradeableSourcingProductParams(
    ctoken,
    _csrf_token_,
    page,
    size
  );
  return Axios({
    url,
    method: "get",
    params,
  })
    .then((res) => {
      const { count, products } = res;
      if (count && products?.length) {
        return {
          count,
          products,
        };
      }
      return {
        pages: 0,
        products: [],
      };
    })
    .catch((err) => {
      console.error(`getTradeableSourcingProductPages: ${err}`);
    });
}

function getSmartDetailProductIdParams(ctoken, _csrf_token_, page) {
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
async function getSmartDetailProductIdPages(ctoken, _csrf_token_, i = 1) {
  const url = URL_ASYNC_QUERY_PRODUCT_LIST;
  const params = getSmartDetailProductIdParams(ctoken, _csrf_token_, i);
  return Axios({
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
const headers = (form) => {
  return { "content-type": `multipart/form-data; boundary=${form._boundary}` };
};

export default {
  /**
   * Retrieves all tradeable sourcing products.
   *
   * @param {string} ctoken - The ctoken used for authentication.
   * @return {Promise<Array>} A promise that resolves to an array of tradeable sourcing products.
   */
  async getAllTradeableSourcingProducts(ctoken) {
    const csrf_token = await commonService.getCsrfToken();

    const result = [];
    let page = 1;
    let size = 50;
    const { count, products } = await getTradeableSourcingProductPage(
      ctoken,
      csrf_token,
      page,
      size
    );
    result.push(...products);
    while (page++ * size < count) {
      const { products } = await getTradeableSourcingProductPage(
        ctoken,
        csrf_token,
        page,
        size
      );
      result.push(...products);
    }
    return result;
  },
  // 实力优品产品列表
  highQualityProductList(ctoken, csrfToken) {
    return Axios({
      method: "get",
      url: URL_ASYNC_QUERY_PRODUCT_LIST,
      params: {
        statisticsType: "month",
        repositoryType: "all",
        imageType: "all",
        showPowerScore: "",
        uiAdvanceSearch: true,
        powerScoreLayer: "HIGH_QUALITY",
        showType: "onlyMarket",
        status: "all",
        page: 1,
        size: 10,
        ctoken: ctoken,
        _csrf_token_: csrfToken,
        lang: "en_US",
      },
    }).then((res) => {
      return res;
    });
  },
  /**
   * 爆品产品列表
   * @param {*} ctoken
   * @param {*} csrfToken
   * @returns
   */
  superHighQualityProductList(ctoken, csrfToken) {
    return Axios({
      method: "get",
      url: URL_ASYNC_QUERY_PRODUCT_LIST,
      params: {
        statisticsType: "month",
        repositoryType: "all",
        imageType: "all",
        showPowerScore: "",
        uiAdvanceSearch: true,
        powerScoreLayer: "SUPER",
        showType: "onlyMarket",
        status: "all",
        page: 1,
        size: 10,
        ctoken: ctoken,
        _csrf_token_: csrfToken,
        lang: "en_US",
      },
    }).then((res) => {
      return res;
    });
  },
  // 检测产品详情中图片是否合法
  ajaxValidateDescriptionImage(ctoken, content) {
    const form = new FormData();
    form.append("origHtml", content);
    return Axios({
      url: "https://post.alibaba.com/posting-proxy/product/ajaxValidateDescriptionImage.htm",
      method: "post",
      params: { ctoken },
      data: form,
      headers: headers(form),
    });
  },
  // 产品详情页
  getProductDetail(url) {
    if (url.startsWith("//")) {
      url = "https:" + url;
    }
    return Axios({
      url,
      method: "get",
    }).then(async (res) => {
      if (isObject(res)) {
        throw new Error(res?.ret?.[1]);
      }
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
        Object.assign(result, resultStrData);
      }
      const keywords = productDetailService.getKeywords(res);
      if (keywords) {
        Object.assign(result, { keywords });
      }
      return result;
    });
  },
  // 产品详情页上的Transactions
  getProductDetailTransactions(productId) {
    // https://www.alibaba.com/event/app/productExportOrderQuery/transactionOverview.htm?detailId=60812480728&languageType=en
    return Axios({
      url: `https://www.alibaba.com/event/app/productExportOrderQuery/transactionOverview.htm?detailId=${productId}&languageType=en`,
    }).then((res) => {
      if (res.success) {
        return res.data;
      }
    });
  },
  // 产品详情页上的 Buyer Reviews
  getProductDetailReviews(token, companyId, productId) {
    const data = JSON.stringify({
      currentPage: 1,
      clusterId: "0",
      language: "en_US",
      companyId,
      productId,
    });
    const appKey = 24889839;
    const t = new Date().getTime();
    const sign = inquiryService.sign(
      token + "&" + t + "&" + appKey + "&" + data
    );

    return Axios({
      url: "https://acs.m.alibaba.com/h5/mtop.alibaba.icbu.review.complete.productreview/1.0/",
      params: {
        jsv: "2.7.0",
        appKey,
        t,
        sign,
        api: "mtop.alibaba.icbu.review.complete.productreview",
        v: "1.0",
        H5Request: true,
        type: "json",
        dataType: "json",
        data,
      },
    });
  },
  // 店铺产品列表页上的 moduleData
  getProductListPageData(url) {
    return Axios({
      method: "get",
      url,
    })
      .then((res) => {
        // console.log(res);
        if (isObject(res)) {
          throw new Error(res?.ret?.[1]);
        }
        let parser = new DOMParser();
        let htmlParser = parser.parseFromString(res, "text/html");
        let divArr = htmlParser.querySelectorAll(".grid > div[module-id]");
        if (divArr) {
          const data = {};
          for (let i = 0; i < divArr.length; i++) {
            let module_title = divArr[i].getAttribute("module-title");
            let dataStr = divArr[i].getAttribute("module-data");
            data[module_title] = JSON.parse(decodeURIComponent(dataStr));
          }
          return data;
        }
      })
      .catch((err) => {
        console.log("获取店铺产品列表页面错误:" + err);
        throw err;
      });
  },
  // 产品诊断优化-零效果下架产品
  async offShelfInvalidProductListAjax(ctoken, page = 1) {
    const url = URL_OFF_SHELF_INVALID_PRODUCT;
    const params = {
      ctoken,
      dmtrack_pageid: "",
      orderType: "gmtCreate",
      pageSize: 10,
      pageNo: page,
      principalId: "all",
      offShelfType: "",
    };
    return Axios({
      method: "get",
      url,
      params,
    })
      .then((res) => {
        return res;
      })
      .catch((err) => {
        console.log(
          `产品诊断优化-零效果下架产品-offShelfInvalidProductListAjax 出错: ${err.message}`
        );
      });
  },

  // 获取智能编辑的产品id
  async smartDetailProductId(ctoken) {
    const _csrf_token_ = await commonService.getXsrfToken();
    const { pages } = await getSmartDetailProductIdPages(ctoken, _csrf_token_);
    if (pages) {
      const total = pages % 10 === 0 ? pages / 10 : pages / 10 + 1;
      const products = [];
      for (let i = 1; i < total; i++) {
        const result = await getSmartDetailProductIdPages(
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

  /**
   * Deletes a product by its ID. 删除产品
   *
   * @param {array} productIds - An array of product IDs to be deleted. 加密id
   * @param {string} ctoken - The ctoken for authentication.
   * @return {Promise} A Promise that resolves with the result of the delete operation.
   */
  async deleteIneffectiveProductByIds(productIds, ctoken) {
    return Axios({
      url: URL_HZ_MYDATA,
      method: "post",
      header: FORM_URLENCODED,
      params: {
        action: "ProductsDeleteAction",
        isVip: true,
        ctoken,
      },
      data: qs.stringify(
        {
          productID: [...productIds],
        },
        { indices: false, arrayFormat: "brackets" }
      ),
    });
  },

  /**
   * Sends a request to take a list of products offline. 下架产品
   *
   * @param {Array} productIds - An array of product IDs to take offline.
   * @param {string} ctoken - A token for authenticating the request.
   * @return {Promise} A promise that resolves with the Axios response object.
   */
  async offlineIneffectiveProductByIds(productIds, ctoken) {
    return Axios({
      url: URL_HZ_MYDATA,
      method: "post",
      header: FORM_URLENCODED,
      params: {
        action: "ProductDisplayAction",
        isVip: true,
        event_submit_doTakeOffline: "true",
        ctoken,
      },
      data: qs.stringify({
        productIds: JSON.stringify(productIds),
      }),
    });
  },

  async deleteOffShelfInvalidProductByIds(productIds, ctoken) {
    return Axios({
      url: "https://searchstaff.alibaba.com/diagnosis/order/offShelfInvalidProductDeleteAjax.do",
      method: "post",
      header: FORM_URLENCODED,
      params: {
        ctoken,
        productIds: productIds.join(","),
        deleteType: "trash",
        _: new Date().getTime(),
      },
    });
  },
};
