import _ from "lodash";
import { Axios } from "../common";
import { getCategoryInProductDetailPage } from "../ali_service/same_industry_service";
import saleDataParser from "../util/sale-data-parser";

export default {
  /**
   * 根据关键词搜索销售排名产品，并获取排名卡片信息
   * @param {String} keywords 搜索关键词
   * @param {Number} allocProgress 分配进度，用于回调
   * @param {Function} callback 进度回调函数
   * @returns 返回产品排名卡片信息数组
   */
  async searchSaleRankProducts(keywords, allocProgress, callback) {
    // 根据关键词获取产品列表
    const productList = await this.fetchTradeSearchProductList({ keywords });
    // console.log(keywords, productList);
    // 对产品列表进一步获取排名卡片信息
    const cardList = await this.fetchProductRankCardList(
      productList,
      allocProgress / 4,
      callback
    );

    let totalInquiryMap = {};
    const result = [];
    // 遍历卡片列表，为每个卡片获取销售排名产品列表，并进一步获取每个产品的详细信息
    for (const card of cardList) {
      // 异步获取卡片对应的商品列表和英文排名词
      const { productList, rankWordEn } = await this.fetchSaleRankProductList(
        card.url
      );
      // 如果存在回调函数，则调用回调函数，传入当前处理进度
      if (callback) callback(allocProgress / 4 / cardList.length);
      // 异步获取基于英文排名词的贸易搜索询问次数映射
      if (rankWordEn) {
        const inquiryMap = await this.fetchTradeSearchInquiryMap(rankWordEn);

        totalInquiryMap = Object.assign(totalInquiryMap, inquiryMap);
        console.log(
          "🚀 ~ searchSaleRankProducts ~ totalInquiryMap:",
          totalInquiryMap
        );
      }
      if (!productList) {
        continue;
      }
      let sliceProductList = productList.slice(0, 10);
      // 遍历产品列表，为每个产品添加询问次数和类别信息
      for (const productItem of sliceProductList) {
        const { productId, rankingIndex } = productItem;
        if (result.find((item) => item.productId === productId)) {
          continue;
        }
        // 如果查询映射中存在当前产品的ID，则添加询问次数信息
        if (totalInquiryMap[productId]) {
          // console.log(
          //   `product ${productId} found inquiry ${totalInquiryMap[productId]}`
          // );
          productItem["inquiryCount"] = totalInquiryMap[productId];
          productItem["inquiry90"] = totalInquiryMap[productId];
          const { inquiry30 } = await this.fetchProductPositionDataList({
            productId,
            get90day: false,
          });
          productItem["inquiry30"] = inquiry30;
        }
        // 前面没有查到询盘的，且榜单上排名在前5的
        else if (rankingIndex <= 5) {
          const positionInquiryData = await this.fetchProductPositionDataList({
            productId,
          });
          if (positionInquiryData) {
            const { inquiry30, inquiry90 } = positionInquiryData;
            productItem["inquiry30"] = inquiry30;
            productItem["inquiry90"] = inquiry90;
            productItem["inquiryCount"] = inquiry90;
            console.log(
              `product ${productId} position inquiry data:`,
              positionInquiryData
            );
          }
        }
        if (callback) {
          callback(
            allocProgress / 4 / cardList.length / sliceProductList.length
          );
        }

        // 异步获取产品的类别信息
        try {
          const category = await getCategoryInProductDetailPage(
            productItem.detail
          );
          // 如果成功获取类别信息，则添加到产品项中
          if (category) {
            productItem["category"] = category;
            result.push(productItem);
          }
        } catch (e) {
          console.error(
            "🚀 ~ searchSaleRankProducts ~ productItem.detail get category error:",
            productItem.detail
          );
        }

        // 如果存在回调函数，则调用回调函数，传入当前处理进度
        if (callback) {
          callback(
            allocProgress / 4 / cardList.length / sliceProductList.length
          );
        }
      }
    }
    // 先按询盘降序，再按排序索引升序排序
    // const sortedResult = _.orderBy(
    //   result,
    //   ["inquiryCount", "desc"],
    //   ["rankingIndex", "asc"]
    // );
    // 按类目分类汇总
    const categoryGrouped = _.groupBy(result, "category");
    console.log(
      "🚀 ~ searchSaleRankProducts ~ categoryGrouped:",
      categoryGrouped
    );

    return Object.entries(categoryGrouped)
      .map(([category, products]) => {
        return {
          category,
          count: products.length,
          products: _.orderBy(
            products,
            [
              (obj) => (obj.inquiry90 ? parseInt(obj.inquiry90) : 0),
              (obj) => (obj.inquiry30 ? parseInt(obj.inquiry30) : 0),
              (obj) => obj.rankingIndex ?? Infinity,
            ],
            ["desc", "desc", "asc"]
          ),
        };
      })
      .sort((a, b) => {
        return b.count - a.count;
      });
  },
  /**
   * 异步获取销售排名产品列表
   * @param {string} url - 请求的URL，用于获取产品排名信息
   * @returns {Promise<Array<{productList, rankWordEn}>>} 返回一个Promise，解析为产品对象数组，每个对象包含产品的各种信息，如排名、ID、图片等；如果请求失败，返回空数组。
   */
  async fetchSaleRankProductList(url) {
    // 使用axios发起GET请求
    return await Axios({ url })
      .then((res) => {
        const domRoot = new DOMParser().parseFromString(res, "text/html");
        const localPageInfo = JSON.parse(
          domRoot.getElementById("local-page-info")?.textContent
        );
        const dataList =
          localPageInfo?.modules?.[1]?.data?._fdl_request?.requestList?.[0]
            ?._serverData?.list[0];
        // const rankWord = domRoot
        //   .querySelectorAll(".top-banner-zone-title-cpv")?.[0]
        //   ?.textContent?.trim();
        // // 从HTML响应中解析产品列表项
        // const productList = domRoot.querySelectorAll(
        //   ".hugo4-pc-grid-list .hugo4-pc-grid-item"
        // );
        // const products = [];
        // productList.forEach((element, index) => {
        //   const titleUrl = element.getElementsByTagName("a")?.[0];
        //   const id = titleUrl?.getAttribute("data-pid"); // 提取产品ID
        //   if (id != null) {
        //     // 收集每个产品的详细信息
        //     let image = element
        //       .querySelectorAll(".pic-wrapper .picture-image")?.[0]
        //       .getAttribute("src");
        //     if (image !== undefined && !image.startsWith("http")) {
        //       image = "https:" + image; // 确保图片URL是完整的
        //     }
        //     products.push({
        //       rankWord,
        //       rankOrder: index, // 排名顺序
        //       id, // 产品ID
        //       image, // 产品图片URL
        //       url: titleUrl?.getAttribute("href"), // 产品详情页URL
        //       subject: element
        //         .querySelectorAll(".hugo4-product-element.subject")?.[0]
        //         ?.textContent?.trim(), // 产品标题
        //       price: element
        //         .querySelectorAll(".hugo4-product-element.price")?.[0]
        //         ?.textContent?.trim(), // 产品价格
        //       moq: element
        //         .querySelectorAll(".hugo4-product-element.moq")?.[0]
        //         ?.textContent?.trim(), // 最小起订量
        //       rankingScore: element
        //         .querySelectorAll(".hugo4-product-element.ranking-score")?.[0]
        //         ?.textContent?.trim(), // 排名得分
        //       rankingChange: element
        //         .querySelectorAll(".hugo4-product-element.ranking-change")?.[0]
        //         ?.textContent?.trim(), // 排名变化
        //     });
        //   }
        // });
        return dataList; // 返回解析出的产品列表
      })
      .catch(() => {
        return {}; // 请求失败时返回空数组
      });
  },

  /**
   * 异步获取贸易搜索查询映射
   * @param {string} searchText 搜索文本
   * @returns {Promise<Object>} 返回一个Promise，解析为包含产品ID和计数的对象
   */
  async fetchTradeSearchInquiryMap(searchText) {
    // 使用Axios发起GET请求
    return await Axios({
      method: "get",
      url: "https://www.alibaba.com/trade/search",
      params: {
        // 请求参数
        SearchScene: "themePage",
        themeScene: "cloudTheme",
        themeIds: "feed,order",
        sceneId: "leaderBoard",
        SearchText: searchText,
        themeId: "",
        themeName: "leaderBoard",
      },
    })
      .then((data) => {
        // 解析响应数据
        // const { data } = res;
        const prefixStr = "bannerData: ";
        // 从响应数据中提取banner数据
        const bannerData = data.substring(
          data.indexOf(prefixStr) + prefixStr.length,
          data.indexOf(",\n        offerResultData")
        );
        const bannerJson = JSON.parse(bannerData);
        const result = {};
        // 处理banner数据，生成产品ID和计数的映射
        bannerJson?.operateTheme?.templateData?.cardList?.forEach((card) => {
          card?.rankList?.forEach((item) => {
            result[item.productId] = item.count;
          });
        });
        // console.log(result);
        return result;
      })
      .catch((err) => {
        console.error(err);
        return {};
      });
  },
  /**
   * 根据产品信息获取产品排名卡片列表
   * @param {Array} products 产品信息数组
   * @param {Number} allocProgress 分配进度，用于回调
   * @param {Function} callback 进度回调函数
   * @returns 返回产品排名卡片信息数组
   */
  async fetchProductRankCardList(products, allocProgress, callback) {
    const result = [];
    // 遍历产品，获取每个产品的排名卡片信息
    for (const i in products) {
      const product = products[i];
      let { productUrl } = product;
      // 确保产品URL以http或https开始
      if (!productUrl.startsWith("http")) {
        productUrl = "https:" + productUrl;
      }
      // 获取产品排名卡片信息
      const cardInfo = await this.fetchProductRankCardInfo(productUrl);
      // 如果卡片信息有效且未重复，则添加到结果中
      if (
        !_.isNil(cardInfo) &&
        !result.find(
          ({ cardId, cardType }) =>
            cardId === cardInfo.cardId && cardType == cardInfo.cardType
        )
      ) {
        console.log("🚀 ~ fetchProductRankCardList ~ cardInfo:", cardInfo);
        result.push(cardInfo);
      }
      if (callback) callback(allocProgress / products.length);
    }
    return result;
  },
  /**
   * 根据URL获取产品排名卡片信息
   * @param {String} url 产品排名卡片的URL
   * @returns 返回产品排名卡片信息对象
   */
  fetchProductRankCardInfo(url) {
    // 发起请求并解析HTML以获取卡片信息
    return Axios({
      url,
    }).then((res) => {
      const parser = new DOMParser();
      const domRoot = parser.parseFromString(res, "text/html");
      // 从HTML中提取卡片信息
      const honorary = domRoot.querySelectorAll(
        ".detail-honorary-title.detail-separator"
      )?.[0];

      if (!_.isNil(honorary)) {
        const action = honorary.querySelectorAll("a.popular-action")?.[0];
        const url = action.getAttribute("href");
        const searchParams = new URLSearchParams(new URL(url).search);
        const cardId = searchParams.get("cardId");
        const cardType = searchParams.get("cardType");
        const title = action.textContent;
        // 返回提取的卡片信息
        return { url, title, cardId, cardType };
      }
    });
  },
  /**
   * 获取阿里搜索产品列表
   * @param {String} keywords 关键词
   * @param {Number} page 页数，默认为1
   * @returns 返回产品列表数组
   */
  fetchTradeSearchProductList({ keywords, page = 1 }) {
    // 发起搜索请求并解析结果以获取产品列表
    return Axios({
      url: "https://www.alibaba.com/trade/search",
      params: {
        spm: "a2700.galleryofferlist.0.0.7aba532eIIDrkZ",
        fsb: "y",
        IndexArea: "product_en",
        keywords,
        tag: "all",
        page,
      },
    }).then((res) => {
      try {
        // 从响应中提取产品列表数据
        const prefix = "window.__page__data__config = ";
        const suffix =
          "         window.__page__data = window.__page__data__config.props";
        const pageDaConfigStr = res.substring(
          res.indexOf(prefix) + prefix.length,
          res.indexOf(suffix)
        );
        const pageDataConfig = JSON.parse(pageDaConfigStr);
        return pageDataConfig?.props?.offerResultData?.offers;
      } catch (err) {
        // 从响应中提取产品列表数据
        const prefix = "window.__page__data = ";
        const suffix = `        </script>
                                <script>`;
        const pageDaConfigStr = res.substring(
          res.indexOf(prefix) + prefix.length,
          res.indexOf(suffix)
        );
        console.log(
          "🚀 ~ fetchTradeSearchProductList ~ pageDaConfigStr:",
          pageDaConfigStr
        );
        const pageDataConfig = JSON.parse(pageDaConfigStr);
        return pageDataConfig?.offerResultData?.offers;
      }
    });
  },

  /**
   * 获取产品的销售数据
   */
  async fetchProductPositionDataList({
    productId,
    get30day = true,
    get90day = true,
  }) {
    let inquiry30, inquiry90;
    if (get30day) {
      inquiry30 = await getProductPositionInquiry({
        productId,
        dateType: "30day",
      });
    }
    if (get90day) {
      inquiry90 = await getProductPositionInquiry({
        productId,
        dateType: "90day",
      });
    }
    return {
      inquiry30,
      inquiry90,
    };
  },
};

function getProductPositionInquiry({ productId, dateType }) {
  return Axios({
    url: "https://profile.alibaba.com/selection/ajax/position_data_list_ajax.do",
    params: {
      productId,
      countryCode: "all",
      lang: "en",
      code: "pc_detail_pop_nav_list",
      dateType,
    },
  }).then((res) => {
    const value = res.data
      ?.find((item) => item.code === "saleData")
      ?.subList?.find((item) => item.code === "inquiryNum")?.value;
    if (value) return saleDataParser.decodePositionData(value);
  });
}
