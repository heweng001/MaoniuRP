import {
  getNested,
  isArray,
  isArrayLength,
  isJson,
  isJson5,
} from "@/js/util/index";
import JSON5 from "json5";
import qs from "qs";
import sleep from "@/js/util/sleep";
import { Axios } from "@/js/common";
import axios from "axios";
import moment from "moment";
import { getToken } from "@/js/service/search-product";
import md5 from "js-md5";
import aliClassConvert from "../../aliClassConvert";
import { isObject } from "@/js/util";
import cookieService from "../cookie-service";
import inquiryService from "@/js/ali_service/inquiry_service";
import uploadImageService from "@/js/service/upload-image";
import uuid from "uuid"

let sendResponse;
// let xsrfToken;
let csrfToken;

function parseScriptTag(scriptArrayElement) {
  let styleStr = scriptArrayElement.innerText;
  let result = [];
  for (const eachStyle of styleStr.split("#detail_decorate_root")) {
    let item = {};
    item.key =
      "#detail_decorate_root" + eachStyle.substring(0, eachStyle.indexOf("{"));
    item.value = eachStyle.substring(
      eachStyle.indexOf("{") + 1,
      eachStyle.indexOf("}")
    );
    // console.log(item);
    if (item.key && item.value) {
      result.push(item);
    }
  }
  return result;
}

function dealWithMagicTemplateStyle(descriptionNode) {
  let scriptArray = descriptionNode.getElementsByTagName("style");
  for (const scriptArrayElement of scriptArray) {
    let selectorValueArray = parseScriptTag(scriptArrayElement);
    selectorValueArray.forEach(({ key, value }) => {
      descriptionNode.querySelectorAll(key).forEach((node) => {
        let oldValue = node.getAttribute("style");
        if (oldValue) {
          value = oldValue + value;
        }
        node.setAttribute("style", value);
      });
    });
  }
  aliClassConvert.convert(descriptionNode);
  // 移除magic相关class
  for (let magicNode of descriptionNode.querySelectorAll("[class*='magic']")) {
    magicNode.setAttribute("class", "");
  }
}

function processDescription(descriptionNode) {
  for (const imgNode of descriptionNode.getElementsByTagName("img")) {
    if (imgNode) {
      imgNode.setAttribute("src", imgNode.getAttribute("data-src"));
    }
  }
  let noScriptArray = descriptionNode.getElementsByTagName("noscript");
  for (let index = noScriptArray.length - 1; index >= 0; index--) {
    noScriptArray[index].parentNode.removeChild(noScriptArray[index]);
  }
  // 去除视频
  let videoNode = descriptionNode.querySelector(".icbu-pc-detailVideoShow");
  if (videoNode) {
    videoNode.parentNode.removeChild(videoNode);
  }
  dealWithMagicTemplateStyle(descriptionNode);
  if (descriptionNode.body) {
    return descriptionNode.body.innerHTML;
  } else {
    return descriptionNode.innerHTML;
  }
}

function getProductDescription(document) {
  let descriptionNode = document.querySelector(".rich-text-description");
  return processDescription(descriptionNode);
}

function getProductImages(document, selector = "ul.inav") {
  let images = [];
  let imageNavNode = document.querySelector(selector);
  if (imageNavNode) {
    for (const imageNode of imageNavNode.getElementsByTagName("img")) {
      let url = imageNode.getAttribute("src");
      if (url.includes("_50x50")) {
        url = url.substring(0, url.lastIndexOf("_50x50"));
        images.push(url);
      }
    }
  }
  return images;
}

function getLogisticInfo(document) {
  let logisticInfo = {};
  let node = document.querySelector(".do-overview");
  console.log(node);
  // supply ability
  console.log(node.childNodes);

  let keyArray = [
    "Supply Ability",
    "Packaging Details",
    "Package Type",
    "Port",
    "Selling Units",
    "Single package size",
    "Single gross weight",
    "Package Type",
  ];
  let dlNodeArray = node.querySelectorAll("dl.do-entry-item");
  console.log(dlNodeArray);
  for (let child of dlNodeArray) {
    let childArray = Array.from(child.children);
    if (childArray.length === 2) {
      for (let key of keyArray) {
        if (
          childArray[0].innerText.trim() === key ||
          childArray[0].innerText.trim().includes(key)
        ) {
          console.log(childArray[1].innerText);
          logisticInfo[key] = childArray[1].innerText;
          break;
        }
      }
    }
  }
  console.log(logisticInfo);
  return logisticInfo;
}

function getProductDescriptionFromRequest(productId) {
  let url = "https://www.alibaba.com/event/app/mainAction/desc.htm";
  let params = {
    detailId: productId,
    language: "",
  };
  return Axios({
    url,
    params,
  }).then((res) => {
    let data = res.data.productHtmlDescription;
    let new_html =
      "<div id='J-rich-text-description' class='richtext richtext-detail rich-text-description is-magic'>" +
      data +
      "</div>";
    let domParser = new DOMParser();
    let document = domParser.parseFromString(new_html, "text/html");
    return processDescription(document);
  });
}

function getImagesFromAttributeJson(attributeJson) {
  let result = [];
  let mediaItems = getNested(attributeJson, "mediaItems");
  mediaItems.forEach((item) => {
    if (item.type === "image") {
      result.push(getNested(item, "imageUrl", "big"));
    }
  });
  return result;
}

function getXsrfToken() {
  let promise = new Promise((resolve) => {
    chrome.cookies.getAll(
      {
        domain: "post.alibaba.com",
        name: "XSRF-TOKEN",
      },
      async function (res) {
        if (res[0] && res[0].value) {
          // xsrfToken = res[0].value;
          resolve(res[0].value);
        } else {
          resolve("");
        }
      }
    );
  });
  return promise;
}

async function getImageShieldInfo(url, ctoken, xsrfToken) {
  let params = {
    optType: "imageShieldCheckAsyncOpt",
    imageUrl: url,
    ctoken: ctoken,
    "X-XSRF-TOKEN": xsrfToken,
  };
  return Axios({
    url: "https://post.alibaba.com/product/asyncOpt.htm",
    method: "get",
    params,
  }).then((res) => {
    if (res?.data?.state !== "none") {
      console.log(`imageShieldCheckAsyncOpt url ${url}`, res);
    }
    return res;
  });
}

async function checkImageShieldInfo(images, ctoken) {
  let stealImage = false;
  let xsrfToken = await getXsrfToken();
  console.log("image shield check, xsrfToken is ", xsrfToken);
  console.log("image shield check, ctoken is ", ctoken);
  let promiseArray = [];
  if (ctoken && xsrfToken) {
    for (const url of images) {
      let promise = getImageShieldInfo(url, ctoken, xsrfToken).then((res) => {
        console.log(res);
        let state = getNested(res, "data", "state");
        if (state === "steal") {
          stealImage = true;
        }
      });
      promiseArray.push(promise);
    }
  }
  await Promise.all(promiseArray);
  return stealImage;
}

function wrapDescriptionWithMaxWidthDiv(description) {
  if (description) {
    return `<div style="max-width: 750px">${description}</div>`;
  }
  return description;
}

