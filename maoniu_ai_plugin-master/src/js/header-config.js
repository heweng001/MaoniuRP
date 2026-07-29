import { URL_1688, URL_1688_IMAGE, URL_1688_PRODUCT } from "./const/1688-const";
import {
  ALI404,
  MESSAGE_UPLOAD_PIC_URL,
  MESSAGE_URL,
  ONE_TALK_URL,
  REFERER_URL,
  SHOWCASE_URL,
  URL_ACCOUNT_INFO,
  URL_BASE_REPORT,
  URL_CAMPAIGN,
  URL_DATA_OVERVIEW,
  URL_POSITION_DATA_LIST_AJAX,
  URL_FILEBROKER,
  URL_FILEBROKER_X_UPLOAD,
  URL_KEYWORDS_GROUP,
  URL_MARKETING,
  URL_PHOTOBANK,
  URL_POST_ALIBABA_PRODUCT,
  URL_SEARCH_RANK,
  URL_UPLOAD_FILE,
  WWW2_URL,
  WWW2_P4P_DATA_REPORT_URL,
} from "./const/ali-const";

export default {
  loadHandler(chrome) {
    chrome.webRequest.onBeforeSendHeaders.addListener(
      (details) => {
        const { url, requestHeaders, initiator } = details;
        // console.log(details);
        const urlLowerCase = url.toLowerCase();
        for (let i = 0; i < requestHeaders.length; i++) {
          const requestHeader = requestHeaders[i];
          const headerName = requestHeader.name.toLowerCase();
          // console.log(urlLowerCase, headerName);
          if (urlLowerCase.indexOf(WWW2_P4P_DATA_REPORT_URL) !== -1) {
            if (headerName === "origin") {
              requestHeaders[i].value = "https://www2.alibaba.com";
            }
            if (headerName === "referer") {
              requestHeaders[i].value =
                "https://www2.alibaba.com/ads/p4p_report.htm";
              break;
            }
          } else if (urlLowerCase.indexOf(WWW2_URL) !== -1) {
            if (headerName === "origin") {
              requestHeaders[i].value = "https://www2.alibaba.com";
              break;
            }
            // } else if (urlLowerCase.indexOf(SHOWCASE_URL) !== -1) {
            //   if (headerName === "origin") {
            //     requestHeaders[i].value = "https://showcase.alibaba.com";
            //     break;
            //   }
          } else if (
            urlLowerCase.indexOf(MESSAGE_UPLOAD_PIC_URL.toLowerCase()) !== -1
          ) {
            // 视频中心粉丝通选择视频请求指定url特殊处理
            if (headerName === "origin") {
              requestHeaders[i].value = "https://content.alibaba.com";
              requestHeaders.push({
                name: "referer",
                value: "https://content.alibaba.com/",
              });
              break;
            }
          } else if (
            urlLowerCase.indexOf(MESSAGE_URL) !== -1 ||
            urlLowerCase.indexOf(ONE_TALK_URL) !== -1
          ) {
            if (headerName === "origin") {
              requestHeaders[i].value = "https://message.alibaba.com";
              requestHeaders.push({
                name: "referer",
                value: "https://message.alibaba.com/message/default.htm",
              });
              break;
            }
          } else if (urlLowerCase.indexOf(URL_1688) !== -1) {
            if (headerName === "origin") {
              requestHeaders[i].value = "https://s.1688.com/";
              break;
            }
          } else if (
            urlLowerCase.indexOf(URL_MARKETING) !== -1 ||
            urlLowerCase.indexOf(URL_ACCOUNT_INFO) !== -1
          ) {
            if (headerName === "origin") {
              requestHeaders[i].value = "https://www2.alibaba.com";
              requestHeaders.push({
                name: "referer",
                value: "https://www2.alibaba.com/ads/index.htm",
              });
              break;
            }
          } else if (
            urlLowerCase.indexOf(URL_CAMPAIGN) !== -1 ||
            urlLowerCase.indexOf(URL_BASE_REPORT) !== -1
          ) {
            if (headerName === "origin") {
              requestHeaders[i].value = "https://www2.alibaba.com";
              requestHeaders.push({
                name: "referer",
                value: "https://www2.alibaba.com/base_report.htm",
              });
              break;
            }
          } else if (urlLowerCase.indexOf("https://acs.h.alibaba.com") !== -1) {
            if (headerName === "user-agent") {
              requestHeaders[i].value =
                "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1";
              break;
            }
          } else if (details.url.indexOf(REFERER_URL) !== -1) {
            requestHeaders.push({
              name: "referer",
              value: "https://post.alibaba.com/product/category.htm",
            });
            break;
          } else if (urlLowerCase.indexOf(ALI404) !== -1) {
            if (headerName === "origin") {
              requestHeaders[i].value = "https://www.ali404.com";
              requestHeaders.push({
                name: "referer",
                value: "https://www.ali404.com/",
              });
              break;
            }
          } else if (urlLowerCase.indexOf(URL_SEARCH_RANK) !== -1) {
            console.log("inner listener");
            if (headerName === "origin") {
              requestHeaders[i].value = "https://hz-productposting.alibaba.com";
              requestHeaders.push({
                name: "referer",
                value:
                  "https://hz-productposting.alibaba.com/product/ranksearch/rankSearch.htm",
              });
              break;
            }
          } else if (urlLowerCase.indexOf(URL_UPLOAD_FILE) !== -1) {
            if (headerName === "origin") {
              requestHeaders[i].value = "https://hz-productposting.alibaba.com";
              requestHeaders.push({
                name: "referer",
                value: " https://hz-productposting.alibaba.com/",
              });
              break;
            }
          } else if (urlLowerCase.indexOf(URL_POST_ALIBABA_PRODUCT) !== -1) {
            if (headerName === "origin") {
              requestHeaders[i].value = "https://post.alibaba.com";
              requestHeaders.push({
                name: "referer",
                value: "https://post.alibaba.com/product/publish.htm",
              });
              break;
            }
          } else if (urlLowerCase.indexOf(URL_1688_IMAGE) !== -1) {
            if (headerName === "origin") {
              requestHeaders[i].value = "https://s.1688.com";
              requestHeaders.push({
                name: "referer",
                value: "https://s.1688.com/",
              });
              break;
            }
          } else if (urlLowerCase.indexOf(URL_1688_PRODUCT) !== -1) {
            if (headerName === "origin") {
              const host = localStorage.getItem("product1688Host");
              requestHeaders.push({ name: "referer", value: host + "/" });
              break;
            }
          } else if (urlLowerCase.indexOf(URL_DATA_OVERVIEW) !== -1) {
            if (headerName === "origin") {
              requestHeaders[i].value = "https://data.alibaba.com";
              requestHeaders.push({
                name: "referer",
                value: "https://data.alibaba.com/adviser/keyword?page=detail",
              });
              break;
            }
          } else if (urlLowerCase.indexOf(URL_KEYWORDS_GROUP) !== -1) {
            requestHeaders.push({
              name: "referer",
              value: "https://data.alibaba.com/adviser/keyword?page=detail",
            });
            break;
          }
          // 从图片银行上传图片时的接口，需要带上 Origin 和 Referer
          else if (urlLowerCase.indexOf(URL_FILEBROKER_X_UPLOAD) !== -1) {
            if (headerName === "origin") {
              // initiator 存在且为http时使用 initiator 的值为 origin 和 referer

              const value = initiator?.startsWith("http")
                ? initiator
                : URL_PHOTOBANK;
              requestHeaders[i].value = value;
              requestHeaders.push({
                name: "referer",
                value: value,
              });
              break;
            }
          } 
          else if (urlLowerCase.indexOf(URL_PHOTOBANK) !== -1) {
            if (headerName === "origin") {
              requestHeaders[i].value = "https://photobank.alibaba.com";
              requestHeaders.push({
                name: "referer",
                value: "https://photobank.alibaba.com/uploader.htm?appKey=appkey_1ro7ddta&openPostMessage=1",
              });
              break;
            }
          }
          else if (urlLowerCase.indexOf(URL_POSITION_DATA_LIST_AJAX) !== -1) {
            requestHeaders.push({
              name: "referer",
              value:
                "https://profile.alibaba.com/profile/detail_buyer_select.htm",
            });
            break;
          }
          // 从产品编辑页面上上传图片时的接口，不作处理
          else if (
            urlLowerCase.indexOf("https://filebroker.alibaba.com/t/upload") !==
            -1
          ) {
            // todo
          }
          // else if (
          //   urlLowerCase.indexOf(
          //     "https://crmweb.alibaba.com/rightcenter/right/supplierIdentity.json".toLowerCase()
          //   ) !== -1
          // ) {
          //   if (headerName === "origin") {
          //     const originReferer = "https://i.alibaba.com";
          //     requestHeaders[i].value = originReferer;
          //     requestHeaders.push({
          //       name: "referer",
          //       value: originReferer,
          //     });
          //     break;
          //   }
          // }
        }
        return { requestHeaders };
      },
      {
        urls: [
          ONE_TALK_URL + "*",
          WWW2_P4P_DATA_REPORT_URL + "*",
          WWW2_URL + "*",
          SHOWCASE_URL + "*",
          MESSAGE_URL + "*",
          URL_1688 + "*",
          REFERER_URL + "*",
          URL_MARKETING + "*",
          URL_CAMPAIGN + "*",
          URL_BASE_REPORT + "*",
          URL_ACCOUNT_INFO + "*",
          URL_SEARCH_RANK + "*",
          URL_POST_ALIBABA_PRODUCT + "*",
          URL_UPLOAD_FILE + "*",
          URL_KEYWORDS_GROUP + "*",
          URL_1688_IMAGE + "*",
          URL_1688_PRODUCT + "*",
          URL_DATA_OVERVIEW + "*",
          URL_FILEBROKER + "*",
          URL_POSITION_DATA_LIST_AJAX + "*",
          URL_PHOTOBANK + "*",
          // "https://crmweb.alibaba.com/*",
        ],
      },
      ["blocking", "requestHeaders", "extraHeaders"]
    );
  },
};

// function uploaderAppkey(e) {
//   e = e || 6;             // 如果未传入参数，默认长度为 6
//   if (e < 0) e = 6;       // 最小长度限制
//   if (e > 16) e = 16;     // 最大长度限制为 16（因为 36 进制最多能提供 16 位有效字符）
//   return Math.random().toString(36).slice(2, e + 2);
// }
