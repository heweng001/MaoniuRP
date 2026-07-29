import { SearchOutlined } from '@ant-design/icons';
import { CreditCardTwoTone, PieChartTwoTone } from '@ant-design/icons';
import { Table, Tooltip, Typography } from 'antd';
import moment from 'moment';
import React, { Component } from 'react';

import store from '@/redux/store';

import Bar from '../../charts/bar';
import DeleteButton from '../base/deleteButton';
import EmphasisKeywords from './emphasisKeywords';
import ShowcaseProductTable from './showcaseProductTable';
const { Title } = Typography;
class ShowcaseTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isShow: true,
      param: {},
      show: {
        showcaseProductList: true,
        emphasisKeywordRankList: true,
        creditOrderList: true,
      },
      url: 'https://searchstaff.alibaba.com/diagnosis/supplierRatingDetail.htm?spm=a2700.7756200.0.0.290571d22RSB2i',
      creditOrderList: [],
      isShowPieChart: false,
    };
  }

  componentDidMount() {
    this.props.dataSource?.creditOrderList?.forEach((item, index) => {
      item.id = index;
    });
  }

  isHasData() {
    const data = this.props.dataSource;
    return (
      data.showcaseProductList || data.emphasisKeywordRankList || data.creditOrderList
    );
  }
  getShowcaseTableLineData = (data) => {
    return {
      text: '信保走单情况',
      legendData: ['订单统计金额', '交易分'],
      xAxisDAta: data.map((m) => moment(m.orderTime).format('YYYY-MM-DD')),
      series: [
        {
          name: '订单统计金额',
          type: 'bar',
          barWidth: 30,
          data: data.map((m) => m.orderGmv),
        },
        {
          name: '交易分',
          type: 'bar',
          barWidth: 30,
          data: data.map((m) => m.orderScore),
        },
      ],
    };
  };

  isShowPieChart = () => {
    this.setState({
      isShowPieChart: !this.state.isShowPieChart,
    });
  };
  getGlobalState = () => {
    return store.getState().globalState;
  };

  render() {
    const tableColumns = [
      {
        title: '订单通过时间',
        dataIndex: 'orderTime',
        align: 'center',
      },
      {
        title: '订单统计金额',
        dataIndex: 'orderGmv',
        ellipsis: true,
        align: 'center',
      },
      {
        title: '订单类型',
        dataIndex: 'orderType',
        align: 'center',
      },
      {
        title: '交易分',
        dataIndex: 'orderScore',
        align: 'center',
      },
    ];
    return (
      <>
        {this.isHasData() ? (
          <div className="drainage-analysis">
            {this.state.show.showcaseProductList ? (
              <div className="div-box">
                <Title level={4}>
                  橱窗产品
                  <DeleteButton
                    deleteModel={() => {
                      this.setState((prevState, _) => ({
                        show: Object.assign({}, prevState.show, {
                          showcaseProductList: false,
                        }),
                      }));
                    }}
                  />
                </Title>
                <ShowcaseProductTable
                  dataSource={this.props.dataSource.showcaseProductList}
                />
              </div>
            ) : null}
            {this.state.show.emphasisKeywordRankList &&
              this.props.dataSource.emphasisKeywordRankList?.length && (
                <div>
                  <Title level={4}>
                    重点关键词
                    <DeleteButton
                      deleteModel={() => {
                        this.setState((prevState, _) => ({
                          show: Object.assign({}, prevState.show, {
                            emphasisKeywordRankList: false,
                          }),
                        }));
                      }}
                    />
                  </Title>
                  <EmphasisKeywords
                    dataSource={this.props.dataSource.emphasisKeywordRankList}
                  />
                </div>
              )}
            {this.state.show.creditOrderList ? (
              <div className="div-box">
                <Title level={4}>
                  信保走单情况
                  <Tooltip title="切换数据显示">
                    {this.state.isShowPieChart || this.getGlobalState() ? (
                      <CreditCardTwoTone onClick={this.isShowPieChart} />
                    ) : (
                      <PieChartTwoTone onClick={this.isShowPieChart} />
                    )}
                  </Tooltip>
                  <DeleteButton
                    deleteModel={() => {
                      this.setState((prevState, _) => ({
                        show: Object.assign({}, prevState.show, {
                          creditOrderList: false,
                        }),
                      }));
                    }}
                  />
                </Title>
                <a
                  href={this.state.url}
                  target="_blank"
                  className="order"
                  rel="noreferrer"
                >
                  <SearchOutlined />
                  查看详细数据
                </a>
                {this.state.isShowPieChart || this.getGlobalState() ? (
                  <Bar
                    dataSource={this.getShowcaseTableLineData(
                      this.props.dataSource?.creditOrderList,
                    )}
                  />
                ) : (
                  <Table
                    rowKey="id"
                    columns={tableColumns}
                    dataSource={this.props.dataSource?.creditOrderList}
                    pagination={false}
                    bordered
                  />
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </>
    );
  }
}
export default ShowcaseTable;
