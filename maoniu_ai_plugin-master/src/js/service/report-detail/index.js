import businessAnalyseService from "@/js/ali_service/business_analyse_service";
import feedbackService from "@/js/ali_service/feedback_quality_service";
import sameIndustryAnalyseService from "@/js/ali_service/same_industry_analyse_service";
import sameIndustryService, {
  infoHighInquiryProductProgress,
  infoTopSaleRankProductProgress,
  resetHighInquiryProductProgress,
  resetScore,
  resetScoreHotProduct,
  resetTopSaleRankProductProgress,
} from "@/js/ali_service/same_industry_service";
import wholeDetailService from "../../ali_service/whole_detail_service";
import mydataService from "../../ali_service/mydata_service";
import p4pService from "../../ali_service/p4p_service";
import showcaseService from "../../ali_service/showcase_service";
// import logan from "../../util/logan"
import { isArrayLength, isBoolean } from "util";
import sleep from "util/sleep";
import {
  BUSINESSANALYSE,
  FEEDBACKANALYSE,
  GET_ERROR,
  HIGHINQUIRYPRODUCTS,
  P4PDATAANALYSE,
  POPULARPRODUCT,
  PRODUCTANALYSE,
  SAMEINDUSTRYANALYSE,
  SAMEINDUSTRYSERVICE,
  SHOWCASETABLE,
  WHOLEDATADETAIL,
  addErrorToArray,
  addModuleNameToArray,
  getModuleData,
} from "../../util/report";
import topSaleRankProductService from "../top-sale-rank-product-service";
// 同行数据
let sameIndustryAnalyseUrls = [];

function getStartAndEndTime(param) {
  let year = new Date().getFullYear();
  let month = new Date().getMonth() - 1;
  let startTime = new Date(year, month, 1);
  let endTime = new Date(year, month + 1, 1);
  let today = new Date();
  if (param.feedbackInterval === "week") {
    startTime = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 7
    );
    endTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }
  if (param.feedbackInterval === "3month") {
    startTime = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    endTime = new Date(today.getFullYear(), today.getMonth(), 1);
  }
  return { startTime: startTime.getTime(), endTime: endTime.getTime() };
}

function setVerificationCodeUrl(data, param) {
  if (isArrayLength(param.keywordArray)) {
    data.verificationCodeUrlPage = `https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&CatId=&tab=all&SearchText=${param.keywordArray[0]}&viewtype=`;
  }
}

