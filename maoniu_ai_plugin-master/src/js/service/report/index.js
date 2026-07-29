import aliService from "aliService";
import { getNested } from "util";

function checkIsInnerReport(param) {
  let nick = getNested(param, "query", "nick") || "";
  return nick !== "";
}

const reportService = {
  async getConclusionReport(param, ctoken, nickname, port) {
    console.time("report");
    port.postMessage({ showProgressCard: true, param });
    await aliService.init();
    const isInnerReport = checkIsInnerReport(param);
    currentProgress = 0;
    // 1.1商家星等级情况
    let starInfo = await aliService.checkStarInfo(ctoken);
    infoProgress(port);
    // 2.1产品数过少
    let tooFewProducts = await aliService.checkTooFewProducts(ctoken);
    infoProgress(port);
    // 2.2自然点击占比过低
    let natureClickInfo = await aliService.checkNaturalClick(ctoken);
    infoProgress(port);
    // 2.3重点关键词未设置(内部报告)
    let emphasisKeywordNotSet;
    if (isInnerReport) {
      emphasisKeywordNotSet = await aliService.checkEmphasisKeyword(param);
    }
    infoProgress(port);
    // 2.5橱窗询盘占比
    let windowInquiry = await aliService.checkWindowInquiry();
    infoProgress(port);
    // 2.6橱窗实力优品占比
    let windowExcellentProduct = await aliService.checkWindowExcellentProduct();
    infoProgress(port);
    // 2.7橱窗操作
    let windowOperation = await aliService.checkWindowOperation();
    infoProgress(port);
    // 2.8自然流量板块优化整体建议
    // let naturalFlowTotalSuggestion =
    //   await aliService.checkNaturalFlowTotalSuggestion(
    //     ctoken,
    //     natureClickInfo,
    //     emphasisKeywordNotSet,
    //     windowInquiry,
    //     windowExcellentProduct,
    //     windowOperation
    //   );
    // infoProgress(port);
    //3.1 开启广告推广
    // const advertise = await aliService.checkAdvertise();
    // infoProgress(port);
    //3.2 推广时长
    const promotionTime = await aliService.checkPromotionTime();
    infoProgress(port);
    //3.3 点击率
    const clickRate = await aliService.checkClickRate();
    infoProgress(port);
    //3.4 点击率异常
    const clickRateAnomaly = await aliService.checkClickRateAnomaly();
    infoProgress(port);
    //3.5 高话费无询盘
    // const noInquiry = await aliService.checkNoInquiry()
    infoProgress(port);
    //3.6 三星以下占比
    // const threeStarLowRate = await aliService.checkThreeStarLowRate(ctoken);
    // infoProgress(port);
    //3.7 地域/人群溢价
    const noSetArea = await aliService.checkNoSetArea();
    infoProgress(port);
    //3.8 自选关键词
    // const chooseKeyword = await aliService.checkChooseKeyword()
    infoProgress(port);
    //3.9 屏蔽词
    const shieldKeyword = await aliService.checkShieldKeyword();
    infoProgress(port);
    //4.1 场景推荐流量
    const referralTraffic = await aliService.checkReferralTrafficList(ctoken);
    infoProgress(port);
    //4.2 爆品
    const explosiveGoods = await aliService.checkExplosiveGoodsList(ctoken);
    infoProgress(port);
    //5.1询盘TM转化率
    // const fbTmConversionRate = await aliService.checkCategoryConversionRate(
    //   ctoken
    // );
    // infoProgress(port);
    //5.2高点击反馈产品
    // const heightClickProduct = await aliService.checkHeightClickProduct(ctoken)
    // infoProgress(port);
    //6.1 店铺信息完整度
    const shopIntegrity = await aliService.checkShopIntegrity();
    infoProgress(port);
    //6.2 产品发布
    const newProduct = await aliService.checkNewProduct(ctoken);
    infoProgress(port);
    //6.3 修改产品
    const editProduct = await aliService.checkEditProduct(ctoken);
    infoProgress(port);
    //6.4 实力优品
    // const potentialProduct = await aliService.checkPotentialProduct(ctoken);
    // infoProgress(port);
    //6.5 零效果
    const noEffectProduct = await aliService.checkNoEffectProduct(ctoken);
    infoProgress(port);
    //6.6 待化问题产品
    const problemProduct = await aliService.checkProblemProduct(ctoken);
    infoProgress(port);
    //6.7 视频产品
    const videoProduct = await aliService.checkVideoProduct(ctoken);
    infoProgress(port);
    //7.1 买家评分
    const buyerReviewScore = await aliService.checkBuyerReviewScore();
    infoProgress(port);
    //7.2 平均回复时长
    const avgResponseTime = await aliService.checkAvgResponseTime(ctoken);
    infoProgress(port);
    //7.3 二次回复率
    //
    //7.4 RFQ
    const rfq = await aliService.checkRFQ(ctoken);
    infoProgress(port);
    //7.41 订阅机构
    const subscription = await aliService.checkSubscription();
    infoProgress(port);
    //7.5 访客营销
    // const visitorMarketing = await aliService.checkVisitorMarketing(ctoken)
    infoProgress(port);
    //7.6 TrueView
    // const trueView = await aliService.checkTrueView(ctoken);
    // infoProgress(port);

    infoProgressComplete(port);
    console.timeEnd("report");

    let data = {
      starInfo,
      tooFewProducts,
      natureClickInfo,
      emphasisKeywordNotSet,
      windowInquiry,
      windowExcellentProduct,
      windowOperation,
      // naturalFlowTotalSuggestion,
      // advertise,
      promotionTime,
      clickRate,
      clickRateAnomaly,
      // noInquiry,
      // threeStarLowRate,
      noSetArea,
      // chooseKeyword,
      shieldKeyword,
      referralTraffic,
      explosiveGoods,
      // fbTmConversionRate,
      // heightClickProduct,
      shopIntegrity,
      newProduct,
      editProduct,
      // potentialProduct,
      noEffectProduct,
      problemProduct,
      videoProduct,
      buyerReviewScore,
      avgResponseTime,
      rfq,
      subscription,
      // visitorMarketing,
      // trueView,
    };
    return { success: true, data, nickname, message: "" };
  },
};
let currentProgress = 0;
const eachProgress = 100 / 35;

function infoProgress(port) {
  const moduleName = "DiagnosisConclusion";
  currentProgress += eachProgress;
  port.postMessage({ moduleName, progress: currentProgress });
}

function infoProgressComplete(port) {
  const moduleName = "DiagnosisConclusion";
  port.postMessage({ moduleName, progress: 100 });
}

export default reportService;
