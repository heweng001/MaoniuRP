import aliService from "aliService";
import { Axios } from "common";
import {
  delay,
  getNested,
  isJson,
  isObject,
  isString,
  partition,
} from "util/index";
import { AI } from "./api";
// import {ALI_REPORT} from "@/js/service/report/api";
import axios from "axios";
import qs from "qs";
// import sleep from "util/sleep";
// import {log} from "logan-web";

let currentScore = 0;
function infoProgress(port, score) {
  currentScore += score;
  if (port) {
    port.postMessage({ moduleName: "同行关键词", progress: currentScore });
  }
}
function resetScore() {
  currentScore = 0;
}

// eslint-disable-next-line no-unused-vars
async function doKeywordCategory(records, ctoken, href) {
  let promiseArr = [];
  records.forEach((item) => {
    promiseArr.push(
      aliService.getCategoryByKeyword(
        { keyword: item.name, ctoken, language: "en_us" },
        item.id
      )
    );
    promiseArr.push(
      aliService.getCategoryByKeyword(
        { keyword: item.name, ctoken, language: "zh_cn" },
        item.id
      )
    );
  });
  return Promise.all(promiseArr).then((res) => {
    let hash = new Map();
    res.forEach((item) => {
      hash.set(
        item.keywordId,
        Object.assign(hash.get(item.keywordId) || {}, item)
      );
    });
    let result = Array.from(hash.values());
    // 批量更新
    // await batchUpdateCategory(result, href);
    return result;
  });
}

function doKeywordRank(records, href, type) {
  let promiseArr = [];
  records.forEach((item) => {
    promiseArr.push(
      aliService.getRankByKeyword(
        { queryString: item.name },
        item.id,
        type,
        true
      )
    );
  });
  return Promise.all(promiseArr).then(async (res) => {
    let errorData = res.filter((item) => item.retry);
    let successData = res.filter((item) => !item.retry);
    let finalData = [];
    finalData.push(...successData);
    if (errorData && errorData.length > 0) {
      let retryData = await doKeywordRankRetry(errorData);
      finalData.push(...retryData);
    }
    if (type && type === "doubleTraffic") {
      return finalData;
    }
    try {
      // 批量更新
      await batchUpdateRank(finalData, href);
    } catch (e) {
      console.log("更新排名出错：" + e);
      // ignore
    }
  });
}
async function doKeywordRankRetry(datas) {
  let resultArr = [];
  for (let data of datas) {
    let result = await aliService.getRankByKeyword(
      { queryString: data.keyword },
      data.keywordId,
      data.type,
      false
    );
    resultArr.push(result);
    await delay(1000);
  }
  return resultArr;
}

async function doGatherHotSearchWord(keyword, ctoken, result, page = 1) {
  let data = await gatherHotSearchWordPage(keyword, ctoken, page);
  if (Array.isArray(data)) {
    data.forEach((item) => {
      item.stem = keyword;
      result.push(item);
    });
  }
  if (data && data.length && data.length === 100 && page < 50) {
    await doGatherHotSearchWord(keyword, ctoken, result, ++page);
  }
}
function getKeywordsGroupList(ctoken) {
  const url = "https://data.alibaba.com/json/myKeywordGroup/getAllGroup";
  const params = {
    ctoken,
  };
  return axios({
    url,
    method: "get",
    params,
  })
    .then((res) => {
      const groupList = getNested(res, "data", "returnValue");
      if (groupList && groupList.length) {
        return groupList.map((m) => {
          return {
            id: m.id,
            groupName: m.groupName,
            kwCount: m.kwCount,
          };
        });
      }
      return [];
    })
    .catch((err) => {
      console.log(`获取选词参谋关键词分组失败了:${err}`);
    });
}

function getCsrfToken() {
  const url = "https://data.alibaba.com/adviser/keyword";
  return axios({
    url,
    method: "get",
  })
    .then((res) => {
      res = res.data;
      const start = "window.csrfToken = '";
      const end = "';";
      const csrfTokenNode = res.slice(res.indexOfEnd(start));
      return csrfTokenNode.slice(0, csrfTokenNode.indexOf(end));
    })
    .catch((err) => {
      console.log(`获取加入词库csrfToken失败了${err}`);
    });
}