async function gatherProductFromDetailData(res, ctoken, url) {
  let jsonStr = res.substring(res.indexOfEnd("window.detailData = "));
  const removeNode = "window.detailData.scVersion";
  if (jsonStr.includes(removeNode)) {
    jsonStr =
      jsonStr.substring(0, jsonStr.indexOf('"js_ssr"}}}')) + '"js_ssr"}}}';
  } else {
    jsonStr = jsonStr.substring(
      0,
      jsonStr.indexOf(";\n                \n    </script>")
    );
  }
  const jsonData = JSON.parse(jsonStr);
  console.log(jsonData, "jsonData");
  console.log("gather product from detail data");
  let attributeJson = getNested(jsonData, "globalData", "product");
  console.log(attributeJson);
  let domParser = new DOMParser();
  let document = domParser.parseFromString(res, "text/html");
  // 关键词
  let keywordStr = res.substring(
    res.indexOfEnd('  <meta name="keywords" content="')
  );
  keywordStr = keywordStr.substring(
    0,
    keywordStr.indexOf(" Product on Alibaba.com")
  );
  // 标题
  let title = keywordStr.substring(0, keywordStr.indexOf("- Buy "));
  console.log(title);
  keywordStr = keywordStr.substring(keywordStr.indexOfEnd("- Buy "));
  let keywords = keywordStr.split(",");
  // 详情描述
  let description = await getProductDescriptionFromRequest(
    attributeJson.productId
  );
  description = wrapDescriptionWithMaxWidthDiv(description);
  // 主图视频
  const mediaItems = getNested(jsonData, "globalData", "product", "mediaItems");
  const videoObj = mediaItems.find((i) => i.videoUrl);
  let videoUrl = "";
  let videoCoverUrl = "";
  if (videoObj) {
    videoCoverUrl = videoObj.videoCoverUrl;
    videoUrl = getNested(videoObj, "videoUrl", "sd", "videoUrl");
    if (!videoUrl) {
      videoUrl = getNested(videoObj, "videoUrl", "ld", "videoUrl");
    }
    if (!videoUrl) {
      videoUrl = getNested(videoObj, "videoUrl", "hd", "videoUrl");
    }
  }
  // 详情视频
  let detailVideoUrl = "";
  let detailVideoCoverUrl = "";
  const detailVideo = getNested(jsonData, "globalData", "product", "video");
  if (detailVideo) {
    const { cover, videoId } = detailVideo;
    detailVideoCoverUrl = cover;
    detailVideoUrl = `https://cloud.video.alibaba.com/play/u/2153292369/p/1/e/6/t/1/d/hd/${videoId}.mp4`;
    console.log(`采集产品 ${url} 存在详情视频 ${detailVideoUrl}`);
  }

  // 图片
  let images = getProductImages(document, "div.pc-main-image > ul");
  if (images.length === 0) {
    images = getImagesFromAttributeJson(attributeJson);
  }
  let imageState;
  if (images.length !== 0) {
    console.log("get image shield info");
    imageState = await checkImageShieldInfo(images, ctoken);
  }
  // 物流信息
  let logisticNode = getNested(jsonData, "globalData", "trade");

  // 卖家
  const companyName = getNested(
    jsonData,
    "globalData",
    "seller",
    "companyName"
  );
  let result = {
    title: title,
    keywords: keywords,
    description: description,
    images,
    attribute: attributeJson,
    logisticNode: logisticNode,
    sourceUrl: url,
    type: "newStructure",
    stealImage: imageState,
    videoUrl,
    videoCoverUrl,
    detailVideoUrl,
    detailVideoCoverUrl,
    companyName,
  };
  console.log(result);
  return result;
}

function gatherProductFromPageSchema(jsonStr, res, url) {
  const jsonData = JSON.parse(jsonStr);
  console.log("gather product from page schema");
  let attributeJson = getNested(
    jsonData,
    "children",
    "1",
    "children",
    "1",
    "children",
    "0",
    "attributes"
  );
  console.log(attributeJson);
  let domParser = new DOMParser();
  let document = domParser.parseFromString(res, "text/html");
  // 关键词
  let start = '"productEnKeywords":';
  let end = "}},{";
  let remain = res.substring(res.indexOfEnd(start));
  let objStr = remain.substring(0, remain.indexOf(end));
  let obj = JSON.parse(objStr);
  let keywords = obj.value.split(",");
  // 标题
  let node = document.querySelector(".ma-title");
  let title = node.firstChild.nodeValue;
  // 详情描述
  let description = getProductDescription(document);
  description = wrapDescriptionWithMaxWidthDiv(description);
  // 图片
  let images = getProductImages(document);
  // 物流信息
  let logisticInfo = getLogisticInfo(document);
  let result = {
    title: title,
    keywords: keywords,
    description: description,
    images,
    attribute: attributeJson,
    logisticInfo,
    sourceUrl: url,
  };
  console.log(result);
  return result;
}

function gatherAliProductFromUrl(url, ctoken) {
  return Axios({
    url,
    method: "get",
  })
    .then(async (res) => {
      if (isObject(res) && res?.ret) {
        throw new Error(`抓取产品链接${url}, 出现验证码`);
      }
      if (res.indexOf("#nocaptcha") > 0) {
        throw new Error(`抓取产品链接${url}, 出现验证码`);
      }
      // 详细属性
      let jsonStr = res.substring(
        res.indexOfEnd("window._PAGE_SCHEMA_ = "),
        res.indexOf(";\n" + "window._ASSETS_DOMAIN_")
      );
      if (!isJson(jsonStr)) {
        return gatherProductFromDetailData(res, ctoken, url);
      } else {
        return gatherProductFromPageSchema(jsonStr, res, url);
      }
    })
    .catch((e) => {
      console.error("gather-product gatherAliProductFromUrl, Error: ", e);
      throw e;
    });
}

function getProductUrlFromCat(categoryUrl) {
  const host = "https:";
  return Axios({
    url: categoryUrl,
  })
    .then((res) => {
      let domParser = new DOMParser();
      let document = domParser.parseFromString(res, "text/html");
      let productListPcElement = document.querySelector(
        'div[module-title="productListPc"]'
      );
      let attribute = productListPcElement.getAttribute("module-data");
      attribute = unescape(attribute);
      let moduleData = JSON.parse(attribute);
      let productList = getNested(
        moduleData,
        "mds",
        "moduleData",
        "data",
        "productList"
      );
      let productUrls = [];
      productList
        .map((item) => item.url)
        .forEach((url) => {
          productUrls.push(host + url);
        });
      console.log(productUrls);
      return productUrls;
    })
    .catch((e) => {
      console.error(`采集品-分组采集出错${e}`);
      return [];
    });
}

function get1688ProductImages(document) {
  let images = [];
  let imageNavNode = document.querySelector("ul.nav-tabs");
  for (const imageNode of imageNavNode.getElementsByTagName("img")) {
    let parentElement = imageNode.parentElement;
    if (parentElement && parentElement.getAttribute("class")) {
      if (parentElement.getAttribute("class").includes("video")) {
        continue;
      }
    }
    if (imageNode.getAttribute("data-lazy-src")) {
      let urlLazy = imageNode.getAttribute("data-lazy-src");
      urlLazy = urlLazy.replace(/[0-9]{2}x[0-9]{2}\./i, "");
      images.push(urlLazy);
    } else {
      let url = imageNode.getAttribute("src");
      url = url.replace(/[0-9]{2}x[0-9]{2}\./i, "");
      images.push(url);
    }
  }
  return images;
}

function get1688ProductOtherImages(document) {
  const otherImages = [];
  const otherImagesParentNodeOne = document.querySelector("ul.list-leading");
  if (otherImagesParentNodeOne) {
    const otherImagesNodeOne = otherImagesParentNodeOne.querySelectorAll("img");
    if (otherImagesNodeOne && otherImagesNodeOne.length > 0) {
      for (const img of otherImagesNodeOne) {
        let url = img.getAttribute("src");
        if (url && url.includes(".32x32")) {
          url = url.replace(".32x32", "");
          otherImages.push(url);
        }
      }
    }
  }
  const otherImagesParentNodeTwo = document.querySelector("table.table-sku");
  if (otherImagesParentNodeTwo) {
    const otherImagesNodeTwo =
      otherImagesParentNodeTwo.querySelectorAll("td.name");
    if (otherImagesNodeTwo && otherImagesNodeTwo.length > 0) {
      for (const node of otherImagesNodeTwo) {
        const img = node.querySelector("img");
        if (img) {
          let url = img.getAttribute("data-lazy-src");
          if (url && url.includes(".32x32")) {
            url = url.replace(".32x32", "");
            otherImages.push(url);
          }
        }
      }
    }
  }
  return [...new Set(otherImages)];
}

function getMainImages(images, otherImages) {
  return images.filter((i) => otherImages.every((s) => s !== i));
}

function get1688ProductDescription(document) {
  let descriptionNode = document.querySelector("div#desc-lazyload-container");
  let dataUrl = descriptionNode.getAttribute("data-tfs-url");
  return axios({
    url: dataUrl,
  })
    .then((res) => {
      let dataStr = res.data;
      let result = dataStr.substring(
        dataStr.indexOfEnd('var offer_details={"content":"'),
        dataStr.indexOf('"};')
      );
      result = result.replaceAll('\\"', '"');
      return result;
    })
    .catch((err) => {
      console.log(err);
      return "";
    });
}

