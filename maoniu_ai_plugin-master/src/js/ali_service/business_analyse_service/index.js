import { Axios } from "common/index";
import qs from "qs";
import moment from "moment";
import { trueViewList as trueViewData } from "../../ali_service";

function getAccountsData(ctoken) {
  const url = "https://hz-mydata.alibaba.com/self/.json";
  let params = {
    action: "OneAction",
    iName: "vip/home/getAccountsAndTotal",
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
  })
    .then((res) => {
      if (res && res.data) {
        let {
          data: { accounts },
        } = res;
        accounts = accounts.map((item) => {
          let {
            fullName,
            fbPv,
            replyAvgTime,
            replyRate,
            newProductCount,
            alterProductCount,
            uvFbAtm,
          } = item;
          return {
            fullName,
            fbPv,
            replyAvgTime,
            replyRate,
            newProductCount,
            alterProductCount,
            uvFbAtm,
          };
        });
        return accounts;
      }
      return [];
    })
    .catch((err) => {
      console.log(`获取员工数据出错：${err}`);
    });
}
function getPublishList() {
  const url = "https://content.alibaba.com/publish_list";
  return Axios({
    url,
    method: "get",
  })
    .then((res) => {
      const start = res.substring(res.indexOfEnd('window.__csrf = "'));
      const csrf = start.substring(0, start.indexOf('"'));
      return csrf;
    })
    .catch((err) => {
      console.log("获取publish_list csrf出错:" + err);
    });
}
export async function getTrueViewListPromise() {
  const total = await getTrueViewList();
  const pages = total % 20 === 0 ? total / 20 : total / 20 + 1;
  const result = [];
  for (let i = 1; i <= pages; i++) {
    const p = getTrueViewListPagePromise(i);
    result.push(p);
  }
  return (await Promise.all(result)).flat(1);
}
async function getTrueViewList() {
  const url = "https://content.alibaba.com/api/list/content";
  const _csrf = await getPublishList();
  const startTime = moment()
    .month(moment().month() - 1)
    .startOf("month")
    .valueOf();
  const endTime = moment()
    .month(moment().month())
    .startOf("month")
    .subtract(1, "days")
    .valueOf();
  let form = {
    currentPage: 1,
    pageSize: 20,
    status: 0,
    startTime,
    endTime,
    draft: 0,
    _csrf,
  };
  return Axios({
    url,
    method: "post",
    data: qs.stringify(form),
  })
    .then((res) => {
      if (res.success && res.entity && res.entity.totalCount) {
        return res.entity.totalCount;
      }
    })
    .catch((err) => {
      console.log("获取True View list page 出错:" + err);
    });
}
async function getTrueViewListPagePromise(i) {
  const url = "https://content.alibaba.com/api/list/content";
  const startTime = moment()
    .month(moment().month() - 1)
    .startOf("month")
    .valueOf();
  const endTime = moment()
    .month(moment().month())
    .startOf("month")
    .subtract(1, "days")
    .valueOf();
  const _csrf = await getPublishList();
  let form = {
    currentPage: i,
    pageSize: 20,
    status: 0,
    startTime,
    endTime,
    draft: 0,
    _csrf,
  };
  return Axios({
    url,
    method: "post",
    data: qs.stringify(form),
  })
    .then((res) => {
      if (res.success && res.entity && res.entity.list.length > 0) {
        return res.entity.list;
      } else {
        return [];
      }
    })
    .catch((err) => {
      console.log("获取True View list 出错:" + err);
    });
}

async function getSubAccountQuotationData(ctoken, result) {
  const url =
    "https://mysourcing.alibaba.com/rfq/quotation/subAccountQuoBehaviorAjax.do";
  let params = {
    ctoken,
  };
  let startDate = `${new Date().getFullYear()}-${new Date().getMonth()}-01`;
  let form = {
    startDate,
  };
  await Axios({
    url,
    method: "post",
    params,
    data: qs.stringify(form),
  })
    .then((res) => {
      if (res && res.data) {
        let {
          data: { subAccountStates },
        } = res;
        for (let item of result) {
          let quotation = subAccountStates.filter(
            (data) => data["accountName"] === item.fullName
          );
          if (quotation && quotation.length > 0) {
            let { quoteApprove, quoteView, quoteWill, readRate, willRate } =
              quotation[0];
            item.quoteApprove = quoteApprove;
            item.quoteView = quoteView;
            item.quoteWill = quoteWill;
            item.readRate = readRate;
            item.willRate = willRate;
          }
        }
      }
    })
    .catch((err) => {
      console.log(`获取账号报价数据出错：${err}`);
    });
}

async function getAccountBasic(ctoken, progressPort) {
  //员工数据
  const result = await getAccountsData(ctoken);
  infoProgress(progressPort, 25);
  //账号报价数据
  await getSubAccountQuotationData(ctoken, result);
  infoProgress(progressPort, 50);
  return result;
}