async function addMyKeywordLibrary(param, ctoken) {
  const url = "https://data.alibaba.com/json/myKeyword/addKeywords";
  const p_csrf = await getCsrfToken();
  const params = {
    ctoken,
    p_csrf,
  };
  const form = {
    keywordInfos: JSON.stringify(param.keywordInfos),
    pageKey: "cateWordPage",
  };
  return axios({
    url,
    method: "post",
    params,
    data: qs.stringify(form),
  })
    .then((res) => {
      return getNested(res, "data", "successed");
    })
    .catch((err) => {
      console.log(`加入关键词库失败了:${err}`);
    });
}

function gatherHotSearchWordPage(keyword, ctoken, page) {
  const url = "https://hz-mydata.alibaba.com/self/.json";
  let params = {
    isVip: true,
    action: "OneAction",
    iName: "vip/kwIndex/searchWords",
    pageSize: 100,
    pageNO: page,
    queryRaw: keyword,
    nd: "30d",
    orderBy: "",
    order: "",
    terminalType: "TOTAL",
    countryId: "TOTAL",
    cateLv3Id: "",
    ctoken: ctoken,
  };
  return Axios({
    url,
    method: "get",
    params,
  })
    .then((res) => {
      console.log(res);
      return res.data;
    })
    .catch((err) => {
      console.log(`获取gatherHotSearchWordPage出错了${err}`);
    });
}
// function getKeywordRankPage(obj, _csrf_token_) {
//   const url = `https://hz-productposting.alibaba.com/product/ranksearch/rankSearch.htm`
//   const form = {
//     _csrf_token_,
//     queryString: obj.name
//   }
//   return Axios({
//     url,
//     method: "post",
//     data: qs.stringify(form)
//   }).then(res => {
//     const domParser = new DOMParser()
//     const parseFromString = domParser.parseFromString(res, "text/html")
//     const node = parseFromString.querySelector("div.table-box-main.search-table");
//     const keywordId = obj.id
//     const keyword = obj.name
//     let rank
//     let rankIndex
//     let rankOrder
//     let rankProduct
//     let rankProductImg
//     let rankProductId
//     if (node) {
//       const tableTrNodes = node.querySelectorAll("tbody > tr")
//       if (tableTrNodes.length) {
//         const firstNode = tableTrNodes[0]
//         const rankNode = firstNode.querySelector("td.ranking")
//         if (rankNode && rankNode.innerText) {
//           const rankText = rankNode.innerText.trim()
//           const reg = /[1-9][0-9]*/g
//           const rankInfo = rankText.match(reg)
//           if (rankInfo && rankInfo.length === 2) {
//             rank = +rankInfo[0]
//             rankIndex = +rankInfo[1]
//             rankOrder = +((rank - 1) * 50 + rankIndex)
//           }
//           const product = firstNode.querySelector("td.products > a")
//           if (product && product.innerText) {
//             rankProduct = product.innerText.trim()
//           }
//           if (product && product.getAttribute("href")) {
//             const url = product.getAttribute("href")
//             if (url.indexOf("id=") !== -1) {
//               const start = url.indexOf("id=") + 3
//               const end = url.trim().length + 1
//               if (start && end) {
//                 rankProductId = +(url.slice(start, end))
//               }
//             }
//           }
//           const productInfo = firstNode.querySelector("td.products > div.img > a > img")
//           if (productInfo && productInfo.getAttribute("src")) {
//             rankProductImg = productInfo.getAttribute("src")
//           }
//         }
//       }
//     }
//     return {
//       keywordId,
//       keyword,
//       rank,
//       rankIndex,
//       rankOrder,
//       rankProduct,
//       rankProductImg,
//       rankProductId
//     }
//   }).catch(err => {
//     console.log(`获取getKeywordRankPage出错了:${err}`)
//   })
// }

