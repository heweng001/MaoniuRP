const productDetailService = {
  getKeywords(res) {
    let keywordStr = res.substring(
      res.indexOfEnd('<meta name="keywords" content="')
    );
    keywordStr = keywordStr.substring(
      0,
      keywordStr.indexOf(" Product on Alibaba.com")
    );
    keywordStr = keywordStr.substring(keywordStr.indexOfEnd("- Buy "));
    const keywords = keywordStr.split(",");
    return keywords;
  },
};

export default productDetailService;
