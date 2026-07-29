import { showDataOverviewAllField } from "@/js/ali_service/whole_detail_service";
import { Axios } from "@/js/common";
import { ALI_REPORT } from "@/js/service/report/api";
import { infoWeeklyDataProgress } from "@/js/service/shop-data";
import _ from "lodash";
import qs from "qs";
import { getNested } from "util/index";
import sleep from "../../util/sleep";

const nonFormHeaders = { "content-type": "application/x-www-form-urlencoded" };
let feedbackSubjectList = [];
let csrfToken;

let currentScore = 0;
function infoProgress(port, score, param) {
  currentScore += score;
  if (port) {
    if (param?.wholeDataDetail) {
      port.postMessage({
        moduleName: "wholeDetailAnalyse",
        progress: currentScore,
      });
    }

    if (param && param.feedbackAnalyse) {
      port.postMessage({
        moduleName: "feedbackAnalyse",
        progress: currentScore,
      });
    }
    if (param?.syncShopWeeklyData) {
      infoWeeklyDataProgress(port, score);
    }
  }
}

function checkIndustryId(ctoken) {
  let url = ALI_REPORT.getAliIndustries;
  let params = {
    action: "CommonAction",
    iName: "getLvl3Industries",
    ctoken: ctoken,
    statisticType: "os",
    region: "os",
    isVip: true,
    statisticsType: "month",
    selected: 1,
  };
  return Axios({
    url,
    method: "get",
    params,
  }).then((res) => {
    if (res && res.successed) {
      if (res.value && res.value.length > 0) {
        return res.value[0].industryId;
      }
      return null;
    }
  });
}

function getShopSummary(catId, ctoken) {
  const url = ALI_REPORT.getAliIndustries;
  let params = {
    action: "OneAction",
    iName: "vip/home/getShopSummary",
    ctoken: ctoken,
    statisticType: "os",
    region: "os",
    isVip: true,
    statisticsType: "month",
    selected: 1,
    terminalType: "total",
    isMyselfUpgraded: true,
    cateId: catId,
    seperateByCate: false,
  };
  return Axios({
    url,
    method: "get",
    params,
  })
    .then((res) => {
      if (res) {
        return {
          fbPv: res.data[0].fbPv.value,
          shopPv: res.data[0].shopPv.value,
        };
      }
      return { fbPv: 0, shopPv: 0 };
    })
    .catch((err) => {
      console.log(`获取询盘质量信息出错${err}`);
    });
}

function getShopRegion(feedbackList) {
  const countryMap = _.groupBy(feedbackList, (item) => item.countryName);

  const result = [];
  for (const country in countryMap) {
    const value = _.groupBy(
      countryMap[country],
      (item) => item.userNewLevel || "L0"
    );
    result.push({ country, value, size: countryMap[country].length });
  }
  return result?.sort((a, b) => b.size - a.size);
}

function groupPromise(ctoken) {
  let url = ALI_REPORT.postAliGroup;
  let params = {
    action: "CommonAction",
    iName: "getProductGroups",
    isVip: true,
    statisticType: "os",
    region: "os",
    ctoken: ctoken,
  };
  return Axios({
    method: "get",
    url,
    params,
  })
    .then((res) => {
      let { value } = res;
      const parentList = value.filter(
        (i) => i.groupName && i.parentGroupId === -1
      );
      const childList = value.filter(
        (i) => i.groupName && i.parentGroupId !== -1
      );
      for (const item of parentList) {
        item.children = [];
        const child = childList.filter((i) => i.parentGroupId === item.groupId);
        item.children.push(...child);
      }
      return parentList;

      // return [];
    })
    .catch((err) => {
      console.log(`获取产品分组信息出错${err}`);
      return [];
    });
}

// function countFlagNumber(data, flagData) {
//     let groupFlagNumber = 0;
//     if(data && flagData){
//         let productIdArray = data.map(item  => item.id);
//         for (let id of productIdArray){
//             if(flagData[id]){
//                 groupFlagNumber =  groupFlagNumber + parseInt(flagData[id]);
//             }
//         }
//     }
//     return groupFlagNumber;
// }