const keywordService = {
  async getCategoryByKeyword(param, ctoken, href) {
    let { all } = param;
    if (all) {
      let result = await getTotalPagesByParam(param, href);
      let { pages, records } = result;
      console.log("result...", result);
      // 先判断是否session已经过期
      if (records && records.length > 0) {
        let res = await aliService.getCategoryByKeyword(
          { keyword: records[0].name, ctoken, language: "en_us" },
          records[0].id
        );
        if (!res) {
          return {
            success: false,
            message: "会话已经过期，请重新登录阿里国际站。",
          };
        } else if (
          isObject(res) &&
          Object.hasOwn(res, "success") &&
          !res.success
        ) {
          return res;
        }
        let globalPromiseArr = [];
        let allCategotyPromise = await doKeywordCategory(records, ctoken, href);
        globalPromiseArr.push(allCategotyPromise);
        return Promise.all(globalPromiseArr).then((res) => {
          return { success: true, data: res, message: "" };
        });
      }
      let globalPromiseArr = [];
      for (let i = 2; i <= pages; i++) {
        let result = await getTotalPagesByParam(param, href, {
          size: 100,
          current: i,
        });
        let { records } = result;
        globalPromiseArr.push(doKeywordCategory(records, ctoken, href));
        await delay(10000);
      }
      return Promise.all(globalPromiseArr).then((res) => {
        return { success: true, data: res, message: "" };
      });
    } else {
      let res = await aliService.getCategoryByKeyword(
        { keyword: param.objs[0].name, ctoken, language: "en_us" },
        param.objs[0].id
      );
      if (!res) {
        return {
          success: false,
          message: "会话已经过期，请重新登录阿里国际站。",
        };
      }
      let globalPromiseArr = [];
      globalPromiseArr.push(doKeywordCategory(param.objs, ctoken, href));
      return Promise.all(globalPromiseArr).then((res) => {
        return { success: true, data: res, message: "" };
      });
    }
  },
  async getRankByKeyword(param, href, extensions) {
    let { all } = param;
    if (all) {
      let result = await getTotalPagesByParam(param, href);
      let { pages, records } = result;
      // 先判断是否session已经过期
      if (records && records.length > 0) {
        let res = await aliService.getRankByKeyword(
          { queryString: records[0].name },
          records[0].id
        );
        if (
          isString(res) &&
          res.trim().toLowerCase() ===
            "system busy now, pleasy try it again later."
        ) {
          return { success: false, message: "系统繁忙，请稍后再试。" };
        } else if (!res) {
          return {
            success: false,
            message: "会话已经过期，请重新登录阿里国际站。",
          };
        } else if (Object.hasOwn(res, "success") && !res.success) {
          return { success: false, message: res.message };
        }
        await doKeywordRank(records, href);
      }
      let globalPromiseArr = [];
      for (let i = 2; i <= pages; i++) {
        let result = await getTotalPagesByParam(param, href, {
          size: 100,
          current: i,
        });
        let { records } = result;
        globalPromiseArr.push(doKeywordRank(records, href));
        await delay(10000);
      }
      return Promise.all(globalPromiseArr).then(() => {
        return { success: true, message: "" };
      });
    } else {
      let res = await aliService.getRankByKeyword(
        { queryString: param.objs[0].name },
        param.objs[0].id
      );
      if (!res) {
        return {
          success: false,
          message: "会话已经过期，请重新登录阿里国际站。",
        };
      } else if (Object.hasOwn(res, "success") && !res.success) {
        return { success: false, message: res.message };
      }
      let globalPromiseArr = [];
      let partitionArr = partition(param.objs, 50);
      let extensionArr = [];
      for (let i = 0; i < partitionArr.length; i++) {
        if (extensions && extensions === "doubleTraffic") {
          extensionArr.push(
            ...(await doKeywordRank(partitionArr[i], href, extensions))
          );
        } else {
          globalPromiseArr.push(await doKeywordRank(partitionArr[i], href));
        }
        await delay(5000);
      }
      if (extensions && extensions === "doubleTraffic") {
        return extensionArr;
      } else {
        return Promise.all(globalPromiseArr).then(() => {
          return { success: true, message: "" };
        });
      }
    }
  },
  async getRankByKeywordNew(param, href, ctoken) {
    console.log(ctoken, "ctoken");
    const { all, objs } = param;
    if (all) {
      const result = await getTotalPagesByParam(param, href);
      const { pages, records } = result;
      console.log(pages, records);
      const keywordsPromise = [];
      for (let i = 1; i <= pages; i++) {
        const keywords = getTotalPagesByParam(param, href, {
          size: 100,
          current: i,
        });
        keywordsPromise.push(keywords);
      }
      const keywords = (await Promise.all(keywordsPromise))
        .map((m) => m.records)
        .flat();
      const keywordObjs = keywords.map((m) => {
        return {
          id: m.id,
          name: m.name,
        };
      });
      return await updateKeywordsRank(keywordObjs, ctoken, href);
    } else {
      return await updateKeywordsRank(objs, ctoken, href);
    }
  },
  async queryCategoryByKeyword(param, ctoken) {
    return await aliService.queryCategoryByKeyword({ keyword: param, ctoken });
  },
  async queryKeywordByGroups(param, href, keywordPort) {
    console.log("queryKeywordByGroups");
    resetScore();
    keywordPort.postMessage({ showQueryKeywordByGroupsCard: true });
    if (param.prefix.includes(".m")) {
      param.prefix = param.prefix.replace(".m", "");
    }
    if (param.prefix.includes("www.")) {
      param.prefix = param.prefix.replace("www.", "");
    }
    let groups = param.groups;
    console.log("groups", groups);
    let result = [];
    let error = {
      errGroup: null,
      errPage: null,
      errArray: [],
    };
    // let errorProductDetailUrl;
    let groupIndex = 0;
    let pageIndex = 1;
    if (param.retryInfo) {
      groupIndex = param.retryInfo.errGroup;
      pageIndex = param.retryInfo.errPage;
    }
    for (groupIndex; groupIndex < groups.length; groupIndex++) {
      let group = groups[groupIndex];

      let url = param.prefix + group.url;

      let pages = await getGroupPage(url);

      if (pages) {
        for (pageIndex; pageIndex <= pages; pageIndex++) {
          let globalPromiseArr = [];
          let id = url.match(/(productgrouplist-\d+)/)[0];
          let childUrl = url.replace(id, `${id}-${pageIndex}`);
          let arr = await getPageDetailUrlByGroupUrl(childUrl);
          for (let item of arr) {
            globalPromiseArr.push(
              getPageDetailKeyword(
                item,
                group.name,
                param.shopName,
                param.export
              )
            );
            infoProgress(keywordPort, 100 / groups.length / pages / arr.length);
          }
          await globalPromiseArr.map((item) => {
            return item
              .then((res) => {
                result.push(...res);
              })
              .catch((err) => {
                if (!error.errGroup) error.errGroup = groupIndex;
                if (!error.errPage) error.errPage = pageIndex;
                error.errArray.push(err);
              });
          });
          // await Promise.all(globalPromiseArr).then(res => {
          //   for(let item of res){
          //     result.push(...item)
          //   }
          // });
          // 一次搜集5000条记录，以免插件崩溃
          if (result.length >= 4000) {
            break;
          }
          // 分组选择大于等于10，则延迟5秒，尽量避免阿里出现验证码
          // if (groups.length >= 10) {
          await delay(5000);
          // } else {
          //   await delay(2000);
          // }
        }
      }
      // 一次搜集5000条记录，以免插件崩溃
      if (result.length >= 4000) {
        break;
      }
    }
    // await batchUpdatePeerKeyword(result, href);
    keywordPort.postMessage({ closeQueryKeywordByGroupsCard: true });

    let message = `成功抓取${result.length}条产品关键词数据`;
    if (error.errArray.length > 0) {
      message += `，失败${error.errArray.length}条，原因是阿里出验证码，请前往阿里页面解除验证码再操作`;
    }
    let res = {
      succ: result,
      err: error,
    };
    return {
      success: true,
      message,
      data: res,
    };
  },
  async queryGroup(param) {
    let url = param.url + "/productlist.html";
    return await getGroupByUrl(url);
  },
  // eslint-disable-next-line no-unused-vars
  async queryPeerKeyword(param, href) {
    let url = param.url + "/productlist.html";
    let obj = await getTotalProductPage(url);
    let map = obj.map;
    let result = [];
    for (let i = 1; i <= obj.totalPage; i++) {
      let globalPromiseArr = [];
      url = param.url + `/productlist-${i}.html`;
      let arr = await getPageDetailUrl(param.url, url);
      for (let item of arr) {
        globalPromiseArr.push(
          getPageDetailKeyword(item.url, map.get(item.id), param.name)
        );
      }
      await Promise.all(globalPromiseArr).then((res) => {
        result.push(...res);
      });
      await delay(2000);
    }
    return result;
  },
  // eslint-disable-next-line no-unused-vars
  async gatherHotSearchWord(ctoken, param, sendResponse, progressPort) {
    let keywordArray = param.split(",");
    let result = [];
    try {
      for (let keyword of keywordArray) {
        let eachWordResult = [];
        await doGatherHotSearchWord(keyword, ctoken, eachWordResult);
        result.push(...eachWordResult);
      }
      sendResponse({ success: true, message: "", data: result });
    } catch (e) {
      console.log(`获取关键词指数出错了${e}`);
      sendResponse({ success: false, message: "出错了请稍后再试" });
    }
  },
  async getKeywordsGroup(ctoken) {
    return await getKeywordsGroupList(ctoken);
  },
  async postMyKeywordLibrary(param, ctoken) {
    return await addMyKeywordLibrary(param, ctoken);
  },
  async getRankInfo(param, href, ctoken) {
    const keywordRankInfo = await getKeywordRankInfo([param], ctoken);
    return { success: true, data: keywordRankInfo };
  },
};