function get1688ProductDetailDescription(document) {
  // // 详情属性
  let descriptionDetailNode = document.querySelector(
    "div#mod-detail-attributes"
  );
  if (!descriptionDetailNode) {
    return {};
  }
  let descriptionDetailData = JSON.parse(
    descriptionDetailNode.getAttribute("data-feature-json")
  );
  let descriptionDetailDataResult = "";
  if (descriptionDetailData) {
    descriptionDetailDataResult = descriptionDetailData.filter(function (item) {
      return (
        item.name === "颜色" ||
        item.name === "主面料成分的含量" ||
        item.name === "尺码" ||
        item.name === "货号" ||
        item.name === "主面料成分" ||
        item.name === "面料成分" ||
        item.name === "面料成分含量"
      );
    });
  }
  let extra1688ProductInformation = {};
  descriptionDetailDataResult.map((item) => {
    if (item.name === "颜色") {
      extra1688ProductInformation.color = item.value;
    }
    if (item.name === "主面料成分的含量") {
      extra1688ProductInformation.productMaterialContent = item.value;
    }
    if (item.name === "面料成分含量") {
      extra1688ProductInformation.productMaterialContent = item.value;
    }
    if (item.name === "尺码") {
      extra1688ProductInformation.measure = item.value;
    }
    if (item.name === "货号") {
      extra1688ProductInformation.supplierNumber = item.value;
    }
    if (item.name === "主面料成分") {
      extra1688ProductInformation.productMaterial = item.value;
    }
    if (item.name === "面料成分") {
      extra1688ProductInformation.productMaterial = item.value;
    }
  });
  console.log(descriptionDetailDataResult);
  // 重量体积
  let crossBorderAttributesNode = document.querySelector(
    "div.detail-other-attr-content"
  );
  let ddNodeArray = crossBorderAttributesNode.querySelectorAll("dd");
  let crossBorderAttributesResult = [];
  if (ddNodeArray) {
    for (let child of ddNodeArray) {
      let childArray = Array.from(child.children);
      if (childArray) {
        for (let key of childArray) {
          let c = key.innerText;
          crossBorderAttributesResult.push(c);
        }
      }
    }
  }

  // 公司名称
  let shopNameDateResult = "";
  if (document.querySelector("div.mod-contactSmall ")) {
    let shopName = document.querySelector("div.mod-contactSmall ");
    console.log(shopName);
    let shopNameDate = JSON.parse(shopName.getAttribute("data-view-config"));
    shopNameDateResult = shopNameDate.companyName;
  } else {
    let shopName = document
      .querySelector("meta[property='og:product:nick']")
      .getAttribute("content");
    // console.log(shopName)
    // let reg = /[\u4e00-\u9fa5]/g;
    // let shopNameDate = shopName.match(reg);
    // shopNameDateResult=shopNameDate.join("");
    let n1 = shopName.indexOf("=");
    let n2 = shopName.indexOf(";");
    shopNameDateResult = shopName.substr(n1 + 1, n2 - 5);
  }
  // // 图片
  let imageDetailUrlDataResult = "";
  if (document.querySelector("div.tab-pane")) {
    let imageUrlData = document.querySelector("div.tab-pane");
    let imageNode = imageUrlData.getElementsByTagName("img")[0];
    imageDetailUrlDataResult = imageNode.src;
  }

  return {
    color: extra1688ProductInformation.color,
    productMaterialContent: extra1688ProductInformation.productMaterialContent,
    measure: extra1688ProductInformation.measure,
    supplierNumber: extra1688ProductInformation.supplierNumber,
    productMaterial: extra1688ProductInformation.productMaterial,
    // descriptionDetailDataResult: extra1688ProductInformation,
    crossBorderAttributesResult: crossBorderAttributesResult,
    imageDetailUrlDataResult: imageDetailUrlDataResult,
    shopNameDateResult: shopNameDateResult,
  };
}

function get1688CustomAttribute(document) {
  // // 详情属性
  let descriptionDetailNode = document.querySelector(
    "div#mod-detail-attributes"
  );
  if (
    !descriptionDetailNode ||
    !isJson(descriptionDetailNode.getAttribute("data-feature-json"))
  ) {
    return [];
  }
  let descriptionDetailData = JSON.parse(
    descriptionDetailNode.getAttribute("data-feature-json")
  );
  let result = [];
  if (Array.isArray(descriptionDetailData)) {
    descriptionDetailData.forEach((item) => {
      result.push({
        name: getNested(item, "name"),
        value: getNested(item, "value"),
      });
    });
  }
  return result;
}
function getProductInfo(node) {
  const productInfo = [];
  if (node && node.length > 0) {
    for (const item of node) {
      const prices = item.querySelectorAll(".value");
      if (prices && prices.length > 0) {
        for (let price of prices) {
          if (price.innerText.includes("≥")) {
            price.innerText = price.innerText.replace("≥", "");
          }
          productInfo.push(price.innerText);
        }
      }
    }
    return productInfo;
  }
  return productInfo;
}
function get1688PriceMoq(document) {
  const priceListParentNode = document.querySelector("div#mod-detail-price");
  if (priceListParentNode) {
    const priceListSonNode =
      priceListParentNode.querySelectorAll("tr.price > td");
    const amountListSonNode =
      priceListParentNode.querySelectorAll("tr.amount > td");
    if (priceListSonNode && amountListSonNode) {
      const priceInfo = getProductInfo(priceListSonNode);
      const amountInfo = getProductInfo(amountListSonNode);
      return {
        priceInfo,
        amountInfo,
      };
    }
    return {};
  }
  const otherPrice = document.querySelector("div.mod-detail-info-price.fd-clr");
  const otherMoq = document.querySelector("div.mod-detail-info-minimum");
  if (otherPrice && otherMoq) {
    const price = otherPrice.querySelector("span.price-now");
    let moq = otherMoq.querySelector("div.obj-amount");
    if (price && moq) {
      moq.innerText = moq.innerText.trim();
      if (moq.innerText.includes("个")) {
        moq.innerText = moq.innerText.replace("个", "");
      }
      return {
        priceInfo: [price.innerText],
        amountInfo: [moq.innerText],
      };
    }
    return {};
  }
  return {};
}

function getSpecifications(jsonStr) {
  jsonStr = jsonStr.replace("};", "}");
  let skuObj = {};
  if (isJson5(jsonStr)) {
    skuObj = JSON5.parse(jsonStr);
  }
  const skuProps = getNested(skuObj, "sku", "skuProps");
  if (skuProps && isArray(skuProps) && skuProps.length > 0) {
    const result = skuProps.find((i) => i.prop === "颜色");
    if (result && result.value && result.value.length > 0) {
      return result.value;
    } else {
      if (skuProps[0] && skuProps[0].value && skuProps[0].value.length) {
        return skuProps[0].value;
      }
    }
  }
  return [];
}
function getPriceInfo(jsonStr) {
  let result = jsonStr.replace("};", "}");
  let oldPrice = [];
  let newPrice = null;
  if (isJson5(result)) {
    let jsonData = JSON5.parse(result);
    if (jsonData && jsonData.sku && "priceRange" in jsonData.sku) {
      newPrice = getNested(jsonData, "sku", "priceRange");
      newPrice.map((item) => {
        oldPrice.push(item.slice(1));
      });
    } else {
      oldPrice = getNested(jsonData, "sku", "price");
    }
  }
  console.log(oldPrice);
  return oldPrice;
}

function get1688ProductVideoUrl(res) {
  let str = res.substring(res.indexOf('data-mod-config=\'{"offset"'));
  str = str.substring(str.indexOf('{"offset'), str.indexOf("}") + 1);
  if (isJson(str)) {
    let videojson = JSON.parse(str);
    let userId = getNested(videojson, "userId");
    let videoId = getNested(videojson, "videoId");
    if (userId && videoId && videoId !== "0") {
      return (
        "http://cloud.video.taobao.com/play/u/" +
        userId +
        "/p/2/e/6/t/1/" +
        videoId +
        ".mp4"
      );
    }
  }
  return "";
}

