import * as Const from "const";
export const ALI = {
  // 根据关键词获取最佳类目
  // getAliCategoryByKeyword: Const.ALI_CATEGORY_HOST + "posting-proxy/product/catenew/AjaxRecommendPostCategoryNew.htm?",
  getAliCategoryByKeyword:
    Const.ALI_CATEGORY_HOST + "product/category/searchCat.jsonp",
  // 根据关键词查询类目
  queryAliCategoryByKeyword:
    Const.ALI_CATEGORY_HOST + "product/category/searchCat.jsonp",
  // 根据关键词获取排名
  getAliRankByKeyword:
    Const.ALI_RANK_HOST + "product/ranksearch/rankSearch.htm",
};

export const AI = (url) => {
  url = new URL(url);
  let host = url.protocol + "//" + url.hostname + "/api/v1/";
  if (url.hostname.includes("localhost")) {
    host = `${url.protocol}//${url.hostname}:8761/api/v1/`;
  }
  return {
    getKeywordByParam: host + "keywords?",
    putKeywordCategory: host + "keywords/category",
    putKeywordRank: host + "keywords/rankInfo",
    postPeerKeywordRank: host + "keywords/industry",
  };
};