const reportDetailService = {
  async getReportDetail(param, ctoken, nickname, progressPort, href) {
    progressPort.postMessage({ showProgressCard: true, param });
    console.time("report-detail");
    console.log("report detail params:", param);
    let data = {};
    let promiseArray = [];
    let successArr = [];
    let errorArr = [];
    let endStatus = true;
    let moduleName = [];
    let lastMonthFeedbackList = [];
    let sameIndustryAnalyseCopy = [];
    let fetchFeedbackPromise;
    // 询盘数据预先抓取(用于询盘质量分析、周数据详细记录（近3个月有效询盘数据）)
    if (param.wholeDataDetail || param.feedbackAnalyse) {
      fetchFeedbackPromise = feedbackService
        .get3MonthFeedbackData(ctoken, progressPort, param)
        .then((threeMonthFeedbackList) => {
          data.threeMonthFeedbackList = threeMonthFeedbackList;
          console.log("three month feedback list data");
          // console.log(threeMonthFeedbackList);
          let { startTime, endTime } = getStartAndEndTime(param);
          console.log(startTime, endTime);
          lastMonthFeedbackList = threeMonthFeedbackList.filter((item) => {
            if (item.createTime >= startTime && item.createTime <= endTime) {
              return true;
            }
            return false;
          });
          // console.log(lastMonthFeedbackList);
        })
        .catch((e) => {
          console.log(`预先抓取询盘数据出错${e}`);
        });
    }
    //业务分析
    if (param.businessAnalyse) {
      console.time("businessAnalyse");
      console.log("businessAnalyse start");
      let businessAnalysePromise = businessAnalyseService.businessAnalyse(
        ctoken,
        data.feedbackQualityAnalyse,
        progressPort
      );
      businessAnalysePromise = businessAnalysePromise
        .then((businessAnalyseData) => {
          Object.assign(data, {
            businessAnalyseData,
          });
          console.log("businessAnalyse end :", businessAnalyseData);
          console.timeEnd("businessAnalyse");

          const accountBasicDataList = getModuleData(
            businessAnalyseData,
            "accountBasicData",
            BUSINESSANALYSE + "--账号基础数据",
            nickname
          );
          const visitorDataList = getModuleData(
            businessAnalyseData,
            "visitorData",
            BUSINESSANALYSE + "--访客营销",
            nickname
          );
          successArr.push(accountBasicDataList, visitorDataList);
        })
        .catch((e) => {
          console.error(e);
          addErrorToArray(errorArr, BUSINESSANALYSE);
          console.log(BUSINESSANALYSE + GET_ERROR, nickname);
        })
        .finally(() => {
          addModuleNameToArray(moduleName, BUSINESSANALYSE);
        });
      promiseArray.push(businessAnalysePromise);
    }
    // 流量分析
    if (param.p4pDataAnalyse) {
      console.time("p4pDataAnalyse");
      console.log("p4pDataAnalyse start");

      let p4pDataAnalysePromise = p4pService
        .p4pDataAnalyse(ctoken, progressPort)
        .then((p4pDataAnalyse) => {
          Object.assign(data, {
            p4pDataAnalyse,
          });
          console.log("p4pDataAnalyse end: ", p4pDataAnalyse);
          console.timeEnd("p4pDataAnalyse");

          const keywordAnalyseData = getModuleData(
            p4pDataAnalyse,
            "keywordAnalyseData",
            P4PDATAANALYSE + "--引流关键词",
            nickname
          );
          const productAnalyseData = getModuleData(
            p4pDataAnalyse,
            "productAnalyseData",
            P4PDATAANALYSE + "--付费推广产品",
            nickname
          );
          successArr.push(productAnalyseData, keywordAnalyseData);
        })
        .catch((e) => {
          console.error(e);
          addErrorToArray(errorArr, P4PDATAANALYSE);
          console.log(P4PDATAANALYSE + GET_ERROR, nickname);
        })
        .finally(() => {
          addModuleNameToArray(moduleName, P4PDATAANALYSE);
        });
      promiseArray.push(p4pDataAnalysePromise);
    }

    // 橱窗信保
    if (param.showcaseTable) {
      console.time("showcaseTable");
      console.log("showcaseTable start");
      let showcaseTablePromise = showcaseService
        .showcaseTableData(ctoken, param.isReport, progressPort, href)
        .then((showcaseTableData) => {
          Object.assign(data, {
            showcaseTableData,
          });
          console.log(showcaseTableData);
          console.log("showcaseTableData end: ", showcaseTableData);
          console.timeEnd("showcaseTableData");

          const showcaseProduct = getModuleData(
            showcaseTableData,
            "showcaseProductList",
            SHOWCASETABLE + "--橱窗产品",
            nickname
          );
          const emphasisKeywordRank = getModuleData(
            showcaseTableData,
            "emphasisKeywordRankList",
            SHOWCASETABLE + "--重点关键词",
            nickname
          );
          const creditOrder = getModuleData(
            showcaseTableData,
            "creditOrderList",
            SHOWCASETABLE + "--信保走单情况",
            nickname
          );
          successArr.push(creditOrder, emphasisKeywordRank, showcaseProduct);
        })
        .catch((e) => {
          console.error(e);
          addErrorToArray(errorArr, SHOWCASETABLE);
          console.log(SHOWCASETABLE + GET_ERROR, nickname);
        })
        .finally(() => {
          addModuleNameToArray(moduleName, SHOWCASETABLE);
        });
      promiseArray.push(showcaseTablePromise);
    }

    // 转化分析
    if (param.productAnalyse) {
      console.time("productAnalyse");
      console.log("productAnalyse start");
      let productAnalysePromise = mydataService
        .productAnalyse(data, ctoken, progressPort)
        .then((productAnalyse) => {
          Object.assign(data, {
            productAnalyse,
          });
          console.log("productAnalyse end: ", productAnalyse);
          console.timeEnd("productAnalyse");

          const convertionAnalyse = getModuleData(
            productAnalyse,
            "conversionRateTableData",
            PRODUCTANALYSE + "--店铺转化分析",
            nickname
          );
          const conversionRateTable = getModuleData(
            productAnalyse,
            "productConversionData",
            PRODUCTANALYSE + "--产品转化分析",
            nickname
          );
          successArr.push(conversionRateTable, convertionAnalyse);
        })
        .catch((e) => {
          console.error(e);
          addErrorToArray(errorArr, PRODUCTANALYSE);
          console.log(PRODUCTANALYSE + GET_ERROR, nickname);
        })
        .finally(() => {
          addModuleNameToArray(moduleName, PRODUCTANALYSE);
        });
      promiseArray.push(productAnalysePromise);
    }
    //同行重点产品分析
    if (param.sameIndustryService) {
      console.time("sameIndustryService");
      console.log("sameIndustryService start");

      let sameIndustryProductPromise = sameIndustryAnalyseService
        .sameIndustryService(ctoken, param.sameIndustryUrl, progressPort)
        .then((sameIndustryProductData) => {
          console.log(sameIndustryProductData);
          Object.assign(data, {
            sameIndustryProductPromise: sameIndustryProductData,
          });
          console.log("sameIndustryService end: ", sameIndustryProductData);
          console.timeEnd("sameIndustryService");
        })
        .catch((e) => {
          console.error(e);
          addErrorToArray(errorArr, SAMEINDUSTRYSERVICE);
          console.log(SAMEINDUSTRYSERVICE + GET_ERROR, nickname);
        })
        .finally(() => {
          addModuleNameToArray(moduleName, SAMEINDUSTRYSERVICE);
        });
      promiseArray.push(sameIndustryProductPromise);
    }
    //询盘质量分析
    if (param.feedbackAnalyse) {
      console.time("feedbackAnalyse");
      console.log("feedback quality start");
      await fetchFeedbackPromise;
      let feedbackQualityPromise = feedbackService
        .feedbackQualityAnalyse(
          ctoken,
          param.feedbackInterval,
          lastMonthFeedbackList,
          progressPort,
          // fetchFeedbackPromise,
          param.feedbackDetails
        )
        .then((feedbackQualityAnalyse) => {
          Object.assign(data, {
            feedbackQualityAnalyse,
          });
          console.log("feedback quality start end :", feedbackQualityAnalyse);
          console.timeEnd("feedbackAnalyse");

          const shopRegionList = getModuleData(
            feedbackQualityAnalyse,
            "shopRegion",
            FEEDBACKANALYSE + "--国家分布",
            nickname
          );
          const groupStatisticsList = getModuleData(
            feedbackQualityAnalyse,
            "groups",
            FEEDBACKANALYSE + "--询盘产品分布",
            nickname
          );
          const feedbackSubjectListList = getModuleData(
            feedbackQualityAnalyse,
            "feedbackSubjectList",
            FEEDBACKANALYSE + "--买家分布明细",
            nickname
          );
          successArr.push(
            feedbackSubjectListList,
            shopRegionList,
            groupStatisticsList
          );
        })
        .catch((e) => {
          console.error(e);
          addErrorToArray(errorArr, FEEDBACKANALYSE);
          console.log(FEEDBACKANALYSE + GET_ERROR, nickname);
        })
        .finally(() => {
          addModuleNameToArray(moduleName, FEEDBACKANALYSE);
        });
      promiseArray.push(feedbackQualityPromise);
    }
    //周数据详细记录
    if (param.wholeDataDetail) {
      console.time("wholeDataDetail");
      console.log("wholeDetailData start");
      await fetchFeedbackPromise;
      let wholeDetailPromise = wholeDetailService
        .wholeDetail(ctoken, param.isTrade, param.nick, progressPort)
        .then((wholeDetailData) => {
          Object.assign(data, {
            wholeDetailData,
          });
          console.log("wholeDetailData end :", wholeDetailData);
          console.timeEnd("wholeDataDetail");

          const industryDataList = getModuleData(
            wholeDetailData,
            "industryData",
            WHOLEDATADETAIL + "--整体数据",
            nickname
          );
          successArr.push(industryDataList);
        })
        .catch((e) => {
          console.error(e);
          addErrorToArray(errorArr, WHOLEDATADETAIL);
          console.log(WHOLEDATADETAIL + GET_ERROR, nickname);
        })
        .finally(() => {
          addModuleNameToArray(moduleName, WHOLEDATADETAIL);
        });
      promiseArray.push(wholeDetailPromise);
    }
    // 选品分析(按询盘)
    if (param.popularProductHighInquiry || param.popularProductHotSelling) {
      console.time("popularProduct");
      console.log("popularProduct");
      const name = "hotProductAnalyse";
      resetScoreHotProduct();
      progressPort.postMessage({ name, progress: 0 });
      const popularProductList = [];
      const keywords = param.keywordArray;
      for (const keyword of keywords) {
        const popularProductServicePromise = sameIndustryService
          .popularProductHighInquiry(
            ctoken,
            keyword,
            param,
            progressPort,
            keywords.length
          )
          .then((popularProductData) => {
            if (isBoolean(popularProductData)) {
              data.isExistVerificationCode = true;
            } else {
              popularProductList.push(popularProductData);
            }
            if (param.popularProductHighInquiry) {
              const highInquiryProductsList = getModuleData(
                popularProductData,
                "highInquiryProducts",
                POPULARPRODUCT + `${keyword}(按询盘)--数据列表`,
                nickname
              );
              successArr.push(highInquiryProductsList);
            }
            if (param.popularProductHotSelling) {
              const hotSellingProductsList = getModuleData(
                popularProductData,
                "hotSellingProducts",
                POPULARPRODUCT + `${keyword}(按销量)--数据列表`,
                nickname
              );
              successArr.push(hotSellingProductsList);
            }
          })
          .catch((err) => {
            console.error(err);
            addErrorToArray(errorArr, POPULARPRODUCT + keyword);
            console.log(POPULARPRODUCT + GET_ERROR + keyword, nickname);
          })
          .finally(() => {
            addModuleNameToArray(
              moduleName,
              POPULARPRODUCT + keyword + "(询盘/销量)"
            );
          });
        promiseArray.push(popularProductServicePromise);
      }
      Object.assign(data, {
        popularProductList,
      });
      progressPort.postMessage({ name, progress: 100 });
    }

    // 同行分析
    if (param.sameIndustryAnalyse) {
      console.time("sameIndustryAnalyse");
      console.log("sameIndustryAnalyse start");
      const name = "sameIndustryAnalyse";
      resetScore();
      progressPort.postMessage({ name, progress: 0 });
      const sameIndustryAnalyseList = [];
      const keywords = param.keywordArray;
      for (const keyword of keywords) {
        try {
          await sleep(500);
          const sameIndustryAnalyse =
            await sameIndustryService.sameIndustryAnalyse(
              ctoken,
              keyword,
              param.sameIndustryUrl,
              progressPort,
              keywords.length,
              false
            );
          if (isBoolean(sameIndustryAnalyse)) {
            data.isExistVerificationCode = true;
            continue;
          }
          sameIndustryAnalyseCopy[keyword] = JSON.parse(
            JSON.stringify(sameIndustryAnalyse)
          );
          sameIndustryAnalyseList.push(sameIndustryAnalyse);
          const effectDataList = getModuleData(
            sameIndustryAnalyse,
            "effectData",
            SAMEINDUSTRYANALYSE + `${keyword}--效果数据`,
            nickname
          );
          const sameIndustryAnalyseUrl = sameIndustryAnalyse.effectData.map(
            (m) => m.productDetailUrl
          );
          sameIndustryAnalyseUrls.push({ sameIndustryAnalyseUrl, keyword });
          successArr.push(effectDataList);
        } catch (e) {
          console.error(e);
          addErrorToArray(errorArr, SAMEINDUSTRYANALYSE + keyword);
          console.log(SAMEINDUSTRYANALYSE + GET_ERROR + keyword, nickname);
        } finally {
          addModuleNameToArray(moduleName, SAMEINDUSTRYANALYSE + keyword);
        }
      }
      Object.assign(data, {
        sameIndustryAnalyseList,
      });
      progressPort.postMessage({ name, progress: 100 });
    }
    // 高询盘产品
    if (param.highInquiryProductList) {
      console.time("highInquiryProducts");
      console.log("highInquiryProducts start");
      const name = "highInquiryProducts";
      resetHighInquiryProductProgress();
      progressPort.postMessage({ name, progress: 0 });
      const keywords = param.keywordArray;
      const highInquiryProductList = [];
      for (const keyword of keywords) {
        try {
          await sleep(500);
          let sameIndustryAnalyseResult;
          if (sameIndustryAnalyseCopy[keyword]) {
            sameIndustryAnalyseResult = sameIndustryAnalyseCopy[keyword];
            infoHighInquiryProductProgress(progressPort, 50);
          } else {
            sameIndustryAnalyseResult =
              await sameIndustryService.sameIndustryAnalyse(
                ctoken,
                keyword,
                param.sameIndustryUrl,
                progressPort,
                keywords.length,
                true
              );
            console.log(
              "sameIndustryAnalyse result ",
              sameIndustryAnalyseResult
            );
            if (isBoolean(sameIndustryAnalyseResult)) {
              data.isExistVerificationCode = true;
              continue;
            }
          }
          const productDataList = [];
          for (let item of sameIndustryAnalyseResult.effectData) {
            await sleep(500);
            const productData =
              await sameIndustryService.getHighInquiryProductPage(
                item.productDetailUrl
              );
            let { category, iquiries, pageViews } = item;
            Object.assign(productData, { category, iquiries, pageViews });
            infoHighInquiryProductProgress(
              progressPort,
              50 / keywords.length / sameIndustryAnalyseResult.effectData.length
            );
            productDataList.push(productData);
          }
          highInquiryProductList.push({
            highInquiryProductList: productDataList,
            keyword,
          });
        } catch (e) {
          console.error(e);
          addErrorToArray(errorArr, HIGHINQUIRYPRODUCTS + keyword);
          console.log(HIGHINQUIRYPRODUCTS + GET_ERROR + keyword, nickname);
        } finally {
          addModuleNameToArray(moduleName, HIGHINQUIRYPRODUCTS + keyword);
        }
      }
      Object.assign(data, {
        highInquiryProductList,
      });
      progressPort.postMessage({ name, progress: 100 });
    }
    // 榜单产品
    if (param.topSaleRankProduct) {
      console.time("topSaleRankProduct");
      console.log("topSaleRankProduct start");
      const moduleName = "topSaleRankProduct";
      resetTopSaleRankProductProgress();
      progressPort.postMessage({ moduleName, progress: 0 });
      const keywords = param.keywordArray;
      const topSaleRankProductList = [];

      for (const i in keywords) {
        const keyword = keywords[i];
        try {
          const offers = await topSaleRankProductService.searchSaleRankProducts(
            keyword,
            100 / keywords.length,
            (progress) => {
              infoTopSaleRankProductProgress(progressPort, progress);
            }
          );
          topSaleRankProductList.push({
            keyword,
            products: offers,
          });
        } catch (err) {
          console.error(err);
        }
      }
      Object.assign(data, {
        topSaleRankProductList,
      });
      successArr.push(
        getModuleData(
          { topSaleRankProductList },
          "topSaleRankProductList",
          POPULARPRODUCT + `${keywords.join(",")}--榜单产品`,
          nickname
        )
      );
      progressPort.postMessage({ name: moduleName, progress: 100 });
    }
    await Promise.all(promiseArray);
    console.timeEnd("report-detail");
    console.log(data);
    successArr = successArr.flat(1);
    if (errorArr.length > 0) {
      endStatus = false;
    }
    progressPort.postMessage({ closeProgressCard: true });
    if (data.isExistVerificationCode) {
      setVerificationCodeUrl(data, param);
    }
    return {
      success: true,
      data,
      nickname,
      message: "",
      successArr,
      errorArr,
      endStatus,
      moduleName,
    };
  },
};

export default reportDetailService;
