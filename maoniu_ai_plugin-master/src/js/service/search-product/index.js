import { Axios } from "common";
import { getNested, isArrayLength, unique } from "util";
import axios from "axios";
import moment from "moment";
import qs from "qs";
import md5 from "js-md5";
import _ from "lodash";

export function getToken() {
  return new Promise((resolve) => {
    chrome.cookies.getAll(
      {
        domain: ".1688.com",
        name: "_m_h5_tk",
      },
      (cookies2) => {
        if (cookies2[0] && cookies2[0].value) {
          let token = cookies2[0].value.split("_")[0];
          resolve(token);
        }
        resolve(null);
      }
    );
  });
}

async function getOssUploadSecretKeyData() {
  const url =
    "https://open-s.alibaba.com/openservice/ossUploadSecretKeyDataService";
  let params = {
    appKey: "a5m1ismomeptugvfmkkjnwwqnwyrhpb1",
    appName: "magellan",
    _: new Date().getTime(),
  };
  return Axios({
    url,
    params,
  }).then((res) => {
    return getNested(res, "data");
  });
}
async function createFile(url, fileName) {
  console.log("before fetch");
  if (url && !url.startsWith("http")) {
    url = "http:" + url;
  }
  console.log(url);
  let response = await fetch(url);
  console.log("after fetch");
  let data = await response.blob();
  let metadata = {
    type: "image/jpeg",
  };
  let file = new File([data], fileName, metadata);
  return file;
}

function getRandomString(length) {
  let randomChars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += randomChars.charAt(
      Math.floor(Math.random() * randomChars.length)
    );
  }
  return result + ".jpg";
}

async function download(url, fileName) {
  let file = await createFile(url, fileName);
  return file;
}

async function uploadImage(url, ossUploadSecretKeyData = {}) {
  let uniqueName = getRandomString(32);
  let fileData = await download(url, uniqueName);
  let { policy, accessid, signature, host } = ossUploadSecretKeyData;

  let uploadUrl = host;
  const formData = new FormData();
  formData.append("name", uniqueName);
  formData.append("key", `icbuimgsearch/${uniqueName}`);
  formData.append("policy", policy);
  formData.append("OSSAccessKeyId", accessid);
  formData.append("success_action_status", 200);
  formData.append("signature", signature);
  formData.append("file", fileData);
  const config = {
    headers: {
      "content-type": "multipart/form-data",
    },
  };
  await Axios({
    url: uploadUrl,
    method: "post",
    config,
    data: formData,
  }).then((res) => {
    console.log(res);
  });
  return `/icbuimgsearch/${uniqueName}`;
}

async function searchProductByImageName(
  imageName,
  beginPage,
  categoryId,
  pageSize
) {
  const url =
    "https://open-s.alibaba.com/openservice/sourcenowImageSearchViewService";
  let params = {
    appKey: "a5m1ismomeptugvfmkkjnwwqnwyrhpb1",
    appName: "magellan",
    pageSize: pageSize,
    beginPage: beginPage,
    imageType: "oss",
    categoryId: categoryId,
    imageAddress: imageName,
    _: new Date().getTime(),
  };
  return Axios({
    url,
    params,
  }).then((res) => {
    console.log(res);
    return res;
  });
}
function urlToBase64(url) {
  return new Promise((resolve) => {
    fetch(url)
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
async function getSign(base64Suffix, timestamp) {
  const token = await getToken();
  const appKey = 12574478;
  const data = `{"imageBase64":"${base64Suffix}","appName":"searchImageUpload","appKey":"pvvljh1grxcmaay2vgpe9nb68gg9ueg2"}`;
  return md5(token + "&" + timestamp + "&" + appKey + "&" + data);
}
async function getImageInfo(base64) {
  const base64Suffix = base64.replace("data:image/jpeg;base64,", "");
  const timestamp = moment(new Date()).valueOf();
  const url =
    "https://h5api.m.1688.com/h5/mtop.1688.imageservice.putimage/1.0/";
  const sign = await getSign(base64Suffix, timestamp);
  const params = {
    jsv: "2.4.11",
    appKey: 12574478,
    t: timestamp,
    sign,
    api: "mtop.1688.imageService.putImage",
    ecode: 0,
    v: "1.0",
    type: "originaljson",
    dataType: "jsonp",
    "_bx-v": "1.1.20",
  };
  const form = {
    data: `{"imageBase64":"${base64Suffix}","appName":"searchImageUpload","appKey":"pvvljh1grxcmaay2vgpe9nb68gg9ueg2"}`,
  };
  return axios({
    url,
    method: "post",
    params,
    data: qs.stringify(form),
  })
    .then((res) => {
      if (res && res.status === 200) {
        return getNested(res, "data", "data");
      }
    })
    .catch((err) => {
      console.log(`获取getImageId出错了:${err}`);
    });
}

// async function get1688ImageSearchOfferTop5List(imageInfo) {
//     const results = [];
//     for (let i = 1; i <= 5; i++) {
//         const result = await get1688ImageSearchOfferList(imageInfo, i);
//         if (isArrayLength(result)) {
//             results.push(...result);
//         }
//     }
//     return results;
// }
function get1688ImageSearchOfferList(imageInfo, beginPage = 1) {
  const { imageId, requestId, sessionId } = imageInfo;
  const url = `https://search.1688.com/service/imageSearchOfferResultViewService`;
  const params = {
    tab: "imageSearch",
    imageAddress: "",
    imageId,
    imageIdList: imageId,
    pailitaoCategoryId: "",
    beginPage,
    pageSize: 40,
    requestId,
    pageName: "image",
    sessionId,
  };
  return Axios({
    url,
    method: "get",
    params,
  })
    .then((res) => {
      const offerList = getNested(res, "data", "data", "offerList");
      if (isArrayLength(offerList)) {
        return offerList;
      }
      return [];
    })
    .catch((err) => {
      console.log(`获取getImageSearchOfferResultViewService出错了:${err}`);
    });
}

const searchProductService = {
  async searchAliProductByImageUrl(param) {
    let { url, beginPage, categoryId, pageSize } = param;
    // ossUploadSecretKeyData
    let ossUploadSecretKeyData = await getOssUploadSecretKeyData();
    // upload image
    let imageName = await uploadImage(url, ossUploadSecretKeyData);
    // search product
    let result = await searchProductByImageName(
      imageName,
      beginPage,
      categoryId,
      pageSize
    );
    return result;
  },
  async searchAliProductBy1688ImageUrl(param) {
    const { imageUrl } = param;
    const base64 = await urlToBase64(imageUrl);
    const itemKey = "search-ali-product-by-1688-" + imageUrl;
    let imageInfo = JSON.parse(sessionStorage.getItem(itemKey));
    if (_.isEmpty(imageInfo)) {
      imageInfo = await getImageInfo(base64);
      sessionStorage.setItem(itemKey, JSON.stringify(imageInfo));
    }
    const offerList = await get1688ImageSearchOfferList(
      imageInfo,
      param.beginPage
    );
    return unique(offerList, "id");
  },
};
export default searchProductService;