// function groupStatisticsPromise(ctoken, groupId, groupName,level,flagData,groupResultData,pageNo = 1) {
//     const url = ALI_REPORT.getAliIndustries;
//     const params = {
//         action: "CommonAction",
//         iName: "getVipEffectiveProductsAndStats",
//         isVip: true,
//         ctoken: ctoken
//     };
//     let form = {};
//     if(level === "groupLevel1"){
//          form = {
//             statisticsType: "month",
//             selected: 1,
//             terminalType: "total",
//             isMyselfUpgraded: true,
//             orderBy: "views",
//             orderModel: "desc",
//             pageSize: 30,
//             pageNO: pageNo,
//             minInquiries: 1,
//             groupLevel1: groupId,
//             statisticType: "os",
//             region: "os",
//             isVip: true
//         };
//     }else {
//         form = {
//             statisticsType: "month",
//             selected: 1,
//             terminalType: "total",
//             isMyselfUpgraded: true,
//             orderBy: "views",
//             orderModel: "desc",
//             pageSize: 30,
//             pageNO: pageNo,
//             minInquiries: 1,
//             groupLevel2: groupId,
//             statisticType: "os",
//             region: "os",
//             isVip: true
//         };
//     }
//     form = qs.stringify(form);
//     return Axios({
//         url,
//         params,
//         data: form,
//         method: "post",
//         header: nonFormHeaders
//     }).then(async res => {
//             let {value: {products: {data}, statistics: {inquiries,total}}} = res;
//             let flagNumber = countFlagNumber(data,flagData);

//             let groupData = groupResultData.find(item => (item.groupName === groupName) && (item.level === level));
//             if(groupData){
//                 groupData.flagNumber = groupData.flagNumber + flagNumber;
//                 groupData.total = groupData.total + data.length;
//             }else {
//                 groupResultData.push(
//                   {
//                     groupName,
//                     level,
//                     inquiries,
//                     flagNumber,
//                     total: data.length
//                   });
//             }

//             groupData = groupResultData.find(item => (item.groupName === groupName) && (item.level === level));
//             if (groupData && groupData.total  < total) {
//                 await groupStatisticsPromise(ctoken, groupId, groupName, level, flagData, groupResultData, pageNo + 1)
//             }
//     }).catch(err => {
//         console.log(`获取询盘分组信息出错${err}`)
//     })
// }
function getGroupStatisticsParams(ctoken) {
  return {
    action: "CommonAction",
    iName: "getVipEffectiveProductsAndStats",
    isVip: true,
    ctoken,
  };
}

function getGroupStatisticsForm(feedbackInterval, groupId, isParent, isAll) {
  let data;
  if (isAll) {
    data = getLevelData(feedbackInterval);
  } else {
    if (isParent) {
      data = {
        ...getLevelData(feedbackInterval),
        groupLevel1: groupId,
      };
    } else {
      data = {
        ...getLevelData(feedbackInterval),
        groupLevel2: groupId,
      };
    }
  }
  return qs.stringify(data);
}
function getLevelData(feedbackInterval) {
  return {
    statisticsType: feedbackInterval,
    selected: 1,
    terminalType: "total",
    isMyselfUpgraded: true,
    orderBy: "views",
    orderModel: "desc",
    pageSize: 30,
    pageNO: 1,
    statisticType: "os",
    region: "os",
    isVip: true,
  };
}
async function getGroupStatistics(
  feedbackInterval,
  groupId,
  ctoken,
  isParent,
  isAll
) {
  const url = "https://hz-mydata.alibaba.com/self/.json";
  const params = getGroupStatisticsParams(ctoken);
  const data = getGroupStatisticsForm(
    feedbackInterval,
    groupId,
    isParent,
    isAll
  );
  return Axios({
    url,
    method: "post",
    params,
    data,
  })
    .then((res) => {
      const result = getNested(res, "value", "statistics");
      if (result && Object.hasOwn(result, "inquiries")) {
        const { inquiries = 0 } = result;
        return inquiries;
      }
      return 0;
    })
    .catch((err) => {
      console.log(`产品分组获取询盘出错了${err}`);
    });
}

function getCsrfToken() {
  let url = "https://message.alibaba.com/message/default.htm";
  return Axios({
    method: "get",
    url,
  })
    .then((res) => {
      const csrfT = res.substring(res.indexOfEnd("csrfTokenVal: '"));
      let resultJson = csrfT.substring(0, csrfT.indexOf("',"));
      csrfToken = resultJson;
    })
    .catch(() => {});
}