async function getTheFirst1688Product(jsonStr, url, res) {
  let oldPrice = getPriceInfo(jsonStr);
  // 其他信息
  let domParser = new DOMParser();
  let document = domParser.parseFromString(res, "text/html");
  let title = "";
  let description = "";
  let extra1688Attributes = {};
  let descriptionDetail = "";
  let images = [];
  let otherImages = [];
  let mainImages = [];
  let attributeFrom1688 = [];
  let priceMoqInfo = [];
  let specifications = {};
  console.log("1688产品页面结构1");
  let videoUrl = "";
  try {
    // 标题
    let node = document.querySelector(".d-title");
    title = node.innerText;
    // 详情描述
    description = await get1688ProductDescription(document);
    description = wrapDescriptionWithMaxWidthDiv(description);
    // 图片
    images = get1688ProductImages(document);
    //其他图片
    otherImages = get1688ProductOtherImages(document);
    // 主图
    mainImages = getMainImages(images, otherImages);
    // 视频
    videoUrl = get1688ProductVideoUrl(res);
    // 详情描述1
    extra1688Attributes = get1688ProductDetailDescription(document);
    // 产品属性
    console.log(extra1688Attributes);
    extra1688Attributes.price = oldPrice;
    descriptionDetail = JSON.stringify(extra1688Attributes);
    // 产品属性
    attributeFrom1688 = get1688CustomAttribute(document);
    // 价格及起订量
    priceMoqInfo = get1688PriceMoq(document);
    // 规格
    specifications = getSpecifications(jsonStr);
  } catch (e) {
    console.error(`收集采集品信息出现异常${url}`);
    console.error(e);
    return null;
  }
  return {
    title: title,
    keywords: [],
    description: description,
    descriptionDetail: descriptionDetail,
    attributeFrom1688,
    images,
    videoUrl,
    sourceUrl: url,
    priceMoqInfo,
    otherImages,
    mainImages,
    specifications,
  };
}

async function get1688OtherProduct(sourceUrl, res) {
  let title = "";
  let images = [];
  try {
    // 标题
    const startTitle = res.substring(res.indexOfEnd("<title>"));
    title = startTitle.substring(0, startTitle.indexOf("</title>"));
    const start = res.substring(res.indexOfEnd("window.__INIT_DATA="));
    const jsonStr = start.substring(0, start.indexOf("</script>"));
    if (jsonStr && isJson(jsonStr)) {
      const result = JSON.parse(jsonStr);
      console.log(result);
      const data = {
        sourceUrl,
        title,
      };
      // 图片
      images = getNested(
        result,
        "data",
        "774504306937",
        "data",
        "offerImgList"
      );
      if (images && images.length > 0) {
        console.log("1688产品页面结构2");
        return await getTheSecond1688Product(result, data, images);
      } else {
        console.log("1688产品页面结构3");
        return await getTheThree1688Product(result, data);
      }
    } else {
      console.log("1688产品页面结构4");

      const startTitle = res.substring(res.indexOfEnd("<title>"));
      title = startTitle.substring(0, startTitle.indexOf("</title>"));
      const start = res.substring(res.indexOfEnd("(window.contextPath,"));
      const jsonStr = start.substring(0, start.indexOf(");"));
      const jsonObj = eval("(" + jsonStr + ")");
      console.log(jsonObj);
      if (jsonStr && jsonObj) {
        const result = jsonObj?.result;
        console.log(result);
        const data = {
          sourceUrl,
          title,
        };
        // 图片
        images = getNested(result, "data", "gallery", "fields", "offerImgList");
        return await getTheFour1688Product(result, data, images);
      }
    }
  } catch (e) {
    console.error(`收集另一种采集品信息出现异常${sourceUrl}`);
    return null;
  }
}
async function getTheSecond1688Product(result, data, images) {
  let description = "";
  let priceMoqInfo = {};
  let specifications = [];
  let attributeFrom1688 = [];
  // 详情
  let detailUrl = getNested(
    result,
    "data",
    "774504306919",
    "data",
    "detailUrl"
  );
  if (detailUrl) {
    if (detailUrl.includes("?")) {
      detailUrl = detailUrl.substring(0, detailUrl.indexOf("?"));
    }
    description = await get1688Description(detailUrl);
    description = wrapDescriptionWithMaxWidthDiv(description);
  }
  // 价格及起订量
  const skuRangePrices = getNested(
    result,
    "globalData",
    "orderParamModel",
    "orderParam",
    "skuParam",
    "skuRangePrices"
  );
  if (isArrayLength(skuRangePrices)) {
    priceMoqInfo.priceInfo = skuRangePrices.map((i) => i.price);
    priceMoqInfo.amountInfo = skuRangePrices.map((i) => i.beginAmount);
    if (isArrayLength(priceMoqInfo.amountInfo)) {
      priceMoqInfo.amountInfo = [...new Set(priceMoqInfo.amountInfo)];
    }
  }
  const skuProps = getNested(
    result,
    "globalData",
    "skuModelOrigin",
    "skuProps"
  );
  if (isArrayLength(skuProps)) {
    const colorSku = skuProps.find((f) => f.prop === "颜色");
    if (colorSku && colorSku.value) {
      specifications = colorSku.value;
    } else {
      if (skuProps[0]) {
        specifications = skuProps[0].value;
      }
    }
  }
  // 1688服装行业报价单导出数据
  const descriptionDetail = get1688DescriptionDetail(result);

  // 1688自定义属性
  attributeFrom1688 = getAttributeFrom1688(result);
  // 规格价
  let skuInfoMap = getNested(result, "globalData", "skuModel", "skuInfoMap");

  return {
    keywords: [],
    description,
    priceMoqInfo,
    specifications,
    images: isImages(images),
    attributeFrom1688,
    skuInfoMap,
    descriptionDetail: JSON.stringify(descriptionDetail),
    ...data,
  };
}
async function getTheThree1688Product(result, data) {
  let images = [];
  let mainImages = [];
  let otherImage = [];
  let description = "";
  let priceMoqInfo = {};
  let specifications = [];
  let skuInfoMap = {};
  let videoUrl = "";
  let attributeFrom1688 = [];
  const offerIds = [
    "1081181309881",
    "16347413030314",
    "13772573043551",
    "77450430333860",
    // detailUrl
    "1081181309894",
    "16347413030338",
    "13772573013167",
    // priceModel
    "1081181309582",
    "16347413030316",
  ];
  let offerImgList = undefined;
  for (const offerId of offerIds) {
    if (!offerImgList) {
      offerImgList = getNested(result, "data", offerId, "data", "offerImgList");
    } else {
      break;
    }
  }
  if (offerImgList && offerImgList.length) {
    //所有图片
    images = offerImgList;
    const skuProps = getNested(result, "globalData", "skuModel", "skuProps");
    if (skuProps && skuProps.length) {
      let colorProp;
      const sku = skuProps.find((i) => i.prop === "颜色");
      if (sku) {
        if (sku.value && sku.value.length) {
          const isHasImageUrl = sku.value.some((s) =>
            Object.hasOwn(s, "imageUrl")
          );
          if (isHasImageUrl) {
            colorProp = sku;
          } else {
            colorProp = skuProps[0];
          }
        }
      } else {
        colorProp = skuProps[0];
      }
      if (colorProp && colorProp.value && colorProp.value.length) {
        //其他图片
        otherImage = colorProp.value;
        //主图
        mainImages = getMainImages(
          images,
          otherImage.map((i) => i.imageUrl)
        );
        //规格
        specifications = otherImage;
        // skuInfoMap
        skuInfoMap = getNested(result, "globalData", "skuModel", "skuInfoMap");
      }
    }
  }
  // 视频

  let video = undefined;
  for (const offerId of offerIds) {
    if (!video) {
      video = getNested(result, "data", offerId, "data", "video");
    } else {
      break;
    }
  }

  if (video && video.videoUrl) {
    videoUrl = video.videoUrl;
  }
  //详情
  let detailUrl = undefined;
  for (const offerId of offerIds) {
    if (!detailUrl) {
      detailUrl = result?.data?.[offerId]?.data?.detailUrl;
    } else {
      break;
    }
  }
  if (!detailUrl) {
    for (const key in result?.data) {
      const item = result?.data[key];
      if (item?.componentType === "@ali/tdmod-od-pc-offer-description") {
        detailUrl = item?.data?.detailUrl;
        break;
      }
    }
  }
  if (detailUrl) {
    if (detailUrl.includes("?")) {
      detailUrl = detailUrl.substring(0, detailUrl.indexOf("?"));
    }
    description = wrapDescriptionWithMaxWidthDiv(
      await get1688Description(detailUrl)
    );
    // description = wrapDescriptionWithMaxWidthDiv(description);
  }
  //价格及起订量
  let priceModel = undefined;
  for (const offerId of offerIds) {
    if (!priceModel) {
      priceModel = result?.data?.[offerId]?.data?.priceModel?.currentPrices;
    } else {
      break;
    }
  }
  if (priceModel && priceModel.length) {
    priceMoqInfo.priceInfo = priceModel.map((i) => i.price);
    priceMoqInfo.amountInfo = priceModel.map((i) => i.beginAmount);
  }
  priceModel = getNested(
    result,
    "globalData",
    "orderParamModel",
    "orderParam",
    "skuParam",
    "skuRangePrices"
  );
  if (isArrayLength(priceModel)) {
    priceMoqInfo.priceInfo = priceModel.map((i) => i.price);
    priceMoqInfo.amountInfo = priceModel.map((i) => i.beginAmount);
  } else {
    priceMoqInfo = null;
  }
  // 1688服装行业报价单导出数据
  const descriptionDetail = get1688DescriptionDetail(result);

  // 1688自定义属性
  attributeFrom1688 = getAttributeFrom1688(result);

  return {
    keywords: [],
    images,
    description,
    otherImage,
    mainImages,
    priceMoqInfo,
    specifications,
    skuInfoMap,
    videoUrl,
    attributeFrom1688,
    descriptionDetail: JSON.stringify(descriptionDetail),
    ...data,
  };
}