async function calculateAverageData(accountBasicData) {
  let total = {};
  total.fullName = "合计";

  total.fbPv = accountBasicData
    .map((item) => item.fbPv)
    .reduce((a, b) => a + b, 0);
  let replyArray = accountBasicData
    .map((item) => item.replyRate)
    .filter((item) => item);
  if (replyArray && replyArray.length > 0) {
    let replyRateString = (
      replyArray.reduce((a, b) => a + b, 0) / replyArray.length
    ).toFixed(3);
    total.replyRate = Number.parseFloat(replyRateString);
  }
  let replyAvgTimeArray = accountBasicData
    .map((item) => item.replyAvgTime)
    .filter((item) => item);
  if (replyAvgTimeArray && replyAvgTimeArray.length > 0) {
    let replyAvgTimeString = (
      replyAvgTimeArray.reduce((a, b) => a + b, 0) / replyAvgTimeArray.length
    ).toFixed(2);
    total.replyAvgTime = Number.parseFloat(replyAvgTimeString);
  }
  let secondResponseRateArray = accountBasicData
    .map((item) => item.secondResponseRate)
    .filter((item) => item && item !== 0)
    .map((item) => {
      if (item.includes("%")) {
        return Number.parseFloat(item.substring(0, item.indexOf("%")));
      }
    });
  if (secondResponseRateArray && secondResponseRateArray.length > 0) {
    total.secondResponseRate =
      (
        secondResponseRateArray.reduce((a, b) => a + b, 0) /
        secondResponseRateArray.length
      ).toFixed(2) + "%";
  }
  // RFQ报价
  total.quoteApprove = accountBasicData
    .filter((item) => item.quoteApprove)
    .map((item) => Number.parseInt(item.quoteApprove))
    .reduce((a, b) => a + b, 0);
  // RFQ查看
  total.quoteView = accountBasicData
    .filter((item) => item.quoteView)
    .map((item) => Number.parseInt(item.quoteView))
    .reduce((a, b) => a + b, 0);
  // RFQ意向
  total.quoteWill = accountBasicData
    .filter((item) => item.quoteWill)
    .map((item) => Number.parseInt(item.quoteWill))
    .reduce((a, b) => a + b, 0);
  // RFQ查看率 RFQ意向行动率
  if (total.quoteApprove && total.quoteApprove > 0) {
    total.readRate = ((total.quoteView / total.quoteApprove) * 100).toFixed(2);
    total.willRate = ((total.quoteWill / total.quoteApprove) * 100).toFixed(2);
  }
  // TM客户数
  total.uvFbAtm = accountBasicData
    .map((item) => item.uvFbAtm)
    .reduce((a, b) => a + b, 0);
  // 新发品
  total.newProductCount = accountBasicData
    .map((item) => item.newProductCount)
    .reduce((a, b) => a + b, 0);
  // 修改产品
  total.alterProductCount = accountBasicData
    .map((item) => item.alterProductCount)
    .reduce((a, b) => a + b, 0);
  // True View 发布
  total.subAccountNumber = accountBasicData
    .map((item) => item.subAccountNumber)
    .reduce((a, b) => a + b, 0);
  accountBasicData.push(total);
}

function getMailableVisitorCount(ctoken) {
  let url = "https://hz-mydata.alibaba.com/self/.json";
  let now = new Date();
  let startDate =
    now.getFullYear() + "-" + now.getMonth() + "-" + (now.getDate() - 2);
  let endDate =
    now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + (now.getDate() - 2);
  let params = {
    action: "CommonAction",
    iName: "getMailableVisitorCount",
    isVip: true,
    ctoken: ctoken,
    statisticsType: "day",
    selected: "0",
    startDate: startDate,
    endDate: endDate,
    _: now.getTime(),
  };

  return Axios({
    url,
    params,
    method: "get",
  })
    .then((res) => {
      if (Object.hasOwn(res, "successed") && res.successed) {
        if (res.value) {
          return res.value.count;
        }
      }
      return 0;
    })
    .catch((err) => {
      console.log(`获取近31天可询盘数出错${err}`);
    });
}

async function getVisitorData(ctoken) {
  //近31天可营销数
  let mailableVisitorCount = await getMailableVisitorCount(ctoken);
  const url = "https://hz-mydata.alibaba.com/self/.json";
  let params = {
    action: "CommonAction",
    iName: "getOnePagePerformance",
    ctoken,
  };
  let year = new Date().getFullYear();
  let month = new Date().getMonth();
  let date = new Date().getDate() - 2;
  let startDate = `${year}-${month}-${date}`;
  let endDate = `${year}-${month + 1}-${date}`;
  let form = {
    startDate,
    endDate,
  };
  return Axios({
    url,
    method: "post",
    params,
    data: qs.stringify(form),
  })
    .then((res) => {
      if (Object.hasOwn(res, "successed") && res.successed) {
        let { value } = res;
        value.mailableVisitorCount = mailableVisitorCount;
        return value;
      }
    })
    .catch((err) => {
      console.log(`获取访客营销数据出错:${err}`);
    });
}

function getSubAccountNumber(trueViewList, accountBasicData) {
  for (const item of accountBasicData) {
    item.subAccountNumber = trueViewList.filter(
      (i) => i.publishUserName === item.fullName
    ).length;
  }
}

function infoProgress(progressPort, progress) {
  const moduleName = "workerAnalyse";
  progressPort.postMessage({ moduleName, progress });
}

const businessAnalyseService = {
  async businessAnalyse(ctoken, feedbackQualityAnalyse, progressPort) {
    //账号基础数据
    const accountBasicData = await getAccountBasic(ctoken, progressPort);
    // True View发布
    let trueViewList = [];
    if (trueViewData && trueViewData.length > 0) {
      trueViewList = trueViewData;
    } else {
      trueViewList = await getTrueViewListPromise();
    }
    infoProgress(progressPort, 60);
    // 子账户数添加至账户基础数据
    getSubAccountNumber(trueViewList, accountBasicData);
    infoProgress(progressPort, 70);
    // //二次回复率
    // calculateSecondResponseRate(accountBasicData,feedbackQualityAnalyse);
    //合计
    await calculateAverageData(accountBasicData);
    infoProgress(progressPort, 80);
    //访客营销
    const visitorData = await getVisitorData(ctoken);
    infoProgress(progressPort, 100);
    return {
      accountBasicData,
      visitorData,
    };
  },
};

export default businessAnalyseService;
