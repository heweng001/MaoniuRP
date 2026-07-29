console.log("content js init");

let moduleInfo = [
  { id: "DiagnosisConclusion", name: "诊断结论", show: false, progress: 0 },
  { id: "p4pAnalyse", name: "流量分析", show: false, progress: 0 },
  { id: "showcaseAnalyse", name: "橱窗分析", show: false, progress: 0 },
  { id: "transformAnalyse", name: "转化分析", show: false, progress: 0 },
  { id: "feedbackAnalyse", name: "询盘质量分析", show: false, progress: 0 },
  { id: "workerAnalyse", name: "员工绩效", show: false, progress: 0 },
  {
    id: "wholeDetailAnalyse",
    name: "周数据详细记录",
    show: false,
    progress: 0,
  },
  { id: "sameIndustryAnalyse", name: "优秀同行", show: false, progress: 0 },
  { id: "highInquiryProducts", name: "高询盘产品", show: false, progress: 0 },
  {
    id: "hotProductAnalyse",
    name: "类目(询盘/销量)榜",
    show: false,
    progress: 0,
  },
  { id: "industryProductAnalyse", name: "同行热品", show: false, progress: 0 },
  { id: "amazonProductList", name: "亚马逊产品", show: false, progress: 0 },
  { id: "topSaleRankProduct", name: "榜单产品", show: false, progress: 0 },
];

let contentPort = chrome.runtime.connect({ name: "progressContent" });
contentPort.postMessage("init");
contentPort.onMessage.addListener(function (msg) {
  console.log("🚀 content.js ~ msg:", msg);
  if (msg.showProgressCard) {
    initProgressCard(msg.param);
  }
  if (msg.closeProgressCard) {
    closeProgressCard();
  }
  if (msg.moduleName) {
    let { moduleName, progress } = msg;
    if (typeof progress == "number") {
      progress = progress.toFixed(2);
    }
    updateProgress(moduleName, progress);
  }
});

function setModule(moduleId) {
  let filter = moduleInfo.filter((item) => item.id === moduleId);
  if (filter && filter.length > 0) {
    filter[0].show = true;
  }
}

function initModuleInfo(param) {
  console.log(param);
  if (param) {
    if (param.businessAnalyse) {
      setModule("workerAnalyse");
    }
    if (param.conclusion) {
      setModule("DiagnosisConclusion");
    }
    if (param.feedbackAnalyse) {
      setModule("feedbackAnalyse");
    }
    if (param.p4pDataAnalyse) {
      setModule("p4pAnalyse");
    }

    if (param.popularProductHighInquiry) {
      setModule("hotProductAnalyse");
    }
    if (param.popularProductHotSelling) {
      setModule("hotProductAnalyse");
    }

    if (param.productAnalyse) {
      setModule("transformAnalyse");
    }
    if (param.sameIndustryAnalyse) {
      setModule("sameIndustryAnalyse");
    }
    if (param.highInquiryProductList) {
      setModule("highInquiryProducts");
    }
    if (param.sameIndustryService) {
      setModule("industryProductAnalyse");
    }
    if (param.showcaseTable) {
      setModule("showcaseAnalyse");
    }
    if (param.wholeDataDetail) {
      setModule("wholeDetailAnalyse");
    }
    if (param.amazonProductList) {
      setModule("amazonProductList");
    }
    if (param.topSaleRankProduct) {
      setModule("topSaleRankProduct");
    }
  }
}

function setChromeExtensionId() {
  let id = chrome.runtime.id;
  localStorage.setItem("ai-plugin-id", id);
  console.log("from local storage " + localStorage.getItem("ai-plugin-id"));
}
setChromeExtensionId();

function initProgressCard(param) {
  initModuleInfo(param);
  let html = `<div id="month-report-progress">`;
  moduleInfo.forEach((module) => {
    if (module.show) {
      html = html + `<div id="${module.id}">${module.name}: 初始化</div>`;
    }
  });
  html =
    html +
    `
            </div>
			<style>
			  #month-report-progress {
			    position: fixed;
			    bottom: 2px;
			    right: 2px;
			    width: 200px;
			    font-size: 13px;
			    padding: 5px 10px;
			    border-radius: 3px;
			    background: #409EFF;
			    line-height: 1.5;
			    color: #fff;
			  }
			</style>
			`;
  let pluginContainer = document.getElementById("month-report-progress");
  if (!pluginContainer) {
    const divNode = document.createElement("div");
    divNode.innerHTML = html;
    document.body.appendChild(divNode);
  }
}

function closeProgressCard() {
  let node = document.getElementById("month-report-progress");
  if (node) {
    node.parentNode.removeChild(node);
  }
}

function updateProgress(moduleName, progress) {
  // console.log(moduleName, progress);
  let element = document.getElementById(moduleName);
  let module = moduleInfo.filter((item) => item.id === moduleName);
  // console.log(module);
  let cnName = module ? module[0].name : moduleName;
  element.innerText = cnName + "   :   " + progress + "%";
}