async function getTheFour1688Product(result, data, images) {
  let description = "";
  let priceMoqInfo = {};
  let specifications = [];
  let attributeFrom1688 = [];
  // 详情
  let detailUrl = getNested(
    result,
    "data",
    "description",
    "fields",
    "detailUrl"
  );
  console.log(detailUrl);
  if (detailUrl) {
    if (detailUrl.includes("?")) {
      detailUrl = detailUrl.substring(0, detailUrl.indexOf("?"));
    }
    description = await get1688Description(detailUrl);
    description = wrapDescriptionWithMaxWidthDiv(description);
  }
  // 价格及起订量
  const skuRangePrices = getNested(
    result,
    "data",
    "Root",
    "fields",
    "dataJson",
    "orderParamModel",
    "orderParam",
    "skuParam",
    "skuRangePrices"
  );
  console.log(skuRangePrices);
  if (isArrayLength(skuRangePrices)) {
    priceMoqInfo.priceInfo = skuRangePrices.map((i) => i.price);
    priceMoqInfo.amountInfo = skuRangePrices.map((i) => i.beginAmount);
    if (isArrayLength(priceMoqInfo.amountInfo)) {
      priceMoqInfo.amountInfo = [...new Set(priceMoqInfo.amountInfo)];
    }
  }
  const skuProps = getNested(
    result,
    "data",
    "Root",
    "fields",
    "dataJson",
    "skuModel",
    "skuProps"
  );
  console.log(skuProps);
  if (isArrayLength(skuProps)) {
    const colorSku = skuProps.find((f) => f.prop === "颜色");
    if (colorSku && colorSku.value) {
      specifications = colorSku.value;
    } else {
      if (skuProps[0]) {
        specifications = skuProps[0].value;
      }
    }
  }
  // 1688服装行业报价单导出数据
  const descriptionDetail = get1688DescriptionDetail(result);

  // 1688自定义属性
  attributeFrom1688 = getAttributeFrom1688(result);
  // 规格价
  let skuInfoMap = getNested(
    result,
    "data",
    "Root",
    "fields",
    "dataJson",
    "skuModel",
    "skuInfoMap"
  );
  console.log(skuInfoMap);
  return {
    keywords: [],
    description,
    priceMoqInfo,
    specifications,
    images: isImages(images),
    attributeFrom1688,
    skuInfoMap,
    descriptionDetail: JSON.stringify(descriptionDetail),
    ...data,
  };
}

// 获得1688服装行业报价单导出数据
function get1688DescriptionDetail(result) {
  // 获取产品样式信息
  let styleArr = getNested(result, "data", "1081181309201", "data");

  if (!isArrayLength(styleArr)) {
    styleArr = getNested(result, "data", "16347413030336", "data");
  }
  if (!isArrayLength(styleArr)) {
    return null;
  }
  // 主图
  let imageDetailUrlDataResult = "";
  // 材质
  let productMaterial = "";
  let productMaterialContent = "";
  // 尺寸
  let measure = "";
  // 颜色
  let color = "";
  // 重量与体积
  let crossBorderAttributesResult = [];
  // 货号
  let supplierNumber = "";
  // 名称
  let shopNameDateResult = "";
  // 价格
  let price = "";
  if (isArrayLength(styleArr)) {
    styleArr.forEach((item) => {
      switch (item.name) {
        case "主面料成分":
          productMaterial = item.value;
          break;
        case "面料成分":
          productMaterial = item.value;
          break;
        case "主面料成分的含量":
          productMaterialContent = item.value;
          break;
        case "面料成分含量":
          productMaterialContent = item.value;
          break;
        case "尺码":
          measure = item.value;
          break;
        case "颜色":
          color = item.value;
          break;
        case "货号":
          supplierNumber = item.value;
          break;
      }
    });
  }
  // 主图
  imageDetailUrlDataResult = getNested(
    result,
    "data",
    "1081181309881",
    "data",
    "offerImgList",
    "0"
  );
  // 重量与体积
  crossBorderAttributesResult[0] = getNested(
    result,
    "data",
    "1081181309101",
    "data",
    "volume"
  );
  crossBorderAttributesResult[1] =
    getNested(result, "data", "1081181309101", "data", "unitWeight") + "kg";
  // 名称
  const offerDomain = getNested(
    result,
    "data",
    "1081181309884",
    "data",
    "offerDomain"
  );
  if (isJson(offerDomain)) {
    shopNameDateResult = getNested(offerDomain, "sellerModel", "companyName");
  }
  if (!shopNameDateResult) {
    shopNameDateResult = getNested(
      result,
      "globalData",
      "tempModel",
      "companyName"
    );
  }
  // 价格
  price = getProductPrice1688(result);
  return {
    // 主图
    imageDetailUrlDataResult,
    // 材质
    productMaterialContent,
    productMaterial,
    // 尺寸
    measure,
    // 颜色
    color,
    // 重量与体积
    crossBorderAttributesResult,
    // 货号
    supplierNumber,
    // 名称
    shopNameDateResult,
    // 价格
    price,
  };
}

function getAttributeFrom1688(result) {
  let attributeFrom1688 = getNested(result, "data", "1081181309201", "data");
  if (!attributeFrom1688) {
    attributeFrom1688 = getNested(result, "data", "16347413030336", "data");
  }
  if (isArrayLength(attributeFrom1688)) {
    return attributeFrom1688.map((m) => {
      return {
        name: m.name,
        value: m.value,
      };
    });
  }
  return [];
}

function getProductPrice1688(result) {
  const prices = getNested(
    result,
    "data",
    "1081181309582",
    "data",
    "priceModel",
    "currentPrices"
  );
  if (prices && Array.isArray(prices) && prices.length) {
    return prices.map((item) => item.price).join("-");
  }
  return "";
}

function get1688Description(url) {
  return axios({
    url,
    method: "get",
  })
    .then((res) => {
      if (res) {
        const start = 'var offer_details={"content":';
        const end = "};";
        if (res.data.includes(start)) {
          const descriptionContent = res.data.substring(
            res.data.indexOfEnd(start)
          );
          const description = descriptionContent.substring(
            0,
            descriptionContent.indexOf(end)
          );
          return JSON.parse(description);
        } else {
          return res.data;
        }
      }
      return "";
    })
    .catch((err) => {
      console.log(`获取getDescription出错了:${err}`);
    });
}
function isImages(arr) {
  return arr && isArray(arr) && arr.length > 0 ? arr : [];
}

function needVerification(res) {
  return res.includes("霸下通用 web 页面-验证码");
}

function gather1688ProductFromUrl(url) {
  return Axios({
    url,
    method: "get",
  }).then(async (res) => {
    if (needVerification(res)) {
      return { needVerification: true };
    }
    console.log("🚀 ~ gather1688ProductFromUrl ~ url:", url);
    let jsonStr = res.substring(
      res.indexOfEnd("iDetailData = "),
      res.indexOf("iDetailData.allTagIds")
    );
    if (jsonStr) {
      console.log("1688产品页面结构1");
      return await getTheFirst1688Product(jsonStr, url, res);
    } else {
      console.log("1688产品页面结构2");
      return await get1688OtherProduct(url, res);
    }
  });
}

