import { CreditCardTwoTone, PieChartTwoTone } from '@ant-design/icons';
import { Radio, Tooltip, Typography } from 'antd';
import _ from 'lodash';
import React, { Component } from 'react';

import store from '@/redux/store';
import reportUtils from '@/utils/report';
import { getNested, isArray } from '@/utils/util';

import Bar from '../../charts/bar';
import Pie from '../../charts/pie';
import DeleteButton from '../base/deleteButton';
import BuyerDetailTable from './buyerDetailTable';
import FeedbackProductTable from './feedbackProductTable';
import InquiryQualityTable from './inquiryQualityTable';
import ShopVisitorTable from './shopVisitorTable.jsx';

const { Title } = Typography;

class FeedbackQualityAnalyse extends Component {
  constructor(props) {
    super(props);
    this.state = {
      show: {
        shopRegionVisitor: true,
        shopRegionInquiry: true,
        groups: true,
        groupStatistics: true,
        feedbackSubjectList: true,
      },
      radio: 'all',
      feedbackSubjectListCopy: [],
      isShowInquiriesPieChart: false,
      isShowGroupsPieChart: false,
    };
  }

  componentDidMount = async () => {
    const { feedbackSubjectList } = this.props.dataSource.feedbackQualityAnalyse;
    if (isArray(feedbackSubjectList)) {
      this.setState({
        feedbackSubjectListCopy: _.cloneDeep(feedbackSubjectList),
      });
    }
  };

  inquiryQualityTables() {
    const data = this.props.dataSource.feedbackQualityAnalyse;
    // 旗标统计
    const feedbackList = data.feedbackSubjectList;
    let [
      gray,
      green,
      red,
      blue,
      total,
      blueMark,
      secondResponse,
      userNewLevel1,
      userNewLevel3,
      userNewLevel4,
    ] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    if (feedbackList) {
      gray = this.getInquiryQuality('mark', 'NOT_FOLLOW');
      green = this.getInquiryQuality('mark', 'FOLLOW_GREEN');
      red = this.getInquiryQuality('mark', 'FOLLOW');
      blue = this.getInquiryQuality('mark', 'FOLLOW_BLUE');
      blueMark = this.getInquiryQuality('buyerLevel', 'A');
      total = feedbackList.length;
      secondResponse = feedbackList.filter((item) => item.buyerSecondReply).length;
      userNewLevel1 = this.getUserNewLevelSize(feedbackList, ['L1+', 'L1', 'L2']);
      userNewLevel3 = this.getUserNewLevelSize(feedbackList, ['L3']);
      userNewLevel4 = this.getUserNewLevelSize(feedbackList, ['L4']);
    }
    if (data.title) {
      return [
        {
          total,
          red,
          green,
          blue,
          gray,
          blueMarkL: blueMark,
          secondResponse,
          userNewLevel1,
          userNewLevel3,
          userNewLevel4,
          id: Math.random(),
        },
      ];
    }
    return [];
  }

  getInquiryQualityPieData = () => {
    const legendNames = [
      '询盘商机+tm商机',
      // '红旗询盘',
      // '绿旗询盘',
      // '蓝旗询盘',
      // '灰旗询盘',
      // '二次回复询盘',
      'L1+',
      'L3',
      'L4',
    ];
    const inquiries = this.inquiryQualityTables();
    const {
      total,
      // red,
      // green,
      // blue,
      // gray,
      // secondResponse,
      userNewLevel1,
      userNewLevel3,
      userNewLevel4,
    } = inquiries[0];
    const values = [
      total,
      // red,
      // green,
      // blue,
      // gray,
      // secondResponse,
      userNewLevel1,
      userNewLevel3,
      userNewLevel4,
    ];
    return {
      text: '询盘质量分析',
      legendData: ['询盘数'],
      xAxisDAta: legendNames,
      series: [
        {
          name: '询盘数',
          type: 'bar',
          barWidth: 30,
          data: values,
        },
      ],
    };
  };

  getInquiryQuality(key, value) {
    return this.props.dataSource.feedbackQualityAnalyse.feedbackSubjectList.filter(
      (item) => item[key] === value,
    ).length;
  }
  getUserNewLevelSize = (data, levels) => {
    return data.filter((f) => f.userNewLevel && levels?.includes(f.userNewLevel)).length;
  };

  countryData() {
    const { feedbackQualityAnalyse: data, accountInfo } = this.props.dataSource;
    const shopRegion = data.shopRegion;
    const countryFlagData = getNested(data, 'flagData', 'countryFlag');
    const showFlagData = data.showFlagData;
    const feedbackSubjectList = data.feedbackSubjectList;
    let effectFeedbackConfig = '';
    if (accountInfo?.effectFeedbackConfig) {
      effectFeedbackConfig = JSON.parse(accountInfo.effectFeedbackConfig);
    }
    return {
      shopRegion,
      countryFlagData,
      showFlagData,
      feedbackSubjectList,
      effectFeedbackConfig,
    };
  }

  groupData() {
    const data = this.props.dataSource.feedbackQualityAnalyse;
    const groups = data.groups;
    const showFlagData = data.showFlagData;
    const totalInquiries = data.totalInquiries;
    // const totalInquiries = 100;
    const result = {
      groups,
      showFlagData,
      totalInquiries,
    };
    return result;
  }