async function getFeedbackSubjectList(ctoken, feedbackInterval, page = 1) {
  const url =
    "https://message.alibaba.com/message/ajax/feedback/subjectList.htm";
  const params = {
    ctoken: ctoken,
  };
  await getCsrfToken();
  let year = new Date().getFullYear();
  let month = new Date().getMonth() - 1;
  let startTime = new Date(year, month, 1);
  let endTime = new Date(year, month + 1, 1);
  if (feedbackInterval === "week") {
    let today = new Date();
    startTime = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 7
    );
    endTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }
  if (feedbackInterval === "3month") {
    let today = new Date();
    startTime = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    endTime = new Date(today.getFullYear(), today.getMonth(), 1);
  }
  let form = {
    _csrf_token_: csrfToken,
    postId: new Date().getTime(),
    params: JSON.stringify({
      system: "feedback",
      listType: "all",
      search: {
        startTime: startTime.getTime(),
        endTime: endTime.getTime(),
      },
      isAdvanceSearch: "true",
      pagination: {
        nextPage: page,
        pageSize: 100,
      },
      filter: {
        isShowAtm: false,
      },
      order: {
        order: "desc",
        orderBy: "latest_contact_time",
      },
    }),
  };
  return Axios({
    url: url,
    method: "post",
    params,
    data: qs.stringify(form),
    header: nonFormHeaders,
  })
    .then(async (res) => {
      if (res && res.code && res.code === 200) {
        let {
          data: { list },
        } = res;
        let resultArray = toFeedbackSubjectList(list);
        await sleep(500);
        feedbackSubjectList.push(...resultArray);
        let {
          data: { pagination },
        } = res;
        if (pagination.nextPage * pagination.pageSize < pagination.totalCount) {
          await getFeedbackSubjectList(ctoken, feedbackInterval, page + 1);
        }
      }
    })
    .catch((err) => {
      console.log(`转化分析-获取买家分布明细出错${err}`);
    });
}

function partition(array, size) {
  let i, j;
  let result = [];
  for (i = 0, j = array.length; i < j; i += size) {
    let temparray = array.slice(i, i + size);
    result.push(temparray);
  }
  return result;
}

async function getSubjectListExtraInfo(
  ctoken,
  feedbackSubjectList,
  progressPort,
  param
) {
  const url =
    "https://message.alibaba.com/message/ajax/feedback/subjectListExtraInfo.htm";
  let params = {
    ctoken,
  };

  let partitionArray = partition(feedbackSubjectList, 20);
  for (let partition of partitionArray) {
    // await sleep(5000);
    let secTradeIds = partition.map((f) => f["secTradeId"]);
    let tradeIds = partition.map((f) => f["tradeId"]);
    let form = {
      _csrf_token_: csrfToken,
      postId: new Date().getTime(),
      params: JSON.stringify({
        secTradeIds,
        tradeIds,
      }),
    };
    await Axios({
      url: url,
      method: "post",
      params,
      data: qs.stringify(form),
    })
      .then((res) => {
        if (res && res.code && res.code === 200) {
          let {
            data: { list },
          } = res;
          if (!list) {
            return;
          }
          for (let item of partition) {
            let { tradeId } = item;
            if (list[tradeId]) {
              if (list[tradeId].sender) {
                if (list[tradeId].sender.level) {
                  item.buyerLevel = list[tradeId].sender.level;
                }
                if (list[tradeId].sender.memberLevel) {
                  // memberLevel === 3
                  item.memberLevel = list[tradeId].sender.memberLevel;
                }
                if (list[tradeId].sender.userNewLevel) {
                  // L1+
                  item.userNewLevel = list[tradeId].sender.userNewLevel;
                }
              }
            }
          }
        }
        if (param) {
          infoProgress(progressPort, 15 / partitionArray.length, param);
        }
      })
      .catch((err) => {
        console.log(`获取蓝标信息出错 ${err}`);
      });
  }
}