async function getGroupByUrl(url) {
  return Axios({
    method: "get",
    url,
  })
    .then((res) => {
      let parser = new DOMParser();
      let htmlParser = parser.parseFromString(res, "text/html");
      let divArr = htmlParser.querySelectorAll(".grid.grid220 > div");
      if (divArr) {
        for (let i = 0; i < divArr.length; i++) {
          let module_title = divArr[i].getAttribute("module-title");
          if (module_title.trim().toLowerCase() === "productgroups") {
            let dataStr = divArr[i].getAttribute("module-data");
            let data = JSON.parse(decodeURIComponent(dataStr));
            let groups = data.mds.moduleData.data.groups;
            let levelOne = { label: "一级分组", options: [] };
            let levelTwo = { label: "二级分组", options: [] };
            for (let item of groups) {
              let value = item.url;
              let label = item.name;
              levelOne.options.push({ value, label });
              if (item.children.length > 0) {
                for (item of item.children) {
                  let value = item.url;
                  let label = item.name;
                  levelTwo.options.push({ value, label });
                }
              }
            }
            return [levelOne, levelTwo];
          }
        }
      }
    })
    .catch((err) => {
      console.log("错误:" + err);
      return [];
    });
}
async function getGroupPage(url) {
  return Axios({
    method: "get",
    url,
  })
    .then((res) => {
      let parser = new DOMParser();
      let htmlParser = parser.parseFromString(res, "text/html");
      const elementNode = htmlParser.querySelector(
        'div[module-title="productListPc"]'
      );
      const elementAttr = elementNode.getAttribute("module-data");
      let objs = unescape(elementAttr);
      if (isJson(objs)) {
        objs = JSON.parse(objs);
      }
      const total = getNested(
        objs,
        "mds",
        "moduleData",
        "data",
        "pageNavView",
        "totalLines"
      );
      const page = getNested(
        objs,
        "mds",
        "moduleData",
        "data",
        "pageNavView",
        "pageLines"
      );
      if (total && page) {
        return total % page === 0 ? total / page : total / page + 1;
      } else {
        return null;
      }
    })
    .catch((err) => {
      console.log("错误:" + err);
      return 0;
    });
}
async function getTotalProductPage(url) {
  return Axios({
    method: "get",
    url,
  })
    .then((res) => {
      let parser = new DOMParser();
      let htmlParser = parser.parseFromString(res, "text/html");
      let linkArr = htmlParser.querySelectorAll(".next-pagination-pages a");
      let divArr = htmlParser.querySelectorAll(".grid.grid220 > div");
      let dataStr = divArr[3].getAttribute("module-data");
      let data = JSON.parse(decodeURIComponent(dataStr));
      let groupArr = data.mds.moduleData.data.groups;
      let map = new Map();
      for (let item of groupArr) {
        let name = item.name;
        let id = item.id;
        let children = item.children;
        map.set(id, name);
        if (children && children.length > 0) {
          for (let inner of children) {
            let name = inner.name;
            let id = inner.id;
            map.set(id, name);
          }
        }
      }
      let totalPage = parseInt(linkArr[linkArr.length - 1].innerText);
      return { totalPage, map };
    })
    .catch((err) => {
      console.log("错误:" + err);
      return { totalPage: 0 };
    });
}

