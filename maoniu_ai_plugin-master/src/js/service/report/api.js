import * as Const from "@/js/const";
export const ALI_REPORT = {
  // 获取公司信息
  getAliShopInfo: Const.ALI_SHOP_HOST + "sp/form/selectBizType.htm",
  // 获取产品操作
  getAliProductOperation: Const.ALI_PRODUCT_STATS_HOST + "self/.json",
  // 获取180天零效果产品操作
  postAliNoEffectProduct: Const.ALI_PRODUCT_STATS_HOST + "self/.json",
  // 获取已上架产品
  getAliShelfProduct:
    Const.ALI_PRODUCT_MANAGEMENT_HOST +
    "product/managementproducts/asyQueryProductsList.do",
  // 获取视频产品
  getAliVideoProduct:
    Const.ALI_PRODUCT_MANAGEMENT_HOST +
    "product/managementproducts/asyQueryProductsList.do",
  // 获取实力优品
  getAliExcellentProduct:
    Const.ALI_PRODUCT_MANAGEMENT_HOST +
    "product/managementproducts/asyQueryProductsListWithPowerScore.do",
  //getAliExcellentProduct: Const.ALI_PRODUCT_MANAGEMENT_HOST+ "product/managementproducts/asyCountProductsForPowerTabs.do",
  // 获取问题产品
  getAliProblemProduct:
    Const.ALI_PRODUCT_OPTIMIZATION_HOST +
    "diagnosis/order/productOptimizationListAjax.do",
  // 获取重复产品
  getAliDuplicateProduct:
    Const.ALI_PRODUCT_OPTIMIZATION_HOST +
    "diagnosis/order/productRepeatListAjax.do",
  // 上月上架产品数
  postAliMonthShelfProduct: Const.ALI_PRODUCT_STATS_HOST + "self/.json",
  // 上月有效产品数
  postAliMonthEffectProduct: Const.ALI_PRODUCT_STATS_HOST + "self/.json",
  //  月关键词操作数
  postAliMonthP4pKeywords: Const.ALI_P4P_KEYWORD + "p4preport/asyGetSyslog.do",
  //  P4P操作记录asyGetAdKeyword.do
  postAliP4pAdKeywordsReport: Const.ALI_P4P_KEYWORD + "asyGetAdKeyword.do",
  //  3星以下推广关键词
  postAliLessThreeStarAdKeywords: Const.ALI_P4P_KEYWORD + "asyGetAdKeyword.do",
  //  5星推广关键词
  postAliFiveStarAdKeywords: Const.ALI_P4P_KEYWORD + "asyGetAdKeyword.do",
  // P4P关键词排名位置
  postAliP4pAdKeywordsRank: Const.ALI_P4P_KEYWORD + "asyGetKeywordRankBack.do",
  //  推广时长和花费
  postAliPromotionAndCost:
    Const.ALI_P4P_KEYWORD + "p4preport/asyGetAccountReport.do",
  //  推广时长和花费(New)
  postAliPromotionAndCostNew: Const.ALI_P4P_KEYWORD + "api/report/account",
  //  每日预算
  getAliDailyBudget: Const.ALI_P4P_KEYWORD + "asyGetAdKeyword.do",
  //  获取广告橱窗ID
  postWindowId: Const.ALI_SHOWCASE_HOST + "api/campaign/find/showcase",
  //  橱窗剩余数
  postAliWindowRemainCount: Const.ALI_SHOWCASE_HOST + "api/showcase/overview",
  //  橱窗无效数
  postAliWindowInvalidCount: Const.ALI_SHOWCASE_HOST,
  //  获取新橱窗列表
  postAliWindowListNew: Const.ALI_SHOWCASE_HOST,
  //  获取橱窗列表
  postAliWindowList: Const.ALI_SHOWCASE_HOST + "asyGetWindowList.do",
  //  获取新橱窗操作记录
  postAliWindowSysLogNew: Const.ALI_SHOWCASE_HOST + "api/log",
  //  获取橱窗操作记录
  postAliWindowSysLog: Const.ALI_SHOWCASE_HOST + "asyShowSysLogList.do",
  //  获取月询盘记录
  postAliMonthInquiry: Const.ALI_PRODUCT_STATS_HOST + "self/.json",
  //  获取上个月员工统计
  getAliLastMonthStaffStats: Const.ALI_PRODUCT_STATS_HOST + "self/.json",
  //  获取分组数据
  postAliGroup: Const.ALI_PRODUCT_STATS_HOST + "self/.json",
  //  一级分组统计
  postAliTimelyResponseRate: Const.ALI_PRODUCT_STATS_HOST + "self/.json",
  //  访客营销
  getAliVisitorMarketingRate: Const.ALI_PRODUCT_STATS_HOST + "self/.json",
  //  获取商家星级
  getAliFinalStar: Const.ALI_SUPPLIER_HOST + "capability/fetchFinalStar.json",
  //  获取交易力
  getAliShoeTrade:
    Const.ALI_SUPPLIER_HOST + "capability/fetchIndicatorsByType.json",
  //  获取粉丝动态
  getAliFan: Const.ALI_CONTENT_HOST + "api/list/content",
  //  获取RFQ数据
  postAliRFQ: Const.ALI_SOURCE_HOST + "rfq/quotation/getEquityListAjax.do",
  //  获取p4p关键词报告
  postAli7DaysP4pKeyWordReport: Const.ALI_P4P_KEYWORD + "api/report/keyword",
  //  获取p4p账号报告
  postAli7DaysP4pAccountReport: Const.ALI_P4P_KEYWORD + "api/report/account",
  //  获取p4p30天关键词账号报告
  postAliDaysP4pProductReport: Const.ALI_P4P_KEYWORD + "api/report/product",
  //  获取p4p30天异常产品数据
  postAliExceptionProductReport: Const.ALI_PRODUCT_STATS_HOST + "self/.json",
  //  获取询盘减少产品数据
  postAliEnquiryReductionProduct: Const.ALI_PRODUCT_STATS_HOST + "self/.json",
  //  获取异常产品近30操作和趋势数据
  postAliExceptionProductDay30TrendsAndOperatorReport:
    Const.ALI_PRODUCT_STATS_HOST + "self/.json",
  //  获取7天账号统计
  postAli7DaysAccountStat: Const.ALI_PRODUCT_STATS_HOST + "self/.json",
  //  获取7天单个产品统计
  postAli7DaysSingleProductStat: Const.ALI_PRODUCT_STATS_HOST + "self/.json",
  //  获取最近30天信保订单
  getAliLast30DayCreditGuaranteeOrder:
    Const.ALI_CREDIT_HOST + "diagnosis/order/supplierRatingDealsListAjax.do",
  //  获取最近30天信保订单(new)
  getAliLast30DayCreditGuaranteeOrderNew:
    Const.ALI_PRODUCT_STATS_HOST + "self/.json",
  //  获取_csrf_token_
  getAliCsrfToken: Const.ALI_P4P_KEYWORD + "manage_ad_keyword.htm",
  //  获取_csrf
  getAliCsrf: Const.ALI_P4P_KEYWORD + "api/csrf",
  //  获取橱窗_csrf
  getShowcaseCsrf: Const.ALI_WINDOW_HOST + "api/csrf",
  //  粉丝_csrf
  getContentCsrf: Const.ALI_CONTENT_HOST + "publish_list",
  //  获取非p4p_csrf_token_
  getAliNonP4pCsrfToken:
    Const.ALI_RANK_HOST + "product/ranksearch/rankSearch.htm",
  //  获取店铺主要类目id
  getAliIndustries: Const.ALI_PRODUCT_STATS_HOST + "self/.json",
};

export const AI_REPORT = (url) => {
  url = new URL(url);
  let host = url.protocol + "//" + url.hostname + "/api/v1/";
  return {
    getKeywordByParam: host + "keywords?",
    getEmphasisKeyword: host + "keywords/emphasis",
    putKeywordCategory: host + "keywords/category",
    putKeywordRank: host + "keywords/rankInfo",
    postPeerKeywordRank: host + "keywords/industry",
  };
};