async function getFeedbackDetailMessage(ctoken, inquiry) {
  let [url, params, data] = ["", {}, {}];
  url = "https://onetalk.alibaba.com/message/getOpMessages.htm";
  data = {
    params: JSON.stringify({
      scene: "",
      timeSlide: {
        timeStamp: null,
        forward: null,
        pageSize: 20,
      },
      secOwnerAccountId: inquiry.secOwnerAccountId,
      secTradeId: inquiry.secTradeId,
      secTargetAccountId: inquiry.secTargetAccountId,
    }),
  };
  await Axios({
    url,
    method: "post",
    params,
    data: qs.stringify(data),
  })
    .then(async (res) => {
      const data = res.data;
      if (data && data.list) {
        let [seller, buyer] = [[], []];
        data.list.forEach((content) => {
          if (content.owner) {
            if (content.messageType === "send") {
              seller.unshift(content);
            } else {
              buyer.unshift(content);
            }
          }
        });
        if (seller.length > 0) {
          // 首次回复时间
          let firstRecTime = inquiry.sendTime;
          if (buyer.length > 0) {
            firstRecTime = buyer[0].sendTime;
          }
          if (firstRecTime) {
            let firstSend = seller.filter((o) => o.sendTime > firstRecTime)[0];
            if (firstSend) {
              inquiry.replyIn24h = (
                (firstSend.sendTime - firstRecTime) /
                3600000
              ).toFixed(1);
            }
          }
          // 判断买家是否二次回复
          if (buyer.length > 0) {
            // 总回复次数
            inquiry.recCnt = buyer.length;
            inquiry.buyerSecondReply =
              buyer.length >= 2 &&
              buyer[0].sendTime < buyer.slice(-1)[0].sendTime;
          }
        }
      }
    })
    .catch((err) => {
      console.log(`业务分析 - 获取回复时间出错:${err}`);
    });
}

async function getMessageInfo(
  ctoken,
  feedbackSubjectList,
  progressPort,
  param
) {
  let partitionArray = partition(feedbackSubjectList, 20);
  for (let partition of partitionArray) {
    let promiseArray = [];
    for (let inquiry of partition) {
      let promise = getFeedbackDetailMessage(ctoken, inquiry).then(() => {
        if (param) {
          infoProgress(
            progressPort,
            15 / 20 / feedbackSubjectList.length,
            param
          );
        }
      });
      promiseArray.push(promise);
    }
    await Promise.all(promiseArray);
  }
}

function init() {
  feedbackSubjectList = [];
}

function getTitle(feedbackInterval) {
  let normalTitle = new Date().getMonth() + "月数据";
  let feedbackListTitle = normalTitle;
  if (feedbackInterval === "week") {
    let today = new Date();
    let startTime = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 7
    );
    let endTime = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    feedbackListTitle =
      startTime.getMonth() +
      1 +
      "." +
      startTime.getDate() +
      "-" +
      (endTime.getMonth() + 1) +
      "." +
      (endTime.getDate() - 1) +
      "数据";
  }
  if (feedbackInterval === "3month") {
    let today = new Date();
    let startTime = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    let endTime = new Date(today.getFullYear(), today.getMonth(), 1);
    feedbackListTitle =
      startTime.getMonth() + 1 + "-" + endTime.getMonth() + "月数据";
  }
  return {
    normalTitle,
    feedbackListTitle,
  };
}

function analyseFlagData() {
  let redFeedbackData = feedbackSubjectList.filter(
    (item) => "FOLLOW" === item.mark
  );

  let countryFlagMap = new Map();
  let productFlagMap = new Map();
  if (redFeedbackData.length > 0) {
    for (let item of redFeedbackData) {
      //统计国家信息
      if (countryFlagMap.has(item.countryName)) {
        countryFlagMap.set(
          item.countryName,
          countryFlagMap.get(item.countryName) + 1
        );
      } else {
        countryFlagMap.set(item.countryName, 1);
      }
      //统计产品信息
      if (productFlagMap.has(item.productId)) {
        productFlagMap.set(
          item.productId,
          productFlagMap.get(item.productId) + 1
        );
      } else {
        productFlagMap.set(item.productId, 1);
      }
    }
  }
  let countryFlag = convertMapToObject(countryFlagMap);
  let productFlag = convertMapToObject(productFlagMap);

  return {
    countryFlag,
    productFlag,
  };
}

function convertMapToObject(aMap) {
  const obj = {};
  aMap.forEach((v, k) => {
    obj[k] = v;
  });
  return obj;
}