function htmlDecode(input) {
  try {
    var doc = new DOMParser().parseFromString(input, "text/html");
    return doc.documentElement.textContent;
  } catch (e) {
    return input;
  }
}

async function getPageDetailKeyword(url, remark, name, exportFormat = false) {
  return Axios({
    method: "get",
    url,
  })
    .then((res) => {
      // todo 检测验证码
      if (isObject(res) && res?.ret) {
        throw new Error(`抓取产品链接${url}, 出现验证码`);
      }
      if (res.indexOf("#nocaptcha") > 0) {
        throw new Error(`抓取产品链接${url}, 出现验证码`);
      }
      let resultJson =
        res.substring(
          res.indexOfEnd("window.detailData = "),
          res.indexOf('"js_ssr"}}}')
        ) + '"js_ssr"}}}';
      let resultJsonData = null;
      if (isJson(resultJson)) {
        resultJsonData = JSON.parse(resultJson);
      }
      // 标题
      let title = getNested(resultJsonData, "globalData", "product", "subject");
      title = htmlDecode(title);
      // 关键词
      let keywords = res.substring(
        res.indexOfEnd('  <meta name="keywords" content="')
      );
      keywords = keywords.substring(
        0,
        keywords.indexOf(" Product on Alibaba.com")
      );
      // 去除标题
      keywords = keywords.substring(keywords.indexOfEnd(" - Buy "));
      keywords = keywords.split(",").map((word) => htmlDecode(word));
      if (!exportFormat) {
        return keywords.map((i) => {
          return {
            keyword: i,
            remark: `${name}-${remark}`,
          };
        });
      } else {
        return [
          {
            title: title,
            keywords: keywords,
            group: remark,
          },
        ];
      }
    })
    .catch((err) => {
      console.log("错误:" + err);
      return err;
    });
}

