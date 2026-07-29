import './report.less';

import { QuestionCircleFilled, QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Image, Tabs, Tooltip } from 'antd';
import { AxiosResponse } from 'axios';
import moment from 'moment';
import React, { createRef, ReactElement } from 'react';
import ReactToPrint from 'react-to-print';

import KeywordApi from '@/api/keyword';
import { default as ReportApi, default as reportApi } from '@/api/report';
import User from '@/api/user';
import { AI_URL } from '@/constant';
import { sendMessage } from '@/utils/chromeExtension';
import notify from '@/utils/notify';
import { getNested, isArray } from '@/utils/util';

// @ts-ignore
import request from '../../utils/request';
// @ts-ignore
import DeleteButton from '../components/base/deleteButton.jsx';
// @ts-ignore
import RefreshButton from '../components/base/refreshButton.jsx';
// @ts-ignore
import BusinessAnalysis from '../components/businessAnalysis/businessAnalysis.jsx';
// @ts-ignore
import ReportConclusion from '../components/conclusion/conclusion.jsx';
// @ts-ignore
import ConversionAnalysis from '../components/conversionAnalysis/conversionAnalysis.jsx';
// @ts-ignore
import FeedbackQualityAnalyse from '../components/feedbackQualityAnalyse/feedbackQualityAnalyse.jsx';
// @ts-ignore
import HighInquiryProducts from '../components/highInquiryProducts/highInquiryProducts.jsx';
// @ts-ignore
import P4pAnalysis from '../components/p4pAnalysis/p4pAnalysis.jsx';
// @ts-ignore
import PopularProductAnalyse from '../components/popularProductAnalyse/popularProductAnalyse.jsx';
import Report360 from '../components/report360';
// @ts-ignore
import SameIndustryAnalysis from '../components/sameIndustryAnalysis/sameIndustryAnalysis.jsx';
// @ts-ignore
import NewIndustryAnalyse from '../components/sameProductKeyAnalysis/newIndustryAnalyse.jsx';
// @ts-ignore
// @ts-ignore
// @ts-ignore
import TopSaleRankProduct from '../components/topSaleRankProduct/topSaleRankProduct.jsx';
// @ts-ignore
import WholeDataDetail from '../components/wholeDataDetail/wholeDataDetail.jsx';
import CacheDetail from './dialog/cacheDetail';

interface TabsItem {
  key: string;
  label: string;
  children: ReactElement;
}

type params = {
  [key: string]: any;
};
const report360: any = React.createRef();
const industryReport: any = React.createRef();
const componentRef: any = React.createRef();
const detail: any = React.createRef();
const tabs: Array<TabsItem> = [
  {
    key: 'report360',
    label: '我的店铺360复盘',
    children: <Report360 ref={report360} />,
  },
  {
    key: 'industryReport',
    label: '同行 Top20',
    children: <Report360 ref={report360} onlyShow="sameIndustryAnalyse" />,
  },
  // {
  //   key: 'productReport',
  //   label: '热品 Top20',
  //   children: <Report360 ref={report360} onlyShow="topSaleRankProduct" />,
  // },
];
const modelNames = [
  { name: '基础操作自检', model: 'conclusion' },
  // { name: '橱窗信保', model: 'showcaseTableData' },
  { name: '周数据详细记录', model: 'wholeDetailData' },
  {
    name: '哪个直通车计划转化成本太高要暂停？',
    model: 'p4pDataAnalyse',
    children: [
      { name: '直通车费用花在这些产品上是否值得?', model: 'productAnalyseData' },
      { name: '主要引流关键词是否精准', model: 'keywordAnalyseData' },
    ],
  },
  { name: '重点产品是否要调整?', model: 'productAnalyse' },
  { name: '商机质量到底怎样?', model: 'feedbackQualityAnalyse' },
  // { name: '员工绩效', model: 'businessAnalyseData' },
  { name: '高询盘产品', model: 'highInquiryProductList' },
  { name: '类目询盘/销量榜', model: 'popularProductList' },
  { name: '同行分析', model: 'sameIndustryProductPromise' },
  { name: '同行 Top20', model: 'sameIndustryAnalyseList' },
  // { name: '热品 Top20', model: 'topSaleRankProductList' },
];

export default class Report extends React.Component {
  state = {
    onlyShow: undefined,
    activeTab: '',
    accountInfo: {},
    nickname: '',
    creator: '',
    pluginId: '',
    reportId: null,
    oem: '',
    reportSource: '',
    pluginVersion: '',
    tabName: 'report360',
    result: {},
    status: {
      reportLoading: false,
    },
    categoryName: [],
    keywordName: [],
    reportType: 'report360',
    isCompleteReport: 'incomplete',
    reportHeader: '',
    reportMobile: '',
    lastResult: null,
    lastResultDate: '',
    lastResultId: null,
    diagnosisId: null,
    reportName: '',
    showLastResult: false,
    show: {
      conclusion: true,
      showcaseTableData: true,
      p4pDataAnalyse: true,
      productAnalyse: true,
      feedbackQualityAnalyse: true,
      businessAnalyseData: true,
      wholeDetailData: true,
      sameIndustryAnalyseList: true,
      highInquiryProductList: true,
      popularProductList: true,
      sameIndustryProductPromise: true,
      moduleList: true,
      // topSaleRankProductList: false,
    },
    reportDetailId: null,
    sameIndustryKeywords: '',
    sameIndustrySelectedCategory: '',
    modelIndex: 0,
  };
  fileInputRef = createRef<HTMLInputElement>();
  changeTitle() {
    console.log('更换title');
  }
  async componentDidMount() {
    await this.getParamValues();
    await this.getUserStatus();
    await this.getVersions();
    await this.getAgentInfo();
    // 鼠标滚动事件 定位当前模块位置
    this.wheelScroll();
  }

