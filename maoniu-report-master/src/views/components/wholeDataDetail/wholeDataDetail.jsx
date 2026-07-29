/* eslint-disable prettier/prettier */
import { Table, Typography } from 'antd';
import React, { Component } from 'react';

import reportUtils from '@/utils/report';

import DeleteButton from '../base/deleteButton';
import style from './wholeDataDetail.less';

// 整体数据明细
class WholeDataDetail extends Component {
  state = {
    // 列表
    dataList: [],
    show: {
      industryData: true,
      compareData: true,
    },
  };

  componentDidMount() {
    this.getDataList();
  }

  // 获取列表
  getDataList() {
    const { wholeDetailData, threeMonthFeedbackList, accountInfo } =
      this.props.dataSource;
    const dataList = [];
    wholeDetailData?.industryData?.length &&
      dataList.push({
        list: wholeDetailData.industryData

          .sort((a, b) => {
            let aStartDate = '';
            const aStatDateRange = a.statDateRange;
            if (aStatDateRange.includes('~')) {
              aStartDate = new Date(
                aStatDateRange.substring(0, aStatDateRange.indexOf('~')),
              );
            } else {
              aStartDate = new Date(aStatDateRange + '-31 12:');
            }
            let bStartDate = '';
            const bStatDateRange = b.statDateRange;
            if (bStatDateRange.includes('~')) {
              bStartDate = new Date(
                bStatDateRange.substring(0, bStatDateRange.indexOf('~')),
              );
            } else {
              bStartDate = new Date(bStatDateRange + '-31 12:');
            }
            return bStartDate - aStartDate;
          })
          .map((item, index) =>
            Object.assign(item, {
              index: index + 1,
              // clickRate: parseFloat(item.clickRate * 100).toFixed(2) + '%',
              // fbRate: parseFloat(item.fbRate * 100).toFixed(2) + '%',
            }),
          )
          .slice(0, 15),
      });
    const effectFeedbackConfig = accountInfo?.effectFeedbackConfig;
    let effectiveFbList;
    if (effectFeedbackConfig) {
      effectiveFbList = reportUtils.getEffectiveFbList(
        threeMonthFeedbackList,
        JSON.parse(effectFeedbackConfig),
      );
    }
    const industryData = wholeDetailData.industryData;
    industryData?.forEach((item) => {
      let statDateRange = item.statDateRange;
      let startDate, endDate;
      if (statDateRange && statDateRange.includes('~')) {
        startDate = statDateRange.substring(0, statDateRange.indexOf('~'));
        endDate = statDateRange.substring(statDateRange.indexOf('~') + 1);
        // console.log(startDate, endDate);
        startDate = new Date(startDate).getTime();
        endDate = new Date(endDate).getTime();
      } else {
        startDate = statDateRange;
        startDate = new Date(startDate);
        // console.log(startDate);
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
        console.log(endDate);
        startDate = startDate.getTime();
        endDate = endDate.getTime();
      }
      if (effectiveFbList?.length > 0) {
        const fbList = effectiveFbList?.filter((item) => {
          return item.createTime >= startDate && item.createTime <= endDate;
        });
        item.effectiveFbLength = fbList?.length;
      }
    });
    this.setState({ dataList });
  }

  render() {
    const { dataList } = this.state;
    const cardConfig = {
      bordered: false,
      style: { padding: 0 },
    };
    function getTableConfig(data) {
      return {
        columns: [
          {
            title: '序号',
            dataIndex: 'index',
            align: 'center',
          },
          {
            title: '时间',
            dataIndex: 'statDateRange',
            align: 'center',
          },
          {
            title: '总产品',
            dataIndex: 'totalProductCount',
            align: 'center',
          },
          {
            title: '优品数',
            dataIndex: 'topProduct',
            align: 'center',
          },
          {
            title: '爆品数',
            dataIndex: 'superProduct',
            align: 'center',
          },
          {
            title: '访客数',
            dataIndex: 'shopUv',
            align: 'center',
          },
          {
            title: '总点击',
            dataIndex: 'searchClicks',
            align: 'center',
          },
          {
            title: '点击率',
            align: 'center',
            render: (record) => {
              return (
                <span>
                  {((record.searchClicks / record.searchImps) * 100).toFixed(2)}%
                </span>
              );
            },
          },
          {
            title: '询盘',
            dataIndex: 'fbPv',
            align: 'center',
          },
          {
            title: '有效询盘',
            dataIndex: 'effectiveFbLength',
            align: 'center',
          },
          {
            title: '总商机',
            align: 'center',
            render: (record) => <span>{record.tmUv + record.fbPv}</span>,
          },
          {
            title: '总有效商机',
            align: 'center',
            render: (record) => <span>{record.effectiveFbTm}</span>,
          },
          {
            title: '有效商机占比',
            align: 'center',
            render: (record) => <span>{record.effectiveFbTmRate}%</span>,
          },

          {
            title: 'P4P总花费',
            // dataIndex: 'p4pCost',
            align: 'center',
            render: (record) => <span>{record.p4pCost?.toFixed(2)}</span>,
          },
          {
            title: 'P4P点击',
            dataIndex: 'p4pClick',
            align: 'center',
          },
          {
            title: 'P4P点击率',
            align: 'center',
            render: (record) => (
              record.p4pImpression ? <span>
                {((record.p4pClick / record.p4pImpression) * 100).toFixed(2)}%
              </span> : null
            ),
          },
          {
            title: 'P4P平均点击花费',
            align: 'center',
            render: (record) => (
              record.p4pClick ?
                <span>
                  {(record.p4pCost / record.p4pClick).toFixed(2)}
                </span> : null
            ),
          },
          {
            title: 'P4P转化成本',
            dataIndex: 'cpf2',
            align: 'center',
          },
        ],
        dataSource: data.map(item => {
          item.fbTm = (item.tmUv || 0) + (item.feedback || 0);
          item.effectiveFbTm = (item.effectiveFbLength ||0) + (item.effectiveTmLength || 0);
          item.effectiveFbTmRate =
            ((item.effectiveFbTm / item.fbTm) * 100).toFixed(2);
          return item
        }),
        rowKey: 'index',
        rowClassName: (row) => {
          if (!row.statDateRange.includes('~')) {
            return style['bg-dark'];
          }
          return '';
        },
        pagination: false,
        bordered: true,
      };
    }

    return (
      <div>
        {/* 数据表 */}
        {dataList &&
          dataList.length &&
          dataList.map((item) => {
            return this.state.show.industryData ? (
              <div>
                <Typography.Title level={4}>
                  周详细数据记录
                  <DeleteButton
                    deleteModel={() => {
                      this.setState((prevState, _) => ({
                        show: Object.assign({}, prevState.show, {
                          industryData: false,
                        }),
                      }));
                    }}
                  />
                </Typography.Title>
                <Table {...getTableConfig(item.list)} />
              </div>
            ) : null;
          })}
      </div>
    );
  }
}
export default WholeDataDetail;