// 同行关键词
// const gatherHotSearchWord = {id: "queryKeywordByGroups", progress: 0}
const hotWordContent = chrome.runtime.connect({ name: "queryKeywordByGroups" });
hotWordContent.postMessage("queryKeywordByGroups");
hotWordContent.onMessage.addListener((msg) => {
  if (msg.showQueryKeywordByGroupsCard) {
    showQueryKeywordByGroupsCard();
  }
  if (msg.closeQueryKeywordByGroupsCard) {
    closeQueryKeywordByGroupsCard();
  }
  if (msg.moduleName) {
    let { moduleName, progress } = msg;
    if (!Number.isInteger(progress)) {
      progress = progress.toFixed(2);
    }
    updateQueryKeywordByGroupsProgress(moduleName, progress);
  }
});
function showQueryKeywordByGroupsCard() {
  const html =
    `<div id="progress">` +
    `<div id="query-keyword-by-groups">收集同行关键词:初始化</div>` +
    `</div>` +
    `<style>
        #progress {
			    position: fixed;
			    bottom: 2px;
			    right: 2px;
			    width: 200px;
			    font-size: 13px;
			    padding: 5px 10px;
			    border-radius: 3px;
			    background: #409EFF;
			    line-height: 1.5;
			    color: #fff;
			  }
    </style>`;
  const hotWordNode = document.getElementById("progress");
  if (!hotWordNode) {
    const node = document.createElement("div");
    node.innerHTML = html;
    document.body.appendChild(node);
  }
}
function closeQueryKeywordByGroupsCard() {
  const node = document.getElementById("progress");
  if (node) {
    node.parentNode.removeChild(node);
  }
}
function updateQueryKeywordByGroupsProgress(moduleName, progress) {
  const node = document.getElementById("query-keyword-by-groups");
  node.textContent = `${moduleName}: ${progress}%`;
}

// 周数据详细记录
// const weeklyData = {id: "weeklyData", progress: 0};
const weeklyDataContent = chrome.runtime.connect({ name: "weeklyData" });
weeklyDataContent.postMessage("weeklyData");
weeklyDataContent.onMessage.addListener((msg) => {
  if (msg.showWeeklyDataCard) {
    showWeeklyDataCard();
  }
  if (msg.closeWeeklyDataCard) {
    closeWeeklyDataCard();
  }
  if (msg.moduleName) {
    let { moduleName, progress } = msg;
    if (!Number.isInteger(progress)) {
      progress = progress.toFixed(2);
    }
    updateWeeklyDataProgress(moduleName, progress);
  }
});

function showWeeklyDataCard() {
  const html =
    `<div id="progress">` +
    `<div id="weekly-data">周数据详细记录:初始化</div>` +
    `</div>` +
    `<style>
        #progress {
			    position: fixed;
			    bottom: 2px;
			    right: 2px;
			    width: 200px;
			    font-size: 13px;
			    padding: 5px 10px;
			    border-radius: 3px;
			    background: #409EFF;
			    line-height: 1.5;
			    color: #fff;
			  }
        </style>`;
  const weeklyDataNode = document.getElementById("progress");
  if (!weeklyDataNode) {
    const node = document.createElement("div");
    node.innerHTML = html;
    document.body.appendChild(node);
  }
}

function closeWeeklyDataCard() {
  const node = document.getElementById("progress");
  if (node) {
    node.parentNode.removeChild(node);
  }
}

function updateWeeklyDataProgress(moduleName, progress) {
  console.log(moduleName, progress);
  const node = document.getElementById("weekly-data");
  node.textContent = `${moduleName}: ${progress}%`;
}

function isProductPage(url) {
  if (url.includes(".alibaba.com/product/")) {
    return true;
  }
  if (url.includes("alibaba.com/product-detail/")) {
    return true;
  }
  if (url.includes("detail.1688.com")) {
    return true;
  }
  return false;
}

function initProductHelper() {
  console.log(location.href);
  let url = location.href;
  if (isProductPage(url)) {
    //         const html = `<div id="ai-helper-app">` +
    //             `<div class="fix-bottom-box">` +
    //             `<div class="fix-bottom-description">` + `<img width="40px" src="https://market-maoniunet.oss-cn-hangzhou.aliyuncs.com/admin/images/logo-128.png" style="margin-right: 10px"><span style="color: #606266;font-size: ">此商品支持采集到AI操盘手</span>` + `</div>` +
    //             `<div class="fix-bottom-footer">`
    //             +`<button type="button" class="el-button el-button--primary" id="gather-button">开始采集</button>` +
    //             `</div>`
    //             + `</div>` +
    //             `<style>
    //         .fix-bottom-box {
    // 			position: fixed;
    //             right: 50px;
    //             bottom: 50px;
    //             width: 325px;
    //             box-shadow: rgba(0, 0, 0, 0.15) 0px 4px 12px;
    //             z-index: 2147483647;
    //             box-sizing: border-box;
    //             padding: 20px;
    //             background: rgb(255, 255, 255);
    // 			  }
    // 		.el-button {
    //     display: inline-block;
    //     line-height: 1;
    //     white-space: nowrap;
    //     cursor: pointer;
    //     background: #FFF;
    //     border: 1px solid #DCDFE6;
    //     color: #606266;
    //     -webkit-appearance: none;
    //     text-align: center;
    //     -webkit-box-sizing: border-box;
    //     box-sizing: border-box;
    //     outline: 0;
    //     margin: 0;
    //     -webkit-transition: .1s;
    //     transition: .1s;
    //     font-weight: 500;
    //     padding: 12px 20px;
    //     font-size: 14px;
    //     border-radius: 4px;
    // }
    // .el-button--primary {
    //     color: #FFF;
    //     background-color: #409EFF;
    //     border-color: #409EFF;
    // }
    //         </style>`;
    // const aiHelperApp = document.getElementById("ai-helper-app");
    // if (!aiHelperApp) {
    //     const node = document.createElement("div");
    //     node.innerHTML = html;
    //     document.body.appendChild(node);
    // }
    // const button = document.getElementById("gather-button");
    // button.addEventListener("click",() => {
    //     productHelperPort.postMessage({type: "gatherProduct",url});
    // })
  }
}
initProductHelper();

const pluginVersionContent = chrome.runtime.connect({ name: "pluginVersion" });
pluginVersionContent.postMessage("pluginVersion");