function getAliexpressToken() {
  return new Promise((resolve) => {
    chrome.cookies.getAll(
      {
        domain: ".aliexpress.com",
        name: "_m_h5_tk",
      },
      (cookies2) => {
        if (cookies2[0] && cookies2[0].value) {
          let token = cookies2[0].value.split("_")[0];
          resolve(token);
        } else {
          console.log("aliexpress token not found");
          resolve("");
        }
      }
    );
  });
}

async function getAliexpressQueryJson(productId) {
  const reqUrl =
    "https://acs.aliexpress.com/h5/mtop.aliexpress.pdp.pc.query/1.0";

  const t = new Date().getTime();
  const appKey = "12574478";

  const token = await getAliexpressToken();
  // console.log(token);
  const queryData = {
    channel: "",
    city: "",
    clientType: "pc",
    country: "US",
    ext: '{"foreverRandomToken":"ab247aeebfe148bb9bbd743af892a752","site":"glo","webAffiParameters":"{\\"aeuCID\\":\\"dcc6c7a6ea4c4934879c1a29e5185665-1726415884290-01837-UneMJZVf\\",\\"affiliateKey\\":\\"UneMJZVf\\",\\"channel\\":\\"PREMINUM\\",\\"cv\\":\\"2\\",\\"isCookieCache\\":\\"N\\",\\"ms\\":\\"1\\",\\"pid\\":\\"178094261\\",\\"tagtime\\":1726415884290}","crawler":false,"x-m-biz-bx-region":"domestic","signedIn":false,"host":"www.aliexpress.com"}',
    pdpNPI:
      "4@dis\u0021USD\u002139.65\u002116.39\u0021\u0021\u0021280.01\u0021115.77\u0021@2167359c17264671777005460e0520\u002112000041648775371\u0021rec\u0021US\u0021230075290\u0021ABXZ",
    pdp_ext_f: "",
    productId: productId,
    province: "",
    sourceType: "",
    _currency: "USD",
    _lang: "en_US",
  };
  const data = JSON.stringify(queryData);
  let signs = inquiryService.sign(token + "&" + t + "&" + appKey + "&" + data);

  const params = {
    jsv: "2.5.1",
    appKey: appKey,
    t: t,
    sign: signs,
    api: "mtop.aliexpress.pdp.pc.query",
    // type: "originaljsonp",
    v: "1.0",
    timeout: 15000,
    // dataType: "orignaljsonp",
    // callback: "mtopjsonp1",
    data: JSON.stringify(queryData),
  };
  return Axios({
    url: reqUrl,
    method: "get",
    params: params,
  }).then((res) => {
    // console.log(res);
    return res;
  });
}

function gatherAliexpressProductFromUrl(url) {
  console.log("🚀 ~ gatherAliexpressProductFromUrl ~ url:", url);
  if (!url.startsWith("https")) {
    url = "https:" + url;
  }
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;
  const pathSegments = pathname.split("/");
  const lastPath = pathSegments[pathSegments.length - 1];
  const productId = lastPath.split(".")[0];
  return getAliexpressQueryJson(productId).then((res) => {
    const result = getAliexpressProductFrom3(
      res,
      urlObj.origin + urlObj.pathname
    );
    console.log(result);
    return result;
  });
  // return Axios({
  //   url,
  //   method: "get",
  // })
  //   .then((res) => {
  //     const start = "window.runParams = {\n                            data: ";
  //     const end = "}},\n                        ";
  //     const elementNode = res.substring(res.indexOfEnd(start));
  //     const dataJson =
  //       elementNode.substring(0, elementNode.indexOf(end)) + "}}";
  //     // 第一种结构
  //     if (dataJson && isJson(dataJson)) {
  //       console.log("aliexpress第一种结构有效");
  //       return getAliexpressProductFrom(dataJson, url);
  //     } else {
  //       const dataJson = res.substring(
  //         res.indexOfEnd(start),
  //         res.indexOf("                    };")
  //       );
  //       // 第二种结构
  //       if (dataJson && isJson(dataJson)) {
  //         console.log("aliexpress第二种结构有效");
  //         return getAliexpressProductFrom2(dataJson, url);
  //       }
  //       console.log("aliexpress两种结构匹配无效");
  //       return null;
  //     }
  //   })
  //   .catch((err) => {
  //     console.log(`获取gatherAliexpressProductFromUrl失败了:${err}`);
  //   });
}

// async function getAliexpressProductFrom(dataJson, sourceUrl) {
//   const data = JSON.parse(dataJson);
//   // 主图
//   const imagePathList = getNested(data, "imageModule", "imagePathList");
//   const images = isArrayLength(imagePathList) ? imagePathList : [];

//   // 标题
//   const title = getNested(data, "titleModule", "subject") || "";

//   // 关键词
//   const keywordStr = getNested(data, "pageModule", "keywords");
//   const keywords = getAliExpressProductKeywords(keywordStr);

//   // 详情描述
//   let description = "";
//   const descriptionUrl = getNested(data, "descriptionModule", "descriptionUrl");
//   if (descriptionUrl) {
//     description = await getAliexpressProductDescription(descriptionUrl);
//   }
//   return {
//     title,
//     keywords,
//     description,
//     images,
//     sourceUrl,
//   };
// }

// async function getAliexpressProductFrom2(dataJson, sourceUrl) {
//   const data = JSON.parse(dataJson);
//   // 主图
//   const imagePathList = getNested(data, "imageComponent", "imagePathList");
//   const images = isArrayLength(imagePathList) ? imagePathList : [];

//   // 标题
//   const title = getNested(data, "productInfoComponent", "subject") || "";

//   // 关键词
//   const keywordStr = getNested(data, "metaDataComponent", "keywords");
//   const keywords = getAliExpressProductKeywords(keywordStr);

//   // 详情描述
//   let description = "";
//   const descriptionUrl = getNested(
//     data,
//     "productDescComponent",
//     "descriptionUrl"
//   );
//   if (descriptionUrl) {
//     description = await getAliexpressProductDescription(descriptionUrl);
//   }
//   return {
//     title,
//     keywords,
//     description,
//     images,
//     sourceUrl,
//   };
// }

async function getAliexpressProductFrom3(data, sourceUrl) {
  // 主图
  const imagePathList = getNested(
    data,
    "data",
    "result",
    "HEADER_IMAGE_PC",
    "imagePathList"
  );
  const images = isArrayLength(imagePathList) ? imagePathList : [];

  // 标题
  const title =
    getNested(data, "data", "result", "PRODUCT_TITLE", "text") || "";

  // 关键词
  // const keywordStr = getNested(data, "metaDataComponent", "keywords");
  // const keywords = getAliExpressProductKeywords(keywordStr);

  // 详情描述
  let description = "";
  const descriptionUrl = getNested(data, "data", "result", "DESC", "pcDescUrl");
  if (descriptionUrl) {
    description = await getAliexpressProductDescription(descriptionUrl);
  }
  return {
    title,
    keywords: [],
    description,
    images,
    sourceUrl,
  };
}

function getAliExpressProductKeywords(keywordStr) {
  if (!keywordStr) {
    return [];
  }
  if (keywordStr.includes(", ")) {
    return keywordStr.split(", ");
  }
  return [...keywordStr];
}

function getAliexpressProductDescription(url) {
  return axios({
    url,
    method: "get",
  })
    .then((res) => {
      return res && res.data ? res.data : "";
    })
    .catch((err) => {
      console.log(`获取getAliexpressProductDescription出错了:${err}`);
    });
}

function checkNeedLogin(document, url) {
  let loginNode = document.querySelector("div#loginchina-wrapper");
  if (loginNode) {
    sendResponse({ success: false, message: url, data: null });
  }
  let errorNode = document.querySelector("div#err");
  if (errorNode) {
    sendResponse({ success: false, message: url, data: null });
  }
}

function get1688ProductUrlFromCat(categoryUrl, number) {
  return Axios({
    url: categoryUrl,
  }).then((res) => {
    let domParser = new DOMParser();
    let document = domParser.parseFromString(res, "text/html");
    checkNeedLogin(document);
    let productListNode = document.querySelector("ul.offer-list-row");
    if (isArrayLength(productListNode)) {
      let aLinks = productListNode.getElementsByTagName("a");
      let productUrls = [];
      for (const link of aLinks) {
        if (
          link.parentElement &&
          link.parentElement.getAttribute("class") === "title-new"
        ) {
          productUrls.push(link.getAttribute("href"));
        }
      }
      return productUrls;
    }
    return getOtherPageUrlList(res, categoryUrl, number);
  });
}

