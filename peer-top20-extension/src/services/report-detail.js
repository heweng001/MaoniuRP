import { fetchPeerTop20 } from './peer-same-industry.js';
import { CaptchaError } from './compare-products.js';
import { isBoolean } from 'util/index';
import sleep from 'util/sleep';

const SAME_INDUSTRY_LABEL = 'sameIndustryAnalyse';

function waitForTbToken(maxWaitMs = 3000) {
  return new Promise((resolve) => {
    const startedAt = Date.now();

    const poll = () => {
      chrome.cookies.get(
        { name: '_tb_token_', url: 'https://i.alibaba.com' },
        (cookie) => {
          if (cookie?.value || Date.now() - startedAt >= maxWaitMs) {
            resolve(cookie?.value || '');
            return;
          }
          setTimeout(poll, 100);
        },
      );
    };

    poll();
  });
}

function hasPeerRecords(item) {
  const grouped = item?.effectDataCategoryGrouped || [];
  if (grouped.some((group) => group.value?.length)) {
    return true;
  }
  return (item?.effectData?.length || 0) > 0;
}

function buildEmptyDataMessage(data, keywords, errorMessage) {
  if (data.isExistVerificationCode) {
    return `阿里巴巴出现验证码，请先完成验证后再试。搜索链接：${data.verificationCodeUrlPage}`;
  }
  if (errorMessage) {
    return `抓取失败：${errorMessage}`;
  }
  return '未抓取到任何同行店铺数据，请确认已登录阿里巴巴国际站且关键词有效';
}

const reportDetailService = {
  async getReportDetail(param, ctoken, nickname, progressPort) {
    const data = {};
    const successArr = [];
    const errorArr = [];
    const moduleName = [];
    let endStatus = true;

    if (!param?.sameIndustryAnalyse) {
      return {
        success: false,
        message: '请开启 sameIndustryAnalyse 参数',
      };
    }

    const keywords = (param.keywordArray || [])
      .map((item) => String(item).trim())
      .filter(Boolean);

    if (!keywords.length) {
      return {
        success: false,
        message: '请输入至少一个关键词',
      };
    }

    progressPort.postMessage({ showProgressCard: true, param });

    console.time('peer-top20-report-detail');
    const sameIndustryAnalyseList = [];

    try {
      await sleep(200);
      await waitForTbToken();
      progressPort.postMessage({ name: SAME_INDUSTRY_LABEL, progress: 0 });

      const sameIndustryAnalyse = await fetchPeerTop20({
        keywords,
        searchPageCount: param.searchPageCount,
        onProgress: (progress, message) => {
          progressPort.postMessage({
            name: SAME_INDUSTRY_LABEL,
            progress,
            message,
          });
        },
      });

      if (isBoolean(sameIndustryAnalyse)) {
        data.isExistVerificationCode = true;
        data.verificationCodeUrlPage = `https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&CatId=&SearchText=${encodeURIComponent(keywords[0])}`;
        data.captchaSource = 'search';
        errorArr.push('验证码');
      } else {
        sameIndustryAnalyseList.push(sameIndustryAnalyse);
        successArr.push(sameIndustryAnalyse);
        progressPort.postMessage({ name: SAME_INDUSTRY_LABEL, progress: 100 });
      }
    } catch (error) {
      console.error(error);
      if (error instanceof CaptchaError) {
        data.isExistVerificationCode = true;
        const captchaPage = error.captchaUrl || error.verifyUrl || '';
        if (captchaPage) {
          data.verificationCodeUrlPage = captchaPage;
          data.captchaSource = 'detail';
        }
        errorArr.push('验证码');
      } else {
        errorArr.push(error.message || '抓取失败');
      }
    } finally {
      moduleName.push(`${SAME_INDUSTRY_LABEL}:${keywords.join('、')}`);
    }

    Object.assign(data, {
      sameIndustryAnalyseList,
      keywords,
      feedbackInterval: param.feedbackInterval || 'month',
      timings: sameIndustryAnalyseList[0]?.timings || null,
    });

    if (data.isExistVerificationCode && !data.verificationCodeUrlPage) {
      data.verificationCodeUrlPage = `https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&CatId=&SearchText=${encodeURIComponent(keywords[0])}`;
      data.captchaSource = 'search';
    }

    if (errorArr.length > 0 && !sameIndustryAnalyseList.length) {
      endStatus = false;
    }

    progressPort.postMessage({ closeProgressCard: true });
    console.timeEnd('peer-top20-report-detail');

    const hasAnyData = sameIndustryAnalyseList.some(hasPeerRecords);
    const errorMessage = errorArr.join(', ');

    return {
      success: hasAnyData,
      data,
      nickname,
      message: hasAnyData
        ? errorArr.length
          ? `抓取异常: ${errorMessage}`
          : ''
        : buildEmptyDataMessage(data, keywords, errorMessage),
      successArr,
      errorArr,
      endStatus: hasAnyData && errorArr.length === 0,
      moduleName,
    };
  },
};

export default reportDetailService;