String.prototype.indexOfEnd = function (string) {
  let io = this.indexOf(string);
  return io === -1 ? -1 : io + string.length;
};
async function getPageDetailUrlByGroupUrl(url) {
  return Axios({
    method: "get",
    url,
  })
    .then((res) => {
      let parser = new DOMParser();
      let htmlParser = parser.parseFromString(res, "text/html");
      const elementNode = htmlParser.querySelector(
        'div[module-title="productListPc"]'
      );
      const elementAttr = elementNode.getAttribute("module-data");
      let objs = unescape(elementAttr);
      if (isJson(objs)) {
        objs = JSON.parse(objs);
      }
      const detailUrlArr = getNested(
        objs,
        "mds",
        "moduleData",
        "data",
        "productList"
      );
      let result = [];
      const prefix = "https:";
      detailUrlArr.forEach((item) => {
        result.push(prefix + item.url);
      });
      return result;
    })
    .catch((err) => {
      console.log("错误:" + err);
      return [];
    });
}

async function getPageDetailUrl(prefix, url) {
  return Axios({
    method: "get",
    url,
  })
    .then((res) => {
      let parser = new DOMParser();
      let htmlParser = parser.parseFromString(res, "text/html");
      let detailUrlArr = htmlParser.querySelectorAll(
        ".module-product-list > .component-product-list .product-info a"
      );
      let result = [];
      for (let item of detailUrlArr) {
        let href = item.getAttribute("href");
        let id = parseInt(href.match(/(\d+-\d+)/)[0].split("-")[1]);
        let url = prefix + href;
        result.push({ id, url });
      }
      return result;
    })
    .catch((err) => {
      console.log("错误:" + err);
      return [];
    });
}

async function getTotalPagesByParam(
  param,
  href,
  target = { size: 100, current: 1 }
) {
  let newParam = Object.assign(target, param);
  console.log(await getList(newParam, href));
  return await getList(newParam, href);
}

// function getWaitSecond(length) {
//   if(length > 1000){
//     return 15000;
//   }
//   if(length > 500){
//     return 10000;
//   }
//   if(length > 50){
//     return 5000;
//   }
//   return 2000;
// }