async function getAliExpressUrlFromCat(url) {
  const objUrl = new URL(url);

  const searchParams = objUrl.searchParams;
  console.log(
    "🚀 ~ getAliExpressUrlFromCat ~ objUrl.searchParams:",
    objUrl.searchParams
  );
  console.log("🚀 ~ getAliExpressUrlFromCat ~ queryMap:", searchParams);
  const reqUrl =
    "https://acs.aliexpress.com/h5/mtop.ae.shop.search.product.group/1.0/";
  const t = new Date().getTime();
  const appKey = "24815441";

  const token = await getAliexpressToken();
  // console.log(token);
  const queryData = {
    locale: "en_US",
    country: "US",
    currency: "USD",
    lang: "en",
    buyerId: 230075290,
    currentPage: 1,
    productGroupId: searchParams.get("productGroupId"),
    pageSize: 40,
    sellerId: 230247443,
    site: "glo",
    storeNumber: 2820080,
    platform: "pc",
    sortType: "bestmatch_sort",
    filterType: "",
    searchText: "",
    cookieId: "QX1kH2LtJVkCAVm5GYw6LVvp",
  };
  const data = JSON.stringify(queryData);
  let signs = inquiryService.sign(token + "&" + t + "&" + appKey + "&" + data);

  const params = {
    jsv: "2.5.1",
    appKey: appKey,
    t: t,
    sign: signs,
    api: "mtop.ae.shop.search.product.group",
    // type: "originaljsonp",
    v: "1.0",
    // timeout: 15000,
    // dataType: "orignaljsonp",
    // callback: "mtopjsonp1",
    data: JSON.stringify(queryData),
  };
  return Axios({
    url: reqUrl,
    params,
    method: "get",
  })
    .then((res) => {
      // console.log("🚀 ~ .then ~ res:", res);
      return res?.data?.data.map((item) => item.pcDetailUrl);
    })
    .catch((err) => {
      console.log(`getAliExpressUrlFromCat失败了: ${err}`);
    });
}

async function getOtherPageUrlParams(memberId, catId, number) {
  const token = await getToken();
  const appKey = 12574478;
  const t = moment(new Date()).valueOf();
  const data = getOtherPageUrlForm(memberId, catId, number);
  const sign = md5(token + "&" + t + "&" + appKey + "&" + data);
  return {
    jsv: "2.6.2",
    appKey,
    t,
    sign,
    api: "mtop.1688.shop.data.get",
    v: "1.0",
    type: "json",
    valueType: "string",
    dataType: "json",
    timeout: 10000,
  };
}
function getOtherPageUrlForm(memberId, catId, number = 1) {
  let catIdFront = catId.substring(0, catId.indexOf("_"));
  let catPid = catId.substring(catId.indexOf("_") + 1);
  return `{"dataType":"moduleData","argString":"{\\"memberId\\":\\"${memberId}\\",\\"appName\\":\\"pcmodules\\",\\"resourceName\\":\\"wpOfferColumn\\",\\"type\\":\\"view\\",\\"version\\":\\"1.0.0\\",\\"appdata\\":{\\"catId\\":\\"${catIdFront}\\",\\"catPid\\":\\"${catPid}\\",\\"sortType\\":\\"wangpu_score\\",\\"sellerRecommendFilter\\":false,\\"mixFilter\\":false,\\"tradenumFilter\\":false,\\"quantityBegin\\":null,\\"pageNum\\":${number},\\"count\\":30}}"}`;
}

function getMemberId(res) {
  try {
    const start = "window.shopPageDataApi = ";
    const end = ";";
    const shopPageDataApiStr = res.substring(res.indexOfEnd(start));
    const shopPageDataApi = shopPageDataApiStr.substring(
      0,
      shopPageDataApiStr.indexOf(end)
    );
    const sellerMemberIdStr = shopPageDataApi.substring(
      shopPageDataApi.indexOfEnd("sellerMemberId=")
    );
    const memberId = sellerMemberIdStr.substring(
      0,
      sellerMemberIdStr.indexOf("&")
    );
    return memberId;
  } catch (err) {
    console.log(`获取getMemberId出错了:${err}`);
    return "";
  }
}

function getCatId(categoryUrl) {
  try {
    const start = "offerlist_";
    const end = ".htm";
    const catIdStr = categoryUrl.substring(categoryUrl.indexOfEnd(start));
    const catId = catIdStr.substring(0, catIdStr.indexOf(end));
    return catId;
  } catch (err) {
    console.log(`获取getCatId出错了:${err}`);
    return "";
  }
}

export async function getOtherPageUrlList(res, categoryUrl, number) {
  const url = "https://h5api.m.1688.com/h5/mtop.1688.shop.data.get/1.0/";
  const memberId = getMemberId(res);
  const catId = getCatId(categoryUrl);
  const params = await getOtherPageUrlParams(memberId, catId, number);
  const form = {
    data: getOtherPageUrlForm(memberId, catId, number),
  };
  return axios({
    url,
    method: "post",
    params,
    data: qs.stringify(form),
  }).then((res) => {
    const offerList = getNested(res, "data", "data", "content", "offerList");
    if (isArrayLength(offerList)) {
      const ids = offerList.map((m) => m.id);
      const urls = [];
      for (const id of ids) {
        urls.push(`https://detail.1688.com/offer/${id}.html`);
      }
      return urls;
    }
    return [];
  });
}

// 在阿里的产品分组上获取到的产品url，批量抓取
async function gatherProductFromUrlList(urlList, ctoken) {
  let result = [];
  let failUrls = [];
  console.log(urlList);
  let needVerification = false;
  for (let url of urlList) {
    let data = null;
    if (url.includes("alibaba.com")) {
      try {
        data = await gatherAliProductFromUrl(url, ctoken);
      } catch (e) {
        // failUrls.push(url)
      }
    }
    if (url.includes("1688.com")) {
      if (needVerification) {
        failUrls.push(url);
        continue;
      } else {
        data = await gather1688ProductFromUrl(url);
        if (data && data.needVerification) {
          needVerification = true;
          failUrls.push(url);
          continue;
        }
      }
    }
    if (url.includes("aliexpress")) {
      data = await gatherAliexpressProductFromUrl(url);
    }
    if (data) {
      result.push(data);
    } else {
      failUrls.push(url);
    }
  }
  console.log("gather-product gatherProductFromUrlList", result, failUrls);
  return { result, failUrls };
}