function getThreeMonthForm(page = 1) {
  // let year = new Date().getFullYear();
  // let month = new Date().getMonth() - 1;
  let today = new Date();
  let startTime = new Date(today.getFullYear(), today.getMonth() - 3, 1);
  let endTime = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  let form = {
    _csrf_token_: csrfToken,
    postId: new Date().getTime(),
    params: JSON.stringify({
      system: "feedback",
      listType: "all",
      search: {
        startTime: startTime.getTime(),
        endTime: endTime.getTime(),
      },
      isAdvanceSearch: "true",
      pagination: {
        nextPage: page,
        pageSize: 20,
      },
      filter: {
        isShowAtm: false,
      },
      order: {
        order: "desc",
        orderBy: "latest_contact_time",
      },
    }),
  };
  return form;
}

async function getFeedbackTotalPage(ctoken) {
  const url =
    "https://message.alibaba.com/message/ajax/feedback/subjectList.htm";
  const params = {
    ctoken: ctoken,
  };
  await getCsrfToken();
  let form = getThreeMonthForm();
  return Axios({
    url: url,
    method: "post",
    params,
    data: qs.stringify(form),
    header: nonFormHeaders,
  })
    .then(async (res) => {
      if (res && res.code && res.code === 200) {
        let {
          data: { pagination },
        } = res;
        let totalCount = pagination.totalCount;
        let pageSize = pagination.pageSize;
        if (totalCount % pageSize === 0) {
          return totalCount / pageSize;
        } else {
          return Math.floor(totalCount / pageSize) + 1;
        }
      }
    })
    .catch((err) => {
      console.log(`获取3个月询盘数据总页数出错${err}`);
    });
}

function toFeedbackSubjectList(list) {
  let resultArray = [];
  for (let item of list) {
    let inquiry = item[0];
    let {
      createTime,
      mark,
      ownerName,
      sender: { name, countryName },
      feedbackId,
      secTradeId,
      tradeId,
      source,
      feedbackType,
    } = inquiry;
    let result = {
      createTime,
      mark,
      ownerName,
      name,
      countryName,
      feedbackId,
      secTradeId,
      tradeId,
      source,
      feedbackType,
    };
    if (inquiry.productInfo) {
      let {
        productInfo: [{ productName, productId, quantity, unit }],
      } = item[0];
      result.productName = productName;
      result.productId = productId;
      result.quantity = quantity;
      result.unit = unit;
    }
    //标记是否RFQ
    result.isRFQ = inquiry.source === "RFQ";
    // 询价单号
    result.secOwnerAccountId = inquiry.secOwnerId;
    result.secTargetAccountId = inquiry.sender.secAccountId;
    result.replyIn24h = "无回复";
    result.buyerSecondReply = false;
    if (inquiry.source !== "CONTACT_MKT_VISITORS_MYDATA") {
      resultArray.push(result);
    }
  }
  return resultArray;
}

async function get3MonthFbList(i, ctoken) {
  const url =
    "https://message.alibaba.com/message/ajax/feedback/subjectList.htm";
  const params = {
    ctoken: ctoken,
  };
  let form = getThreeMonthForm(i);
  return Axios({
    url: url,
    method: "post",
    params,
    data: qs.stringify(form),
    header: nonFormHeaders,
  })
    .then(async (res) => {
      if (res && res.code && res.code === 200) {
        let {
          data: { list },
        } = res;
        let resultArray = toFeedbackSubjectList(list);
        return resultArray;
      }
    })
    .catch((err) => {
      console.log(`转化分析-获取买家分布明细出错${err}`);
      return [];
    });
}
async function getGroupInquiry(
  groupInfo,
  feedbackInterval,
  ctoken,
  progressPort
) {
  let parentGroupList = [];
  let sonGroupList = [];
  let currentScore = 70;
  let score = 30 / groupInfo.length;
  for (const group of groupInfo) {
    const { groupId, groupName } = group;
    const parent = true;
    //父级分组询盘数
    const groupParent = await getGroupStatistics(
      feedbackInterval,
      groupId,
      ctoken,
      parent,
      false
    );
    parentGroupList.push({ groupParent, groupId, groupName });
    if (group.children.length > 0) {
      const son = false;
      for (const child of group.children) {
        const { parentGroupId, groupName, groupId: id } = child;
        // 子级分组询盘数
        const groupSon = await getGroupStatistics(
          feedbackInterval,
          id,
          ctoken,
          son,
          false
        );
        sonGroupList.push({ groupSon, parentGroupId, groupName });
      }
    }
    if (progressPort) {
      currentScore = currentScore + score;
      infoFeedbackAnalyseProgress(progressPort, currentScore);
    }
  }
  // 合并两个数组 树形数组
  const groupList = [];
  for (const item of parentGroupList) {
    item.children = [];
    const result = sonGroupList.filter((i) => i.parentGroupId === item.groupId);
    item.children.push(...result);
    groupList.push(item);
  }
  let groups = [];
  for (const i of groupList) {
    if (i.children.length > 0) {
      for (const child of i.children) {
        groups.push({
          parentName: i.groupName + ">>" + child.groupName,
          inquiries: child.groupSon,
        });
      }
    } else {
      groups.push({ parentName: i.groupName, inquiries: i.groupParent });
    }
  }
  parentGroupList = parentGroupList.filter((i) => i.groupName !== "未分组");
  for (const parent of parentGroupList) {
    groups.push({
      parentName: parent.groupName,
      inquiries: parent.groupParent,
    });
  }
  // 去重
  groups = uniqueArray(groups);
  groups = groups.sort((a, b) => b.inquiries - a.inquiries);
  return groups;
}
function uniqueArray(arr) {
  const res = new Map();
  return arr.filter(
    (arr) => !res.has(arr.parentName) && res.set(arr.parentName, 1)
  );
}
function infoFeedbackAnalyseProgress(progressPort, progress) {
  const moduleName = "feedbackAnalyse";
  progressPort.postMessage({ moduleName, progress });
}

