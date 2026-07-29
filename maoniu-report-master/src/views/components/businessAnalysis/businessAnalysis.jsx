import { CreditCardTwoTone, PieChartTwoTone } from '@ant-design/icons';
import { Card, Table, Tooltip, Typography } from 'antd';
import React, { Component } from 'react';

import store from '@/redux/store';
import reportUtils from '@/utils/report';
import { isArray } from '@/utils/util';
import Bar from '@/views/charts/bar';

import DeleteButton from '../base/deleteButton';

// 格式化 0.xx -> xx%
function convertToPercentage(replyRate) {
  if (!replyRate) {
    return '0';
  }
  if (replyRate === 1 || replyRate === '1') {
    return '100%';
  }
  return parseFloat(replyRate * 100).toFixed(2) + '%';
}

// 员工绩效
class BusinessAnalysis extends Component {
  constructor(props) {
    super(props);
    // this.getDataList();
    this.state = {
      // 列表
      dataList: [],
      show: {
        accountBasicData: true,
        timelyResponseRate: true,
        visitorData: true,
      },
      isShowPieChart: false,
    };
  }

  componentDidMount = () => {
    this.getDataList();
  };
  getDefaultValue = (value) => {
    if (!value) {
      return 0;
    }
    return value;
  };

  // 获取列表
  getDataList() {
    const { dataSource } = this.props;
    const businessAnalyseData = dataSource?.businessAnalyseData;
    // 添加索引
    if (businessAnalyseData.visitorData) {
      businessAnalyseData.visitorData = [
        Object.assign(businessAnalyseData.visitorData, { index: 0 }),
      ].flat(Infinity);
    }

    const feedbackSubjectList = dataSource?.feedbackQualityAnalyse?.feedbackSubjectList;
    const effectiveFbConfig = dataSource?.accountInfo?.effectFeedbackConfig;
    const ownerNameFbMap = {};
    if (effectiveFbConfig) {
      const effectiveFbList = reportUtils.getEffectiveFbList(
        feedbackSubjectList,
        JSON.parse(effectiveFbConfig),
      );
      effectiveFbList.forEach((item) => {
        ownerNameFbMap[item.ownerName] = (ownerNameFbMap[item.ownerName] || 0) + 1;
      });
    }

    businessAnalyseData.accountBasicData?.forEach((item, index) => {
      item.index = index;
      // 格式化
      // - 及时回复率
      item.replyRate = convertToPercentage(item.replyRate);
      item.readRate = convertToPercentage(item.readRate / 100);
      item.willRate = convertToPercentage(item.willRate / 100);
      item.quoteApprove = this.getDefaultValue(item.quoteApprove);
      item.quoteView = this.getDefaultValue(item.quoteView);
      item.quoteWill = this.getDefaultValue(item.quoteWill);
      if (ownerNameFbMap[item.fullName]) {
        item.effectiveFbPv = ownerNameFbMap[item.fullName];
      } else {
        item.effectiveFbPv = 0;
      }
    });
    // 询盘二次回复率
    if (isArray(feedbackSubjectList) && isArray(businessAnalyseData.accountBasicData)) {
      for (const account of businessAnalyseData.accountBasicData) {
        const accountName = account.fullName;
        let list = feedbackSubjectList.filter((data) => data.ownerName === accountName);
        if (list) {
          list = list.filter((data) => !data.isRFQ);
          let buyerSecondReplyList = list.filter((data) => data.buyerSecondReply);
          if (list.length > 0) {
            account.secondResponseRate =
              parseFloat((buyerSecondReplyList.length / list.length) * 100).toFixed(2) +
              '%';
          } else {
            account.secondResponseRate = 0;
          }
        }
      }
    }
    if (isArray(feedbackSubjectList)) {
      const result = {};
      feedbackSubjectList.forEach((item) => {
        result[item.ownerName] = (result[item.ownerName] || 0) + 1;
      });
      businessAnalyseData.accountBasicData.forEach((item) => {
        if (result[item.fullName]) {
          item.fbPv = result[item.fullName];
        } else {
          item.fbPv = 0;
        }
      });
    }
    if (businessAnalyseData.accountBasicData) {
      // 排序
      const total = businessAnalyseData?.accountBasicData?.find(
        (item) => item.fullName === '合计',
      );
      businessAnalyseData.accountBasicData = businessAnalyseData?.accountBasicData
        .filter((item) => item.fullName !== '合计')
        .sort((a, b) => b.fbPv - a.fbPv);
      // 总计
      const effectiveFbPvSum = businessAnalyseData.accountBasicData
        .map((i) => i.effectiveFbPv)
        .reduce((a, b) => a + b, 0);
      const fbPvSum = businessAnalyseData.accountBasicData
        .map((i) => i.fbPv)
        .reduce((a, b) => a + b, 0);
      total.effectiveFbPv = effectiveFbPvSum;
      total.fbPv = fbPvSum;

      businessAnalyseData.accountBasicData.push(total);
    }
    this.setState({ dataList: businessAnalyseData });
  }

