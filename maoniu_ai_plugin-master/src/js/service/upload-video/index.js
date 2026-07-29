import axios from "axios";
import { getNested } from "util";
import uploadImageService from "@/js/service/upload-image";
import { Axios } from "common";
import qs from "qs";

let csrfToken;
async function getToken(ctoken) {
  return axios({
    url: "https://hz-productposting.alibaba.com/product/asyQueryToken.do",
    method: "get",
    params: {
      ctoken,
    },
  }).then((res) => {
    console.log(res);
    return getNested(res, "data", "data", "token");
  });
}

async function uploadMedia(file, token) {
  const formData = new FormData();
  formData.append("name", file.name);
  formData.append("size", file.size);
  formData.append("md5", "");
  formData.append("dir", "");
  formData.append("file", file);
  return axios({
    url: "https://upload.media.aliyun.com/api/proxy/upload.json",
    method: "post",
    headers: {
      "content-type": "multipart/form-data",
      authorization: token,
    },
    data: formData,
  }).then((res) => {
    return getNested(res, "data");
  });
}

async function getVideoDuration(videoUrl) {
  const audio = new Audio(videoUrl);
  const result = await new Promise((resolve) => {
    audio.addEventListener("loadeddata", () => {
      resolve(audio.duration);
    });
  });
  return result;
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

// function getProductVideoCsrfToken() {
//     return Axios({
//         url: `https://hz-productposting.alibaba.com/product/videobank/upload.htm`,
//         method: "get"
//     }).then(res => {
//         if (res) {
//             const data = res
//             const start = "csrfToken: '";
//             const end = "',";
//             const node = data.substring(data.indexOfEnd(start));
//             csrfToken = node.substring(0, node.indexOf(end));
//         }
//     }).catch(err => {
//         console.log(`获取getProductVideoCsrfToken出错了:${err}`)
//     })
// }

function postProductVideo(fileInfo, videoName, ctoken) {
  const params = {
    ctoken,
  };
  const form = {
    event: "saveVideo",
    postVideo: `{"uploadId":"${fileInfo.fileId}","fileSize":${
      fileInfo.fileSize
    },"duration":${fileInfo.duration},"videoName":"${videoName}","coverUrl":"${
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
      console.log(res);
      if (res && res.success) {
        return { success: true, data: res.data };
      }
      return { success: false, message: getNested(res, "message") };
    })
    .catch((err) => {
      console.log(`上传产品视频出错了:${err}`);
      return { success: false, message: "上传产品视频失败" };
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

const uploadVideoService = {
  async uploadFileToAli(file, ctoken) {
    let token = await getToken(ctoken);
    let fileInfo = await uploadMedia(file, token);
    console.log(fileInfo);
    return fileInfo;
  },
  async uploadVideoToVideoBank(param, ctoken) {
    try {
      console.log(param);
      let { name, url } = param;
      let dataUrl = await urlToBase64(url);
      let file = uploadImageService.dataURItoFile(dataUrl, name);
      let fileInfo = await this.uploadFileToAli(file, ctoken);
      //获取视频时长
      fileInfo.duration = await getVideoDuration(fileInfo.url);
      //获取封面图片
      await getProductVideoCover(fileInfo);
      //上传产品视频
      const result = await postProductVideo(fileInfo, name, ctoken);
      return result;
    } catch (e) {
      console.error(e);
      return { success: false, message: "上传视频过程中出现了异常" };
    }
  },
};

export default uploadVideoService;