function resetScore() {
  currentScore = 0;
}

// async function getAccountId(secTradeId, ctoken) {
//   let url =
//     "https://message.alibaba.com/message/ajax/feedback/querySummary.htm";
//   let data = {
//     _csrf_token_: csrfToken,
//     params: JSON.stringify({ secTradeId: secTradeId }),
//   };
//   let params = { ctoken };
//   return Axios({
//     url,
//     method: "post",
//     params,
//     data: qs.stringify(data),
//   }).then((res) => {
//     return getNested(res, "data", "contact", "accountIdEncrypt");
//   });
// }

// async function getTbToken() {
//   return new Promise((resolve) => {
//     chrome.cookies.getAll(
//       {
//         domain: ".alibaba.com",
//         name: "_tb_token_",
//       },
//       (cookies2) => {
//         if (cookies2[0] && cookies2[0].value) {
//           let token = cookies2[0].value;
//           resolve(token);
//         } else {
//           console.log("inquiry token not found");
//           resolve("");
//         }
//       }
//     );
//   });
// }

// async function getEmailInfo(feedback, ctoken, tbToken) {
//   let secTradeId = getNested(feedback, "secTradeId");
//   let accountIdEncrypt = await getAccountId(secTradeId, ctoken);
//   let url =
//     "https://alicrm.alibaba.com/jsonp/customerPluginQueryServiceI/queryCustomerInfo.json";
//   let params = {
//     buyerAccountId: accountIdEncrypt,
//     secTradeId: secTradeId,
//     _tb_token_: tbToken,
//     _: new Date().getTime(),
//     buyerLoginId: "",
//   };
//   return axios({
//     url,
//     method: "get",
//     params,
//   }).then((res) => {
//     return getNested(
//       res,
//       "data",
//       "data",
//       "data",
//       "buyerInfo",
//       "buyerContactInfo",
//       "email"
//     );
//   });
// }

// async function getBuyerEmailInfo(ctoken, threeMonthFeedbackList) {
//   let promiseArray = [];
//   let tbToken = await getTbToken();
//   for (let feedback of threeMonthFeedbackList) {
//     let promise = getEmailInfo(feedback, ctoken, tbToken).then((data) => {
//       feedback.email = data;
//     });
//     promiseArray.push(promise);
//   }
//   await Promise.all(promiseArray);
// }
function setInfoWeeklyDataProgress(progressPort, plusProgress = 15) {
  if (progressPort.name === "weeklyData") {
    infoWeeklyDataProgress(progressPort, plusProgress);
  }
}