async function newGatherProductFormUrl(url, ctoken) {
  let failUrl = "";
  let data = null;
  if (url.includes("alibaba.com")) {
    // 采集国际站链接时强制转为英文站
    await cookieService.convertAlibaba2EnglishSite(url);
    try {
      data = await gatherAliProductFromUrl(url, ctoken);
    } catch (e) {
      failUrl = url;
    }
  }
  if (url.includes("1688.com")) {
    const res = await gather1688ProductFromUrl(url);
    const { images, description } = res;
    console.log("🚀 ~ newGatherProductFormUrl ~ before images:", images);
    // upload images to ali photobank

    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i];
      const imageRes = await uploadImageService.tryUploadFileToPhotoBank(ctoken, imageUrl, undefined, uuid().slice(0, 8), "", false);
      let { success, message, newUrl } = imageRes;
      if (success) {
        res.images[i] = newUrl;
      } else {
        console.log(`上传图片失败了:${message}`);
      }
    }
    console.log("🚀 ~ newGatherProductFormUrl ~ after images:", images);

    // parse description as html dom, extract img
    if (description && description.length) {
        const domParser = new DOMParser();
        const document = domParser.parseFromString(description, "text/html");
        const imgNodes = document.querySelectorAll("img");
        for (let i = 0; i < imgNodes.length; i++) {
            const imgNode = imgNodes[i];
            const imageUrl = imgNode.getAttribute("src");
            if (imageUrl) {
              console.log("🚀 ~ newGatherProductFormUrl description ~ before imageUrl:", imageUrl);
              const imageRes = await uploadImageService.tryUploadFileToPhotoBank(ctoken, imageUrl, undefined, uuid().slice(0, 8), "", false);
              let { success, message, newUrl } = imageRes;
              if (success) {
                imgNode.setAttribute("src", newUrl);
                console.log("🚀 ~ newGatherProductFormUrl description ~ after imageUrl:", newUrl);
              } else {
                console.log(`${imageUrl} 上传图片失败了: ${message}`);
              }
            }
        }
        // write new description from
        res.description = document.documentElement.outerHTML || description
    }


    if (res && res.needVerification) {
      failUrl = url;
    } else {
      data = res;
    }
  }
  if (url.includes("aliexpress")) {
    data = await gatherAliexpressProductFromUrl(url);
  }
  return {
    data,
    failUrl,
  };
}
function urlToBase64(list) {
  return new Promise((resolve) => {
    fetch(list.value)
      .then((data) => {
        const blob = data.blob();
        return blob;
      })
      .then((blob) => {
        let reader = new FileReader();
        reader.onloadend = function () {
          const dataURL = reader.result;
          // console.log('base64地址：', dataURL)
          resolve(dataURL);
        };
        reader.readAsDataURL(blob);
      });
  });
}
function base64ToFile(dataURL) {
  const arr = dataURL.split(",");
  let mime = arr[0].match(/:(.*?);/)[1];
  let bstr = atob(arr[1]),
    n = bstr.length,
    u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  let filename =
    new Date().getTime() +
    "" +
    Math.ceil(Math.random() * 100) +
    "." +
    mime.split("/")[1];
  return new File([u8arr], filename, { type: mime });
}
function getQueryToken(ctoken) {
  const form = {
    ctoken,
  };
  return Axios({
    url: `https://hz-productposting.alibaba.com/product/asyQueryToken.do`,
    method: "post",
    data: qs.stringify(form),
  }).then((res) => {
    return res.data.token;
  });
}
function postUpload(queryToken, file) {
  const formData = new FormData();
  formData.append("name", file.name);
  formData.append("size", file.size);
  formData.append("file", file);
  return Axios({
    url: `https://upload.media.aliyun.com/api/proxy/upload.json`,
    method: "post",
    data: formData,
    headers: {
      authorization: queryToken,
    },
  })
    .then((res) => {
      return res;
    })
    .catch((err) => {
      console.log(`上传产品失败失败了:${err}`);
    });
}

async function getVideoDuration(fileInfo, list) {
  const audio = new Audio(list.value);
  const result = await new Promise((resolve) => {
    audio.addEventListener("loadeddata", () => {
      resolve(audio.duration);
    });
  });
  fileInfo.duration = result;
}
function getProductVideoCover(fileInfo) {
  const params = {
    fileId: fileInfo.fileId,
    num: 1,
  };
  return Axios({
    url: `https://snapshot-video.taobao.com/transcode/snapshot`,
    method: "get",
    params,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  })
    .then((res) => {
      console.log(res);
      fileInfo.cover = res.data;
    })
    .catch((err) => {
      console.log(`获取封面截图失败了:${err}`);
    });
}
function getProductVideoCsrfToken() {
  return Axios({
    url: `https://hz-productposting.alibaba.com/product/videobank/upload.htm`,
    method: "get",
  })
    .then((res) => {
      if (res) {
        const data = res;
        const start = "csrfToken: '";
        const end = "',";
        const node = data.substring(data.indexOfEnd(start));
        csrfToken = node.substring(0, node.indexOf(end));
      }
    })
    .catch((err) => {
      console.log(`获取getProductVideoCsrfToken出错了:${err}`);
    });
}
function postProductVideo(fileInfo, list, ctoken) {
  const params = {
    ctoken,
  };
  const form = {
    event: "saveVideo",
    postVideo: `{"uploadId":"${fileInfo.fileId}","fileSize":${
      fileInfo.fileSize
    },"duration":${fileInfo.duration},"videoName":"${list.model}","coverUrl":"${
      fileInfo.cover && fileInfo.cover.length ? fileInfo.cover[0] : ""
    }","cover":{"1x1":"","16x9":"","default":"${
      fileInfo.cover && fileInfo.cover.length ? fileInfo.cover[0] : ""
    }"},"tagIds":[82881, 80503],"multiCover":true}`,
    _csrf_token_: csrfToken,
  };
  return Axios({
    url: `https://hz-productposting.alibaba.com/product/ajax_video.do`,
    method: "post",
    params,
    data: qs.stringify(form),
  })
    .then((res) => {
      if (res && res.success) {
        return true;
      }
      return false;
    })
    .catch((err) => {
      console.log(`上传产品视频出错了:${err}`);
      return false;
    });
}
async function uploadProductVideo(param, ctoken) {
  const falseStatusList = [];
  for (const list of param.idVideoList) {
    await sleep(500);
    try {
      const queryToken = await getQueryToken(ctoken);
      const base64 = await urlToBase64(list);
      const file = base64ToFile(base64);
      //获取视频文件信息
      const fileInfo = await postUpload(queryToken, file);
      //获取视频时长
      await getVideoDuration(fileInfo, list);
      //获取封面图片
      await getProductVideoCover(fileInfo);
      //上传产品视频
      const status = await postProductVideo(fileInfo, list, ctoken);
      if (!status) {
        falseStatusList.push(status);
      }
    } catch (err) {
      console.log(`上传产品视频出错了:${err}`);
      falseStatusList.push(false);
      return false;
    }
  }
  return falseStatusList;
}

async function getProductUrlsFromCat(categoryUrl, number) {
  console.log("🚀 ~ getProductUrlsFromCat ~ categoryUrl:", categoryUrl);

  let productUrls = [];
  if (categoryUrl.includes("alibaba.com")) {
    productUrls = await getProductUrlFromCat(categoryUrl);
  }
  if (categoryUrl.includes("1688.com/page/offerlist")) {
    productUrls = await get1688ProductUrlFromCat(categoryUrl, number);
  }
  if (categoryUrl.includes("aliexpress.com/store")) {
    productUrls = await getAliExpressUrlFromCat(categoryUrl);
    console.log("🚀 ~ getProductUrlsFromCat ~ productUrls:", productUrls);
  }
  return productUrls;
}

function getProductCompanyInfo(url) {
  return Axios({
    url,
    method: "get",
  })
    .then((res) => {
      if (res.indexOf('"companyName":"') != -1) {
        let substring = res.substring(res.indexOfEnd('"companyName":"'));
        let companyName = substring.substring(0, substring.indexOf('",'));
        return { success: true, data: companyName };
      } else {
        return { success: true, data: null };
      }
    })
    .catch((e) => {
      console.error(`获取采集品店铺名失败${url}`);
      console.error(e);
      return { success: false, data: null };
    });
}

const gatherProductService = {
  init(val) {
    sendResponse = val;
  },
  async gatherProductFromUrlList(urlList, ctoken) {
    return gatherProductFromUrlList(urlList, ctoken);
  },
  newGatherProductFormUrl(url, ctoken) {
    return newGatherProductFormUrl(url, ctoken);
  },
  async gatherProductFromCategoryUrl(categoryUrl, ctoken) {
    console.log(
      "🚀 ~ gatherProductFromCategoryUrl ~ categoryUrl:",
      categoryUrl
    );
    let productUrls = await getProductUrlsFromCat(categoryUrl);
    return gatherProductFromUrlList(productUrls, ctoken);
  },
  async getImageShieldInfo(url, ctoken) {
    let xsrfToken = await getXsrfToken();
    return getImageShieldInfo(url, ctoken, xsrfToken);
  },
  async postProductVideo(param, ctoken) {
    await getProductVideoCsrfToken();
    return await uploadProductVideo(param, ctoken);
  },
  async getProductDetailTemplate(param) {
    try {
      let detailTemplates = [];
      for (const id of param.ids) {
        const detailTemplate = await getProductDescriptionFromRequest(id);
        detailTemplates.push({ id, detailTemplate });
      }
      return detailTemplates;
    } catch (err) {
      console.log(`获取产品详情模板出错了`);
      return [];
    }
  },
  async checkProductShop(param) {
    console.log(param);
    let result = [];
    for (const item of param) {
      let { productId, url } = item;
      let data = await getProductCompanyInfo(url);
      if (!data.success) {
        break;
      }
      result.push({ productId, url, companyName: data.data });
    }
    console.log(result);
    return result;
  },
  getProductUrlsFromCat: getProductUrlsFromCat,
};

export default gatherProductService;