  getVisitorPieData = () => {
    const {
      businessAnalyseData: { visitorData },
    } = this.props.dataSource;
    const legendData = ['申请次数', '买家查看次数', '点击次数', '收到询盘数', '可营销数'];
    const { mailCount, view, clk, fb, mailableVisitorCount } = visitorData[0];
    const values = [mailCount, view, clk, fb, mailableVisitorCount];
    return {
      text: '近31天',
      legendData: ['近31天访客数据'],
      xAxisDAta: legendData,
      series: [
        {
          name: '访客数据',
          type: 'bar',
          barWidth: 30,
          data: values,
        },
      ],
    };
  };

  isShowPieChart = () => {
    this.setState({
      isShowPieChart: !this.state.isShowPieChart,
    });
  };

  render() {
    const { dataList } = this.state;
    const cardConfig = {
      bordered: false,
      style: { padding: 0 },
    };

    function getTableConfig(key) {
      const data = dataList[key];
      // 员工数据
      const accountBasicColumns = [
        {
          title: '账号',
          dataIndex: 'fullName',
          align: 'center',
        },
        {
          title: '询盘/有效询盘/TM客户数',
          children: [
            {
              title: '询盘',
              dataIndex: 'fbPv',
              align: 'center',
            },
            {
              title: '有效询盘',
              dataIndex: 'effectiveFbPv',
              align: 'center',
            },
            {
              title: 'TM客户数',
              dataIndex: 'uvFbAtm',
              align: 'center',
            },
          ],
        },
        {
          title: '及时回复率/平均回复时长',
          children: [
            {
              title: '及时回复率',
              dataIndex: 'replyRate',
              align: 'center',
            },
            {
              title: '平均回复时长',
              dataIndex: 'replyAvgTime',
              align: 'center',
            },
          ],
        },
        // {
        //   title: '询盘二次回复率',
        //   dataIndex: 'secondResponseRate',
        //   align: 'center',
        // },
        {
          title: '新发产品/修改产品',
          children: [
            {
              title: '新发产品',
              dataIndex: 'newProductCount',
              align: 'center',
            },
            {
              title: '修改产品',
              dataIndex: 'alterProductCount',
              align: 'center',
            },
          ],
        },
        {
          title: 'RFQ相关数据',
          children: [
            {
              title: '报价',
              dataIndex: 'quoteApprove',
              align: 'center',
            },
            {
              title: '查看',
              dataIndex: 'quoteView',
              align: 'center',
            },
            {
              title: '行动',
              dataIndex: 'quoteWill',
              align: 'center',
            },
            {
              title: '查看率',
              dataIndex: 'readRate',
              align: 'center',
            },
            {
              title: '行动率',
              dataIndex: 'willRate',
              align: 'center',
            },
          ],
        },
        {
          title: 'True View发布',
          dataIndex: 'subAccountNumber',
          align: 'center',
        },
      ];
      // 访客营销
      const visitorColumns = [
        {
          title: '近31天申请次数',
          dataIndex: 'mailCount',
          align: 'center',
        },
        {
          title: '近31天买家查看次数',
          dataIndex: 'view',
          align: 'center',
        },
        {
          title: '近31天点击次数',
          dataIndex: 'clk',
          align: 'center',
        },
        {
          title: '近31天收到询盘数',
          dataIndex: 'fb',
          align: 'center',
        },
        {
          title: '近31天可营销数',
          dataIndex: 'mailableVisitorCount',
          align: 'center',
        },
      ];
      const columns = key === 'accountBasicData' ? accountBasicColumns : visitorColumns;
      return {
        columns,
        dataSource: data,
        rowKey: 'index',
        pagination: false,
        bordered: true,
      };
    }

    const dataKeys = Object.keys(dataList);

    return (
      <div>
        {/* 数据表 */}
        {dataKeys?.length &&
          dataKeys.map((key) => {
            return this.state.show[key] && key === 'accountBasicData' ? (
              <Card
                key={`BusinessAnalysis_${key}`}
                title={
                  <Typography.Title level={4}>
                    {key === 'accountBasicData' ? '员工数据' : '访客数据'}
                    {key !== 'accountBasicData' && (
                      <Tooltip title="切换数据显示">
                        {this.state.isShowPieChart || store.getState().globalState ? (
                          <CreditCardTwoTone onClick={this.isShowPieChart} />
                        ) : (
                          <PieChartTwoTone onClick={this.isShowPieChart} />
                        )}
                      </Tooltip>
                    )}
                    <DeleteButton
                      deleteModel={() => {
                        this.setState((prevState, _) => ({
                          show: Object.assign({}, prevState.show, {
                            [key]: false,
                          }),
                        }));
                      }}
                    />
                  </Typography.Title>
                }
                {...cardConfig}
              >
                {key === 'accountBasicData' ? (
                  <Table {...getTableConfig(key)} />
                ) : (
                  <div>
                    {this.state.isShowPieChart || store.getState().globalState ? (
                      <Bar dataSource={this.getVisitorPieData()} />
                    ) : (
                      <Table {...getTableConfig(key)} />
                    )}
                  </div>
                )}
              </Card>
            ) : null;
          })}
      </div>
    );
  }
}

export default BusinessAnalysis;