  getFeedbackGroupPieData = (type) => {
    let groups = this.props?.dataSource?.feedbackQualityAnalyse?.groups;
    if (isArray(groups)) {
      groups = groups?.filter((f) => f.inquiries !== 0);
      if (type === 'left') {
        const leftData = groups?.filter((f) => !f.parentName.includes('>>'));
        return this.getGroupsData(leftData, '一级分组询盘');
      }
      const rightData = groups?.filter((f) => f.parentName.includes('>>'));
      return this.getGroupsData(rightData, '二级分组询盘');
    }
  };

  getGroupsData = (data, name) => {
    return {
      text: name,
      legendData: data.map((m) => m.parentName).reverse(),
      seriesName: '产品分组',
      seriesData: data
        .map((m) => {
          return {
            name: m.parentName,
            value: m.inquiries,
          };
        })
        .reverse(),
    };
  };

  onChange = (e) => {
    this.setState({
      radio: e.target.value,
    });
  };

  filterFeedbackSubjectList = () => {
    const { radio, feedbackSubjectListCopy } = this.state;
    const {
      accountInfo: { effectFeedbackConfig },
    } = this.props.dataSource;
    if (radio === 'all') {
      return feedbackSubjectListCopy;
    }
    if (radio === 'effective') {
      if (!effectFeedbackConfig) {
        return feedbackSubjectListCopy;
      }
      return reportUtils.getEffectiveFbList(
        feedbackSubjectListCopy,
        JSON.parse(effectFeedbackConfig),
      );
    }
    return '';
  };

  isShowInquiriesPie = () => {
    this.setState({
      isShowInquiriesPieChart: !this.state.isShowInquiriesPieChart,
    });
  };
  isShowGroupsPie = () => {
    this.setState({
      isShowGroupsPieChart: !this.state.isShowGroupsPieChart,
    });
  };

  getGlobalState = () => {
    return store.getState().globalState;
  };

  render() {
    const options = [
      { label: '全部', value: 'all' },
      { label: '有效询盘', value: 'effective' },
      { label: '不显示', value: 'none' },
    ];

    return (
      <>
        {this.inquiryQualityTables().length && this.state.show.shopRegionVisitor ? (
          <div className="div-box">
            <Title level={4}>
              商机质量到底怎样
              <Tooltip title="切换数据显示">
                {this.state.isShowInquiriesPieChart || this.getGlobalState() ? (
                  <CreditCardTwoTone onClick={this.isShowInquiriesPie} />
                ) : (
                  <PieChartTwoTone onClick={this.isShowInquiriesPie} />
                )}
              </Tooltip>
              <DeleteButton
                deleteModel={() => {
                  this.setState((prevState, _) => ({
                    show: Object.assign({}, prevState.show, {
                      shopRegionVisitor: false,
                    }),
                  }));
                }}
              />
            </Title>
            {this.state.isShowInquiriesPieChart || this.getGlobalState() ? (
              <Bar dataSource={this.getInquiryQualityPieData()} />
            ) : (
              <InquiryQualityTable dataSource={this.inquiryQualityTables()} />
            )}
          </div>
        ) : null}

        {this.state.show.shopRegionInquiry ? (
          <div className="div-box">
            <Title level={4}>
              有效商机分布
              <DeleteButton
                deleteModel={() => {
                  this.setState((prevState, _) => ({
                    show: Object.assign({}, prevState.show, {
                      shopRegionInquiry: false,
                    }),
                  }));
                }}
              />
            </Title>
            <span>说明：此处占比指L1+,L3,L4商机总数占全店商机总数的比例</span>

            <ShopVisitorTable dataSource={this.countryData()} />
          </div>
        ) : null}

        {this.state.show.groups ? (
          <div className="div-box">
            <Title level={4}>
              商机产品分布
              <Tooltip title="切换数据显示">
                {this.state.isShowGroupsPieChart || this.getGlobalState() ? (
                  <CreditCardTwoTone onClick={this.isShowGroupsPie} />
                ) : (
                  <PieChartTwoTone onClick={this.isShowGroupsPie} />
                )}
              </Tooltip>
              <DeleteButton
                deleteModel={() => {
                  this.setState((prevState, _) => ({
                    show: Object.assign({}, prevState.show, {
                      groups: false,
                    }),
                  }));
                }}
              />
            </Title>
            {this.state.isShowGroupsPieChart || store.getState().globalState ? (
              <div>
                <Pie dataSource={this.getFeedbackGroupPieData('left')} />
                <Pie dataSource={this.getFeedbackGroupPieData('right')} />
              </div>
            ) : (
              <FeedbackProductTable dataSource={this.groupData()} />
            )}
          </div>
        ) : null}
        {this.props.showFeedbackDetails &&
        this.state.show.feedbackSubjectList &&
        this.props.showFeedback ? (
          <div className="div-box">
            <Title level={4}>
              <div className="btn_group">
                询盘明细
                <DeleteButton
                  deleteModel={() => {
                    this.setState((prevState, _) => ({
                      show: Object.assign({}, prevState.show, {
                        feedbackSubjectList: false,
                      }),
                    }));
                  }}
                />
                <Radio.Group
                  className="dpn"
                  options={options}
                  onChange={this.onChange}
                  value={this.state.radio}
                />
              </div>
            </Title>
            {this.state.radio !== 'none' ? (
              <BuyerDetailTable dataSource={this.filterFeedbackSubjectList()} />
            ) : (
              ''
            )}
          </div>
        ) : null}
      </>
    );
  }
}
export default FeedbackQualityAnalyse;