  getUserStatus = () => {
    const { nickname } = this.state;
    if (this.isAiReportSource()) {
      return User.getUserStatus(nickname)
        .then((res) => {
          this.setState({
            accountInfo: res.data,
          });
        })
        .catch((err) => {
          console.log(`获取用户信息失败了:${err}`);
        });
    }
  };
  getVersions = () => {
    const message = {
      type: 'getVersion',
    };
    return sendMessage(message, (res: any) => {
      if (res?.value) {
        this.setState({
          pluginVersion: res.value,
        });
      }
    });
  };
  getAgentInfo = () => {
    const params: any = {};
    const {
      accountInfo: { belongsCorp = '' },
      oem,
    }: params = this.state;
    if (this.isAiReportSource()) {
      params.oem = belongsCorp;
    } else {
      params.oem = oem;
    }
    return ReportApi.getAgentInfo(params)
      .then((res) => {
        const {
          data: { otherValue, softwareLogo },
          success,
        }: params = res.data;
        if (success) {
          this.setState({
            reportHeader: softwareLogo,
            reportMobile: otherValue,
          });
          console.log('title', softwareLogo);
        }
      })
      .catch((err) => {
        console.log(`获取代理商信息失败了:${err}`);
      });
  };
  wheelScroll = () => {
    window.addEventListener('scroll', this.onWheelScroll);
  };
  removeWheelScroll = () => {
    window.removeEventListener('scroll', this.onWheelScroll);
  };
  handleScroll = (model: string, index: number) => {
    // 移除scroll
    this.removeWheelScroll();
    const nodes: any = document.querySelectorAll('dd');
    for (const node of nodes) {
      node.firstChild.className = '';
    }
    for (const node of nodes) {
      if (node.className == model + 'dd') {
        node.firstChild.className = 'dd_color';
        break;
      }
    }
    // nodes[index].firstChild.className = 'dd_color';
    // for (const item of modelNames) {
    // if (model === item.model) {
    this.getModelNode(model);
    return;
    // }
    // }
  };
  onWheelScroll = () => {
    const scrollTop = document.documentElement?.scrollTop;
    const tops: number[] = [];
    for (const item of modelNames) {
      const elementById = document.getElementsByClassName(item.model);
      const offsetTop = getNested(elementById, '0', 'offsetTop');
      if (offsetTop) {
        tops.push(offsetTop);
      }
    }
    const currentIndex = tops.filter((f) => f).findIndex((item) => scrollTop <= item);
    const nodeList = document.querySelectorAll('dd');
    Array.from(nodeList).forEach((item, index, array) => {
      item.children[0].className = '';
      if (currentIndex === -1) {
        array[array.length - 1].children[0].className = 'dd_color';
      }
      if (currentIndex - 1 === index) {
        item.children[0].className = 'dd_color';
      }
    });
  };
  getModelNode = (className: string) => {
    const scroll: any = document.getElementsByClassName(className);
    window.scrollTo(0, (scroll[0] as HTMLElement)?.offsetTop);
  };
  onChange = (key: string) => {
    this.setState({
      tabName: key,
    });
  };
  getParamValues = async () => {
    let href: string = window.location.href;
    console.log(href, 'href');
    href = decodeURI(href);
    if (!href.includes('=')) {
      return '';
    }
    /**
     * @description form AI
     * @param nickname 店铺名
     * @param pluginId 插件id
     * @author xw
     */
    if (href.includes('nickname')) {
      const nickname = this.getNickNameOrCreator(href);
      sessionStorage.setItem('nick', nickname);
      await this.setState({
        nickname,
        pluginId: this.getPluginId(href),
        reportSource: 'AI',
      });
    }
    /**
     * @description form MARKETING
     * @param creator 用户名/生成者
     * @param pluginId 插件id
     * @param oem 贴牌类型
     * @param reportId 月报id
     * @author xw
     */
    if (href.includes('creator')) {
      await this.setState({
        creator: this.getNickNameOrCreator(href),
        pluginId: this.getPluginId(href),
        oem: this.getAssignValue(href, 'oem'),
        reportId: this.getAssignValue(href, 'reportId'),
        reportSource: 'MARKETING',
      });
    }
    if (this.state.pluginId) {
      localStorage.setItem('ai-plugin-id', this.state.pluginId);
    }
    if (href.includes('onlyShow')) {
      await this.setState({
        onlyShow: this.getAssignValue(href, 'onlyShow'),
      });
    }
    const { reportId } = this.state;
    if (reportId && reportId !== 'undefined') {
      this.setState({ status: { reportLoading: true } });
      await this.getReportById(Number(reportId)).finally(() => {
        this.setState({ status: { reportLoading: false } });
      });
    }
  };
  getReportById = async (reportId: number) => {
    return ReportApi.getReportDetail(reportId)
      .then(async (res) => {
        await this.getDetailReport(res.data);
      })
      .catch((err) => {
        notify.error(`获取报告内容失败了:${err.response.data?.message}`);
      });
  };
  getNickNameOrCreator = (href: string) => {
    return href.substring(href.indexOf('=') + 1, href.indexOf('&'));
  };
  getPluginId = (href: string) => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);

    // Convert URLSearchParams to a plain object
    const params = Object.fromEntries(urlParams.entries());
    return params['pluginId'];
  };
  getAssignValue = (href: string, name: string) => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);

    // Convert URLSearchParams to a plain object
    const params = Object.fromEntries(urlParams.entries());
    return params[name];
  };
  getFormatLastDate = () => {
    return moment(this.state.lastResultDate).format('YYYY-MM-DD');
  };
  getQuery = () => {
    const { tabName } = this.state;
    if (tabName === 'report360') {
      return this.getReport360Query();
    }
    return this.getIndustryReportQuery();
  };
  getReport360Query = () => {
    if (!report360.current) {
      return {};
    }
    const { checkedList, keywords } = report360.current.state;
    const query = this.getCheckedInfo(checkedList);
    if (keywords) {
      query.keywordArray.push(keywords);
    }
    return query;
  };
  getIndustryReportQuery = () => {
    const { checkedList, keywords, sameIndustryService, sameIndustryUrl } =
      industryReport.current?.state || {};
    const query = this.getCheckedInfo(checkedList);
    if (keywords) {
      query.keywordArray.push(keywords);
    }
    query.sameIndustryService = sameIndustryService;
    query.sameIndustryUrl = sameIndustryUrl;
    return query;
  };
  getCheckedInfo = (checkedList: string[]) => {
    const result: params = {
      keywordArray: [],
      feedbackInterval: 'month',
    };
    if (checkedList) {
      for (const item of checkedList) {
        result[item] = true;
      }
    }
    return result;
  };
  handleCreateReport = async () => {
    const {
      accountInfo: { trade },
      nickname,
      tabName,
    }: params = this.state;
    const query = this.getQuery();
    const {
      conclusion,
      sameIndustryAnalyse,
      popularProductHighInquiry,
      popularProductHotSelling,
      highInquiryProductList,
      sameIndustryService,
      sameIndustryUrl,
      keywordArray: keywords,
    } = query;
    if (
      sameIndustryAnalyse ||
      popularProductHighInquiry ||
      popularProductHotSelling ||
      highInquiryProductList
    ) {
      if (!isArray(keywords)) {
        notify.warning('请输入同行关键词');
        this.releaseIpLock();
        return;
      }
    }
    this.setState({
      status: { reportLoading: true },
    });
    // 热品 top20 离线数据
    let offlineTopSaleRankProductList: any[];
    if (query.topSaleRankProduct) {
      const res = await reportApi.getSaleRankProduct(keywords);
      offlineTopSaleRankProductList = res?.data?.data;
      // console.log(
      //   '🚀 ~ Report ~ handleCreateReport= ~ offlineTopSaleRankProductList:',
      //   offlineTopSaleRankProductList,
      // );
      if (offlineTopSaleRankProductList?.[0]?.products?.length > 0) {
        query.topSaleRankProduct = false;
      }
    }
    let offlineWeeklyDataList: any[];
    if (query.wholeDataDetail && this.isAiReportSource()) {
      offlineWeeklyDataList = await request({
        method: 'GET',
        url: AI_URL + `/api/v1/mydatas/${this.state.nickname}?secret=maoniu&sync=false`,
      }).then((res: AxiosResponse) => {
        const { data } = res;
        // eslint-disable-next-line
        return data
          ?.filter((m: any) => moment(m.endDate).diff(moment(m.startDate), 'days') < 15)
          .map((m: any) => {
            return {
              statDateRange: m.startDate + '~' + m.endDate,
              totalProductCount: m.totalProduct,
              shopUv: m.visitor,
              searchClicks: m.click,
              searchImps: m.impression,
              fbPv: m.feedback,
              ...m,
            };
          });
      });
      if (offlineWeeklyDataList?.length > 0) {
        query.wholeDataDetail = false;
      }
    }
    let content: any = null;
    if (tabName === 'report360') {
      if (conclusion) {
        const res: any = await this.getDataReport(query);
        const { success, message, data } = res;
        content = data;
        if (!success) {
          this.setState({
            status: { reportLoading: false },
          });
          return notify.error(message);
        }
      }
    } else {
      if (sameIndustryService && !sameIndustryUrl) {
        notify.error('请输入同行店铺链接');
        this.releaseIpLock();
        return;
      }
    }
    query.nick = nickname;
    query.trade = trade;
    const message = {
      type: 'getDataReportDetail',
      query,
      nickname,
    };
    await sendMessage(
      message,
      async (res: any) => {
        if (!res) {
          return this.releaseIpLock();
        }
        if (!res.success) {
          notify.error(res.message);
          return this.releaseIpLock();
        }
        if (offlineTopSaleRankProductList?.[0]?.products?.length > 0) {
          res.data = {
            ...res.data,
            topSaleRankProductList: offlineTopSaleRankProductList,
          };
        }
        if (offlineWeeklyDataList?.length > 0) {
          res.data = {
            ...res.data,
            wholeDetailData: { industryData: offlineWeeklyDataList },
          };
        }
        this.setState({
          result: res.data,
        });
        // console.log(this.state.result);
        if (this.isAiReportSource()) {
          // 橱窗信保 重点关键词 热度
          // const emphasisKeywordRankList = getNested(
          //   res.data,
          //   'showcaseTableData',
          //   'emphasisKeywordRankList',
          // );
          // await this.getEmphasisKeywordRankList(emphasisKeywordRankList);
        }
        this.setReportName(res);
        this.resolveNaNData(res.data);
        if (content) {
          res.data['conclusion'] = content;
        }
        await this.createReport(res);
        this.releaseIpLock();
      },
      () => {
        this.releaseIpLock();
      },
    );
  };
  getIpLock = () => {
    return ReportApi.getIpLock()
      .then(async (res) => {
        const {
          data: { data },
        } = res;
        if (data) {
          if (data.success) {
            return await this.handleCreateReport();
          }
          return notify.warning(
            `您当前使用的IP ${data.ip},正在被用户 ${data.userName} 使用，开始时间为 ${data.lockTime},为了数据的完整性，请稍后再试或更换IP后重试`,
          );
        }
        return await this.handleCreateReport();
      })
      .catch(async (err) => {
        console.log(err);
        await this.handleCreateReport();
      });
  };
  handleCacheDetail = () => {
    detail.current.showModal();
  };
  releaseIpLock = () => {
    this.setState({
      status: { reportLoading: false },
    });
    return ReportApi.releaseIpLock();
  };
  getDataReport = async (query: params) => {
    let keywordArr = [];
    if (this.isAiReportSource()) {
      keywordArr = await this.getEmphasisKeywords();
    }
    const message = {
      type: 'getDataReport',
      query: { ...query, keywordArr },
      nickname: this.state.nickname,
    };
    return new Promise((resolve: any) => {
      return sendMessage(message, (res: any) => {
        resolve(res);
      });
    });
  };
  getEmphasisKeywords = () => {
    const { creator, nickname } = this.state;
    const shopName = this.isAiReportSource() ? nickname : creator;
    return KeywordApi.getEmphasisKeyword(shopName)
      .then((res) => {
        const data = res?.data?.data;
        if (isArray(data)) {
          return data;
        }
        return [];
      })
      .catch((err) => {
        return notify.error(`获取重点关键词失败了: ${err}`);
      });
  };
  getEmphasisKeywordRankList = async (emphasisKeywordRankList: any) => {
    if (isArray(emphasisKeywordRankList)) {
      const keywords = emphasisKeywordRankList.map((i: any) => i.keyword);
      const data = await this.getKeywordList(keywords);
      for (const item of emphasisKeywordRankList) {
        for (const [key, value] of Object.entries(data)) {
          if (key === item.keyword) {
            item.heat = value;
          }
        }
      }
      return emphasisKeywordRankList;
    }
  };
  getReportType = () => {
    return this.state.onlyShow || this.state.reportType || this.state.tabName;
  };
  setReportName = (res: any) => {
    const data = res.data;
    if (!data) {
      return '';
    }
    const keys = Object.keys(data);
    const keyword = [];
    const category = [];
    if (keys.includes('popularProductList')) {
      const { popularProductList } = data;
      for (const item of popularProductList) {
        keyword.push(item.keyword);
        const highInquiryList = getNested(item, 'highInquiryProducts');
        const hotSellingList = getNested(item, 'hotSellingProducts');
        if (isArray(highInquiryList)) {
          const highInquiryCate = highInquiryList.find((f: any) => f.leafCategory);
          if (highInquiryCate?.leafCategory) {
            category.push(highInquiryCate.leafCategory);
          }
        }
        if (isArray(hotSellingList)) {
          const hotSellingCate = hotSellingList.find((f: any) => f.leafCategory);
          if (hotSellingCate?.leafCategory) {
            category.push(hotSellingCate.leafCategory);
          }
        }
      }
    }
    if (keys.includes('sameIndustryAnalyseList')) {
      const { sameIndustryAnalyseList } = data;
      for (const item of sameIndustryAnalyseList) {
        keyword.push(item.keyword);
        const cate = getNested(item, 'effectData', '0', 'category');
        category.push(cate);
      }
    }
    if (keys.includes('topSaleRankProductList')) {
      const { topSaleRankProductList } = data;
      for (const item of topSaleRankProductList) {
        keyword.push(item.keyword);
        const cate = getNested(item, 'products', '0', 'category');
        category.push(cate);
      }
    }
    this.setState({
      categoryName: [...new Set(category)],
      keywordName: [...new Set(keyword)],
    });
    // const { tabName } = this.state;
    // console.log('🚀 ~ Report ~ tabName:', tabName);
    this.setState({
      reportType: this.getReportType(),
      isCompleteReport: 'incomplete',
      reportName: this.getReportName(res?.nickname, this.state.keywordName.join(',')),
    });

    const checked = [];
    for (const item of Object.values(this.getQuery())) {
      if (item && typeof item === 'boolean') {
        checked.push(item);
      }
    }
    if (checked.length >= 8) {
      this.setState({
        isCompleteReport: 'complete',
      });
    }
    // this.setState({
    //   reportType: 'diagnosisReport',
    //   reportName: this.getReportName(res?.nickname, '诊断报告'),
    // });
  };
  getReportName = (nickname: string, name: string) => {
    const reportType = this.getReportType();
    let res = '';
    if (reportType == 'report360') {
      res = `${nickname}-店铺360复盘-${moment().format('YYYY-MM-DD')}`;
    }
    if (reportType == 'industryReport') {
      res = `${name}-询盘top20店铺明细表-${moment().format('YYYY-MM-DD')}`;
    }
    if (reportType == 'productReport') {
      res = `${name}-询盘top20产品明细表-${moment().format('YYYY-MM-DD')}`;
    }

    return res;
  };
  resolveNaNData = (data: any) => {
    // 员工绩效
    data?.businessAnalyseData?.accountBasicData.forEach((item: any) => {
      item.readRate = +item.readRate || 0;
      item.replyRate = +item.replyRate || 0;
    });
    // 整体数据明细
    data?.wholeDetailData?.industryData.forEach((item: any) => {
      item.clickRate = +item.clickRate || 0;
      item.fbRate = +item.fbRate || 0;
    });
  };
  getKeywordList = (keywords: string[]) => {
    const { nickname } = this.state;
    return KeywordApi.getKeywordHeat(keywords, nickname)
      .then((res) => {
        return res.data;
      })
      .catch((err) => {
        console.log(`获取关键词热度失败了:${err}`);
      });
  };
  createReport = async (res: any) => {
    const {
      isCompleteReport,
      result,
      categoryName,
      keywordName,
      reportType,
      pluginVersion,
      nickname,
      creator,
      reportSource,
      reportName,
    } = this.state;
    const data = {
      ip: '',
      creator,
      success: res.endStatus,
      shopName: this.isAiReportSource() ? nickname : creator,
      successArray: JSON.stringify(res.successArr),
      errorArray: JSON.stringify(res.errorArr),
      selectModule: res?.moduleName?.join(','),
      reportSource,
      version: pluginVersion,
      reportType,
      industryCategory: JSON.stringify(categoryName),
      keyword: JSON.stringify(keywordName),
      inquiryNum: this.getInquiryNum(result),
      completeReport: isCompleteReport,
      content: JSON.stringify(res.data),
      name: reportName,
    };
    return ReportApi.postReport(data)
      .then((res) => {
        const { id, content } = res.data;
        const {
          sameIndustryUrl,
          keywordArray: keywords,
          feedbackInterval,
        } = this.getQuery();
        this.setState({
          result: {
            sameIndustryUrl,
            keywords,
            feedbackInterval,
            reportDetailId: id,
            ...JSON.parse(content),
          },
          showLastResult: true,
          lastResultDate: new Date(),
        });
      })
      .catch((err) => {
        notify.error(`保存报告失败了:${err}`);
      })
      .finally(() => {
        this.setState({
          status: { reportLoading: false },
        });
      });
  };
  getInquiryNum = (result: any) => {
    const industryData = getNested(result, 'wholeDetailData', 'industryData');
    if (isArray(industryData)) {
      let filterList = industryData.filter(
        (f: any) => !(f.statDateRange && f.statDateRange.includes('~')),
      );
      if (isArray(filterList)) {
        filterList = filterList.sort(
          (a: any, b: any) =>
            new Date(b.statDateRange).valueOf() - new Date(a.statDateRange).valueOf(),
        );
        return filterList[0].fbPv;
      }
      return 0;
    }
    return 0;
  };
  deleteModel = (show: any, name: string) => {
    this.setState({
      show: { ...show, [name]: false },
    });
  };
  refreshModuleData = async (param: any, moduleName: string) => {
    const { show } = this.state;
    if (moduleName === 'conclusion') {
      this.setState({
        show: { ...show, [moduleName]: false },
      });
      const query = {
        conclusion: true,
      };
      const res: any = await this.getDataReport(query);
      await this.saveData(moduleName, res.data);
      this.setState({
        show: { ...show, conclusion: true },
      });
      const elementById = document.getElementById('month-report-progress');
      if (elementById) {
        elementById.parentNode?.removeChild(elementById);
      }
    } else {
      this.setState({
        show: { ...show, [moduleName]: false },
      });
      const message = {
        type: 'getDataReportDetail',
        query: Object.assign(param, { isReport: true }),
        nickname: '',
      };
      await sendMessage(
        message,
        async (res: any) => {
          if (!res) {
            return this.releaseIpLock();
          }
          if (!res.success) {
            notify.error(res.message);
            return this.releaseIpLock();
          }
          // 橱窗信保 重点关键词 热度
          // const emphasisKeywordRankList = getNested(
          //   res.data,
          //   'showcaseTableData',
          //   'emphasisKeywordRankList',
          // );
          // await this.getEmphasisKeywordRankList(emphasisKeywordRankList);
          await this.saveData(moduleName, res.data[moduleName]);
          this.setState({
            show: { ...show, [moduleName]: true },
          });
          this.releaseIpLock();
        },
        () => {
          this.releaseIpLock();
        },
      );
    }
  };
  saveData = async (key: string, value: any) => {
    const { result, reportDetailId } = this.state;
    // @ts-ignore
    // this.state.result[key] = value;
    this.setState({
      result: { ...this.state.result, [key]: value },
    });
    const form = {
      id: reportDetailId,
      content: JSON.stringify(result),
    };
    return await ReportApi.updateReportDetail(form)
      .then(() => {})
      .catch((err) => {
        notify.error(`保存模块数据失败了:${err}`);
      });
  };
  getDetailReport = async (val: any) => {
    // this.setState({ status: { reportLoading: true } });
    const { content, lastModifiedDate, id, name } = val;
    const result = JSON.parse(content);
    this.setState({
      result,
      lastResult: result,
      lastResultDate: lastModifiedDate,
      reportDetailId: id,
      showLastResult: true,
      reportName: name,
    });
    // if (result?.sameIndustryAnalyseList) {
    //   this.setState({ tabName: 'industryReport' });
    // }
    this.setState({ status: { reportLoading: false } });
  };
  isAiReportSource = () => {
    const { reportSource } = this.state;
    return reportSource === 'AI';
  };
  handleImageUploaded = (imageUrl: string) => {
    this.setState({ reportHeader: imageUrl });
  };

  handleUploadClick = () => {
    if (this.fileInputRef.current) {
      this.fileInputRef.current.click();
    }
  };
  handleDeleteClick = () => {
    this.setState({
      reportHeader: null,
    });
  };

  handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const imageDataUrl = await this.readFileAsDataUrl(file);

    const image = document.createElement('img');
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;

      // 计算需要缩放的宽高比
      const aspectRatio = 8.4; // 指定比例
      const imageAspectRatio = image.width / image.height;

      let width = image.width;
      let height = image.height;

      if (imageAspectRatio > aspectRatio) {
        width = height * aspectRatio;
      } else {
        height = width / aspectRatio;
      }

      // 将图片绘制到 canvas 中并缩放
      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);

      canvas.toDataURL('image/png', 1);

      this.setState({
        reportHeader: canvas.toDataURL('image/png', 1),
      });
    };
    image.src = imageDataUrl;
  };

  readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  render() {
    const {
      status: { reportLoading },
      reportHeader,
      reportMobile,
      showLastResult,
      result,
      accountInfo,
      show,
      nickname,
      reportSource,
      creator,
    }: any = this.state;

    let modelIndex = 0;

    const reportQuery = this.getQuery();
    return (
      <div className="container" style={{ marginBottom: '2rem' }}>
        {/*header*/}
        <div className="header">
          <Tabs
            activeKey={this.state.onlyShow || this.state.tabName}
            onChange={this.onChange}
            type="card"
            items={tabs
              .filter((m) =>
                !this.state.onlyShow
                  ? m.key === 'report360'
                  : m.key === this.state.onlyShow,
              )
              .map((m) => {
                return {
                  label: m.label,
                  key: m.key,
                  children: m.children,
                };
              })}
          />
          <div className="btn_group">
            <Button type="primary" loading={reportLoading} onClick={this.getIpLock}>
              生成报告
            </Button>
            <Button className="cache_btn" onClick={this.handleCacheDetail}>
              缓存明细
            </Button>
            <ReactToPrint
              onBeforePrint={() => {
                if (window.parent) {
                  window.parent.postMessage(
                    {
                      module: 'superman-report',
                      type: 'documentTitle',
                      value: this.state.reportName,
                    },
                    '*',
                  );
                }
              }}
              documentTitle={`${this.state.reportName}`}
              trigger={() => (
                <div>
                  <Button>导出PDF</Button>
                  <Tooltip title="在弹出的打印对话框中，将目标打印机选择为“另外为pdf”，然后点保存即可。">
                    <QuestionCircleFilled
                      style={{ marginLeft: '0.25rem', color: '#1890ff' }}
                    />
                  </Tooltip>
                </div>
              )}
              content={() => componentRef.current}
            />
          </div>
          {/*模块目录*/}
          {showLastResult && (
            <div className="module_scroll">
              <dt>目录</dt>
              {modelNames
                .filter((f) => result[f.model])
                .flatMap((item, index) => [
                  <dd
                    className={item.model + 'dd'}
                    key={item.model}
                    onClick={() => this.handleScroll(item.model, index)}
                    onMouseLeave={this.wheelScroll}
                  >
                    <span>{item.name}</span>
                  </dd>,

                  item.children
                    ?.filter((t) => result[item.model]?.[t.model])
                    .map((t, i) => (
                      <dd
                        className={t.model + 'dd'}
                        key={t.model}
                        onClick={() => this.handleScroll(t.model, i)}
                        onMouseLeave={this.wheelScroll}
                      >
                        <span>{t.name}</span>
                      </dd>
                    )),
                ])}
            </div>
          )}
        </div>
        {/*content*/}
        <div className="content" ref={componentRef}>
          {/*报告头部*/}
          {showLastResult && (
            <div className="report_header">
              {reportHeader ? (
                <img className="logo" src={reportHeader} alt="暂无图片" />
              ) : null}
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                ref={this.fileInputRef}
                onChange={this.handleFileSelect}
                value={''}
              />
              <div className="upload_button">
                <Button type="primary" onClick={this.handleUploadClick}>
                  {reportHeader ? '更换抬头' : '上传抬头'}
                </Button>

                <Button
                  onClick={() => {
                    this.handleDeleteClick();
                  }}
                  danger
                  type="primary"
                  disabled={!reportHeader}
                >
                  删除抬头
                </Button>
              </div>
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-evenly',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <p>
                    数据更新时间: {this.getFormatLastDate()}
                    ，如对数据有疑问可扫码加右侧软件客服微信。
                  </p>
                </div>
                <Image
                  src="https://assets.maoniux.com/images/customer-service-vincent-qrcode.jpg"
                  width={120}
                  preview={false}
                ></Image>
              </div>
            </div>
          )}
          {/*基础操作检查*/}
          {result?.conclusion && showLastResult && show.conclusion ? (
            <div className="conclusion">
              <h1>
                {nickname}基础操作检查
                <DeleteButton deleteModel={() => this.deleteModel(show, 'conclusion')} />
                <RefreshButton
                  refreshModel={() => this.refreshModuleData({}, 'conclusion')}
                />
              </h1>
              <ReportConclusion
                dataSource={result.conclusion}
                reportSource={reportSource}
                saveData={this.saveData}
              />
            </div>
          ) : null}
          {/*整体数据明细*/}
          {result?.wholeDetailData && show.wholeDetailData ? (
            <div className="wholeDetailData">
              <h1>
                <DeleteButton
                  deleteModel={() => this.deleteModel(show, 'wholeDetailData')}
                />
                <RefreshButton
                  refreshModel={() =>
                    this.refreshModuleData({ wholeDataDetail: true }, 'wholeDetailData')
                  }
                />
              </h1>
              <WholeDataDetail
                dataSource={{
                  wholeDetailData: result.wholeDetailData,
                  threeMonthFeedbackList: result.threeMonthFeedbackList,
                  accountInfo,
                }}
              />
            </div>
          ) : null}
          {/*橱窗信保*/}
          {/* {result?.showcaseTableData && show.showcaseTableData ? (
            <div className="showcaseTableData">
              <h1>
                橱窗信保
                <DeleteButton
                  deleteModel={() => this.deleteModel(show, 'showcaseTableData')}
                />
                <RefreshButton
                  refreshModel={() =>
                    this.refreshModuleData({ showcaseTable: true }, 'showcaseTableData')
                  }
                />
              </h1>
              <ShowcaseTable dataSource={result.showcaseTableData} />
            </div>
          ) : null} */}
          {/*流量分析*/}
          {result?.p4pDataAnalyse && show.p4pDataAnalyse ? (
            <div className="p4pDataAnalyse">
              <h1>
                <DeleteButton
                  deleteModel={() => this.deleteModel(show, 'p4pDataAnalyse')}
                />
                <RefreshButton
                  refreshModel={() =>
                    this.refreshModuleData({ p4pDataAnalyse: true }, 'p4pDataAnalyse')
                  }
                />
              </h1>
              <P4pAnalysis dataSource={result.p4pDataAnalyse} />
            </div>
          ) : null}
          {/*转化分析*/}
          {result?.productAnalyse && show.productAnalyse ? (
            <div className="productAnalyse">
              <h1>
                <DeleteButton
                  deleteModel={() => this.deleteModel(show, 'productAnalyse')}
                />
                <RefreshButton
                  refreshModel={() =>
                    this.refreshModuleData({ productAnalyse: true }, 'productAnalyse')
                  }
                />
              </h1>
              {/* <p>
                《转化分析板块》告知我们哪些询盘质量较好或有成交，以便我们分析高质量询盘的来源路径，提升店铺整体询盘质量；
              </p> */}
              <ConversionAnalysis dataSource={result.productAnalyse} />
            </div>
          ) : null}
          {/*询盘质量分析*/}

          {result?.feedbackQualityAnalyse && show.feedbackQualityAnalyse ? (
            <div className="feedbackQualityAnalyse">
              <h1>
                <DeleteButton
                  deleteModel={() => this.deleteModel(show, 'feedbackAnalyse')}
                />
                <RefreshButton
                  refreshModel={() =>
                    this.refreshModuleData(
                      { feedbackAnalyse: true },
                      'feedbackQualityAnalyse',
                    )
                  }
                />
              </h1>
              <FeedbackQualityAnalyse
                showFeedback
                showFeedbackDetails={result?.feedbackQualityAnalyse?.showFeedbackDetails}
                dataSource={{
                  feedbackQualityAnalyse: result.feedbackQualityAnalyse,
                  accountInfo,
                }}
              />
            </div>
          ) : null}
          {/*员工绩效*/}
          {result?.businessAnalyseData && show.businessAnalyseData ? (
            <div className="businessAnalyseData">
              <h1>
                员工绩效
                <DeleteButton
                  deleteModel={() => this.deleteModel(show, 'businessAnalyseData')}
                />
                <RefreshButton
                  refreshModel={() =>
                    this.refreshModuleData(
                      { businessAnalyse: true },
                      'businessAnalyseData',
                    )
                  }
                />
              </h1>
              <BusinessAnalysis
                dataSource={{
                  businessAnalyseData: result.businessAnalyseData,
                  feedbackQualityAnalyse: result.feedbackQualityAnalyse,
                  accountInfo,
                }}
              />
            </div>
          ) : null}

          {/*叶子类目Top同行*/}
          {result?.sameIndustryAnalyseList && show.sameIndustryAnalyseList ? (
            <div className="sameIndustryAnalyseList">
              <h1>
                {this.state.sameIndustrySelectedCategory} 类目询盘同行top20排行榜
                <DeleteButton
                  deleteModel={() => this.deleteModel(show, 'sameIndustryAnalyseList')}
                />
                <RefreshButton
                  refreshModel={() =>
                    this.refreshModuleData(
                      {
                        sameIndustryAnalyse: true,
                        keywords: result.keywords,
                        feedbackInterval: result.feedbackInterval,
                        sameIndustryUrl: result.sameIndustryUrl,
                      },
                      'sameIndustryAnalyseList',
                    )
                  }
                />
              </h1>
              {/* <p style={{ position: 'absolute' }}>
                访问，询盘，转化率为该店铺下此类目近6个月数据。线上订单量及金额为全店近6个月数据。
              </p> */}
              <SameIndustryAnalysis
                dataSource={result.sameIndustryAnalyseList}
                handleSelectedCategory={(val: string) => {
                  console.log(val);
                  this.setState({ sameIndustrySelectedCategory: val });
                }}
              />
            </div>
          ) : null}
          {/*高询盘产品*/}
          {result?.highInquiryProductList && show.highInquiryProductList ? (
            <div className="highInquiryProductList">
              <h1>
                高询盘产品
                <DeleteButton
                  deleteModel={() => this.deleteModel(show, 'highInquiryProductList')}
                />
                <RefreshButton
                  refreshModel={() =>
                    this.refreshModuleData(
                      {
                        highInquiryProductList: true,
                        keywords: result.keywords,
                        sameIndustryUrl: result.sameIndustryUrl,
                      },
                      'highInquiryProductList',
                    )
                  }
                />
              </h1>
              <HighInquiryProducts dataSource={result.highInquiryProductList} />
            </div>
          ) : null}
          {/*类目询盘/销量榜*/}
          {result?.popularProductList?.length && show.popularProductList ? (
            <div className="popularProductList">
              <h1>
                类目询盘/销量榜
                <DeleteButton
                  deleteModel={() => this.deleteModel(show, 'popularProductList')}
                />
                <RefreshButton
                  refreshModel={() =>
                    this.refreshModuleData(
                      {
                        popularProductHighInquiry: true,
                        popularProductHotSelling: true,
                        keywords: result.keywords,
                      },
                      'popularProductList',
                    )
                  }
                />
              </h1>
              <PopularProductAnalyse dataSource={result.popularProductList} />
            </div>
          ) : null}
          {/*同行分析*/}
          {result?.sameIndustryProductPromise && show.sameIndustryProductPromise ? (
            <div className="sameIndustryProductPromise">
              <h1>
                同行分析
                <DeleteButton
                  deleteModel={() => this.deleteModel(show, 'sameIndustryProductPromise')}
                />
                <RefreshButton
                  refreshModel={() =>
                    this.refreshModuleData(
                      {
                        sameIndustryService: true,
                        sameIndustryUrl: result.sameIndustryUrl,
                      },
                      'sameIndustryProductPromise',
                    )
                  }
                />
              </h1>
              <h2>订单数据区间为近1年。</h2>
              <NewIndustryAnalyse
                industryDataArray={result.sameIndustryProductPromise}
              ></NewIndustryAnalyse>
            </div>
          ) : null}
          {result.topSaleRankProductList && show.topSaleRankProductList ? (
            <div className="topSaleRankProductList">
              <h1>
                热品 Top20 排行榜
                <DeleteButton
                  deleteModel={() => this.deleteModel(show, 'topSaleRankProductList')}
                />
                {/* <RefreshButton
                  refreshModel={() =>
                    this.refreshModuleData(
                      {
                        popularProductHighInquiry: true,
                        popularProductHotSelling: true,
                        keywords: result.keywords,
                      },
                      'popularProductList',
                    )
                  }
                /> */}
              </h1>
              <TopSaleRankProduct dataSource={result.topSaleRankProductList} />
            </div>
          ) : null}
        </div>

        {/*dialog*/}
        <div className="dialog">
          {
            <CacheDetail
              ref={detail}
              startDetailReport={() => this.setState({ status: { reportLoading: true } })}
              endDetailReport={() => this.setState({ status: { reportLoading: false } })}
              getDetailReport={this.getDetailReport}
              reportSource={reportSource}
              reportType={this.getReportType()}
              creator={creator}
              shopName={nickname}
            />
          }
        </div>
      </div>
    );
  }
}