const feedbackService = {
  async feedbackQualityAnalyse(
    ctoken,
    feedbackInterval,
    lastMonthFeedbackList,
    progressPort,
    feedbackDetails
  ) {
    console.log("🚀 ~ lastMonthFeedbackList:", lastMonthFeedbackList);
    init();
    //询盘类目id
    let industryId = await checkIndustryId(ctoken);
    if (industryId === null) {
      industryId = "-";
    }
    // 显示数据总览的所有字段
    await showDataOverviewAllField(ctoken);
    //询盘个数，店铺访问人数
    const shopSummary = await getShopSummary(industryId, ctoken);
    if (
      Array.isArray(lastMonthFeedbackList) &&
      lastMonthFeedbackList.length > 0
    ) {
      feedbackSubjectList = lastMonthFeedbackList;
    } else {
      //买家分布明细
      await getFeedbackSubjectList(ctoken, feedbackInterval);
      infoFeedbackAnalyseProgress(progressPort, 40);
      //买家分布明细中的蓝标
      await getSubjectListExtraInfo(ctoken, feedbackSubjectList);
      infoFeedbackAnalyseProgress(progressPort, 45);
      if (feedbackDetails) {
        //买家分布明细中的回复时间及二次回复
        await getMessageInfo(ctoken, feedbackSubjectList);
        infoFeedbackAnalyseProgress(progressPort, 50);
      } else {
        infoFeedbackAnalyseProgress(progressPort, 50);
      }
    }
    //旗标数据统计
    const flagData = analyseFlagData();
    infoFeedbackAnalyseProgress(progressPort, 55);
    //询盘周期是否为一个月
    const showFlagData = "month" === feedbackInterval;
    //国家分布占比
    const shopRegion = await getShopRegion(feedbackSubjectList);
    console.log("🚀 ~ shopRegion:", shopRegion);
    infoFeedbackAnalyseProgress(progressPort, 60);
    //产品分组信息
    const groupInfo = await groupPromise(ctoken);
    // 添加未分组
    groupInfo.push({
      groupId: 0,
      groupName: "未分组",
      parentGroupId: -1,
      children: [],
    });

    infoFeedbackAnalyseProgress(progressPort, 70);
    // 分组询盘数
    const groups = await getGroupInquiry(
      groupInfo,
      feedbackInterval,
      ctoken,
      progressPort
    );
    // 总询盘数
    const totalInquiries = await getGroupStatistics(
      feedbackInterval,
      "",
      ctoken,
      "",
      true
    );

    //生成报告表头的时间
    let title = getTitle(feedbackInterval);
    infoFeedbackAnalyseProgress(progressPort, 100);
    return {
      shopSummary,
      shopRegion,
      groups,
      feedbackSubjectList,
      title,
      flagData,
      showFlagData,
      totalInquiries,
      showFeedbackDetails: feedbackDetails,
    };
  },
  async get3MonthFeedbackData(ctoken, progressPort, param) {
    resetScore();
    let threeMonthFeedbackList = await this.get3MonthFeedbackList(
      ctoken,
      progressPort,
      param
    );
    console.log(
      "🚀 ~ get3MonthFeedbackData ~ threeMonthFeedbackList length:",
      threeMonthFeedbackList.length
    );
    setInfoWeeklyDataProgress(progressPort);
    //买家分布明细中的蓝标
    await getSubjectListExtraInfo(
      ctoken,
      threeMonthFeedbackList,
      progressPort,
      param
    );
    setInfoWeeklyDataProgress(progressPort);
    //买家分布明细中的回复时间及二次回复
    // await getMessageInfo(ctoken, threeMonthFeedbackList, progressPort, param);
    setInfoWeeklyDataProgress(progressPort);
    // 同步店铺月数据时获取买家邮箱信息
    // await getBuyerEmailInfo(ctoken, threeMonthFeedbackList);
    setInfoWeeklyDataProgress(progressPort);
    return threeMonthFeedbackList;
  },
  async get3MonthFeedbackList(ctoken, progressPort, param) {
    currentScore = 0;
    let result = [];
    let totalPage = await getFeedbackTotalPage(ctoken);
    // console.log("🚀 ~ get3MonthFeedbackList ~ totalPage:", totalPage);
    await getCsrfToken();
    for (let i = 1; i <= totalPage; i++) {
      let data = await get3MonthFbList(i, ctoken);
      if (!data || data.length === 0) {
        break;
      }
      result.push(...data);
      let eachScore = 20 / totalPage;
      if (param) {
        infoProgress(progressPort, eachScore, param);
      }
    }
    result = result.filter((item) => !item.isRFQ);
    return result;
  },
  async checkIndustryId(ctoken) {
    return await checkIndustryId(ctoken);
  },
};
export default feedbackService;
