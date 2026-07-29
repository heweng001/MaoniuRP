import productService from "@/js/ali_service/product-service";
import axios from "axios";
import { getNested } from "util";
import imageProcessService from "../image-process-service";
import { Axios } from "@/js/common";
import { URL_FILEBROKER_X_UPLOAD } from "@/js/const/ali-const";
import sleep from "@/js/util/sleep";

const BASE64_MARKER = ";base64,";

function isDataURI(url) {
  return url.split(BASE64_MARKER).length === 2;
}

async function urlToFile(url) {
  if (!url.startsWith("http")) {
    url = "https:" + url;
  }
  try {
    const response = await fetch(url);
    // here image is url/location of image
    const blob = await response.blob();
    const file = new File([blob], "image.jpg", { type: blob.type });
    return file;
  } catch (e) {
    console.error(e);
  }
}

function uploadFileToAli(file) {
  const formData = new FormData();
  formData.append("bizCode", "icbu_photobank");
  formData.append("file", file);
  const config = {
    headers: {
      "content-type": "multipart/form-data",
    },
  };
  return axios({
    url: URL_FILEBROKER_X_UPLOAD,
    method: "post",
    config,
    data: formData,
  }).then((res) => {
    return res.data;
  });
}

async function uploadUrlToAli(url) {
  let file = await urlToFile(url);
  return uploadFileToAli(file);
}

// function getUploadErrorMessage(res) {
//   const message = getNested(res, "message");
//   return message;
// }

async function tryUploadFileToPhotoBank(ctoken, sourceUrl, groupId, imageName, domain, autoCompress) {
  let res
  for (let j = 1; j <= 5; j++) {
    res = await uploadImageService.uploadUrlToPhotoBank(
        ctoken,
        sourceUrl,
        groupId,
        imageName,
        domain,
        autoCompress,
    );
    if (res == undefined || res.reason === "302") {
      await sleep(1000);
    } else {
      break;
    }
  }
  let { success, message, newUrl } = res;
  if (success) {
    return {success: true, message: "", newUrl};
  } else {
    console.log(`${sourceUrl} 上传图片失败了: ${message}`);
  }
  return {success: true, message: "", newUrl: sourceUrl};
}

async function uploadUrlToPhotoBank(
  ctoken,
  sourceUrl,
  groupId,
  imageName,
  domain,
  autoCompress
) {
  let response = await uploadUrlToAli(sourceUrl);
  // eslint-disable-next-line no-unused-vars
  let { code, filename, hash, height, size, url, width } = response;
  if (!url) {
    // 忽略异常图片
    return { success: true, message: "", newUrl: "" };
  }
  let imgListData = [
    {
      displayName: imageName,
      fileMd5: hash,
      filename: filename,
      groupId,
      photoUrl: url,
      photobankImageMetadata: {
        hashCode: hash,
        height: height,
        size: size,
        width: width,
      },
    },
  ];
  const photobankImageWatermark = {
    frame: "Y",
    position: "center",
    watermarkContent: "",
  };
  let data = {
    groupId,
    imgListData,
    photobankImageWatermark,
    useWatermark: false,
  };
  let params = {
    ctoken,
  };
  return Axios({
    url: "https://photobank.alibaba.com/fetch/bank/photo/upload",
    method: "post",
    data,
    params,
    maxRedirects: 0
  })
    .then(async (res) => {
      console.log(res)
      // check if response status code is 302
      if (res === undefined) {
        return { success: true, message: "", newUrl: "", reason: "302" };
      }
      let success = getNested(res, "isSuccess");
      if (!success) {
        const { errorCode, message } = res;
        if (errorCode === "SIZE_TOO_LARGE") {
          // 当上传图片大小过大时是否自动压缩
          if (autoCompress) {
            return await imageProcessService
              .compressImageByUrl(sourceUrl, domain)
              .then(async (res) => {
                const { data } = res;
                console.error(`${message}: ${sourceUrl}, compress to ${data}`);
                return await uploadUrlToPhotoBank(
                  ctoken,
                  data,
                  groupId,
                  imageName
                );
              })
              .catch(() => {
                return { success: false, message };
              });
          } else {
            return { success: false, message };
          }
        }
        let url = getNested(res, "data", "duplicateList", "0", "photoUrl");
        if (url) {
          return { success: true, message: "", newUrl: url };
        }
        return { success: false, message };
      } else {
        let photoUrl = getNested(res, "data", "list", "0", "photoUrl");
        if (!photoUrl) {
          photoUrl = getNested(res, "data", "uploadList", "0", "photoUrl");
        }
        return { success: true, message: "", newUrl: photoUrl };
      }
    })
    .catch((err) => {
      console.error(err);
      return { success: true, message: "", newUrl: "" };
    });
}

function dataURItoFile(dataURI, fileName) {
  if (!isDataURI(dataURI)) {
    return false;
  }

  // Format of a base64-encoded URL:
  // data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAYAAAAEOCAIAAAAPH1dAAAAK
  const mime = dataURI.split(BASE64_MARKER)[0].split(":")[1];
  const filename = fileName;
  const bytes = atob(dataURI.split(BASE64_MARKER)[1]);
  const writer = new Uint8Array(new ArrayBuffer(bytes.length));

  for (let i = 0; i < bytes.length; i++) {
    writer[i] = bytes.charCodeAt(i);
  }
  return new File([writer.buffer], filename, { type: mime });
}

const uploadImageService = {
  async uploadImageUrlArray(
    ctoken,
    urls,
    groupId,
    model,
    ignoreExists,
    domain,
    autoCompress
  ) {
    let result = [];
    // 判断图片是已经存在图片银行，存在的图片不再重复上传节省时间
    if (ignoreExists) {
      const imgContent = urls
        ?.map((item) => `<img src="${item}" width="750" />`)
        .join("");
      await productService
        .ajaxValidateDescriptionImage(ctoken, imgContent)
        .then((res) => {
          const { errorMessage, errorType, existInvalidImageList } = res;
          if (existInvalidImageList) {
            console.log(errorMessage, errorType, existInvalidImageList);
            // 过滤掉有效的图片，保留失效的图片
            urls = urls.filter((url) => {
              if (
                existInvalidImageList?.find((eImg) => url?.startsWith(eImg))
              ) {
                return true;
              }
              result.push({
                oldUrl: url,
                newUrl: url,
                success: true,
                message: "",
              });
              return false;
            });
          } else {
            // 不存在失效图片
            urls = [];
          }
        });
    }

    let promiseArray = [];
    for (const [index, url] of urls.entries()) {
      let imageName = `${model}(${index})`;

      let res = {};
      for (let i = 1; i <= 5; i++) {
        res = await uploadUrlToPhotoBank(
          ctoken,
          url,
          groupId,
          imageName,
          domain,
          autoCompress
        );
        if (res == undefined || res.reason === "302") {
          await sleep(1000);
        } else {
          break;
        }
      }
      let { success, message, newUrl } = res;
      result.push({ oldUrl: url, newUrl, success, message });
    }
    await Promise.all(promiseArray);
    return result;
  },
  uploadFile(base64) {
    let file = dataURItoFile(base64, "temp.png");
    return uploadFileToAli(file);
  },
  uploadUrlToAli(url) {
    return uploadUrlToAli(url);
  },
  dataURItoFile(base64, name) {
    let file = dataURItoFile(base64, name);
    return file;
  },
  uploadUrlToPhotoBank,
  tryUploadFileToPhotoBank,
};

export default uploadImageService;