// async function getKeywordRankInfoRetry(keywords, _csrf_token_) {
//   let result = [];
//   let retryTimes = 1;
//   for (let i = 0; i < retryTimes; i++) {
//     if (keywords.length === 0) {
//       break;
//     }
//     let promiseArray = [];
//     for (let keyword of keywords) {
//       const promise = getKeywordRankPage(keyword, _csrf_token_)
//       promiseArray.push(promise)
//     }
//     let keywordRankInfoArray = await Promise.all(promiseArray);
//     if(i === retryTimes -1){
//       result.push(...keywordRankInfoArray);
//       break;
//     }else {
//       let hasDataKeywordArray = keywordRankInfoArray.filter(item => item.rankOrder);
//       let hasDataKeywordNameArray = hasDataKeywordArray.map(item => item.keyword);
//       result.push(...hasDataKeywordArray);
//       keywords = keywords.filter(keyword => !hasDataKeywordNameArray.includes(keyword.name));
//       await sleep(getWaitSecond(keywords.length));
//     }
//   }
//   return result;
// }

function getKeywordRank(keyword, ctoken) {
  const params = {
    action: "CommonAction",
    iName: "getKeywordSearchProducts",
    ctoken,
  };
  const form = {
    keyword: keyword.name,
  };
  return Axios({
    url: `https://hz-mydata.alibaba.com/self/.json`,
    method: "post",
    params,
    data: qs.stringify(form),
  })
    .then((res) => {
      const obj = res?.value?.filter((item) => !item.isP4PProduct)[0];
      if (obj) {
        return {
          keywordId: keyword.id,
          keyword: keyword.name,
          rank: obj.pageNO,
          rankIndex: obj.rowNO,
          rankOrder: (obj.pageNO - 1) * 50 + obj.rowNO,
          rankProduct: obj.subject,
          rankProductImg: obj.imageURL,
          rankProductId: obj.id,
          isDeletedInP4P: obj.isDeletedInP4P,
          isP4PPaused: obj.isP4PPaused,
          isP4PProduct: obj.isP4PProduct,
          isRealtimeShowcase: obj.isRealtimeShowcase,
        };
      }
      return {
        keywordId: keyword.id,
        keyword: keyword.name,
        rank: "",
        rankIndex: "",
        rankOrder: "",
        rankProduct: "",
        rankProductImg: "",
        rankProductId: "",
        isDeletedInP4P: null,
        isP4PPaused: null,
        isP4PProduct: null,
        isRealtimeShowcase: null,
      };
    })
    .catch((err) => {
      console.log(`获取关键词排名页面出错了:${err}`);
    });
}
async function getKeywordRankInfo(keywords, ctoken) {
  let promises = [];
  for (const keyword of keywords) {
    const promise = getKeywordRank(keyword, ctoken);
    promises.push(promise);
  }
  return await Promise.all(promises);
}

async function updateKeywordsRank(keywords, ctoken, href) {
  // try {
  //   let keywordRankInfo = await getKeywordRankInfoRetry(keywords,_csrf_token_);
  //   await batchUpdateRank(keywordRankInfo,href);
  //   return {success: true, message: ""}
  // } catch (err) {
  //   console.log(`查询排名失败了:${err}`)
  //   return {success: false, message: ""}
  // }
  try {
    const keywordRankInfo = await getKeywordRankInfo(keywords, ctoken);
    await batchUpdateRank(keywordRankInfo, href);
    return { success: true, message: "" };
  } catch (err) {
    console.log(`查询排名失败了:${err}`);
    return { success: false, message: "" };
  }
}

function getList(param, href) {
  let url = AI(href).getKeywordByParam;
  return Axios({
    method: "get",
    url,
    params: param,
  });
}

// function batchUpdateCategory(data, href) {
//   let url = AI(href).putKeywordCategory;
//   return Axios({
//     method: "put",
//     url,
//     data
//   }).catch(() => {
//     // ignore
//   })
// }

function batchUpdateRank(data, href) {
  let url = AI(href).putKeywordRank;
  return Axios({
    method: "put",
    url,
    data,
  }).catch(() => {
    // ignore
  });
}

// function batchUpdatePeerKeyword(data, href) {
//   let url = AI(href).postPeerKeywordRank;
//   return Axios({
//     method: "post",
//     url,
//     data
//   }).catch(() => {
//     // ignore
//   })
// }

export default keywordService;
