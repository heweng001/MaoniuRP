import { Space, Table, Typography } from 'antd';
import moment from 'moment';
import React, { Component } from 'react';

import mathUtils from '@/utils/mathUtils';
import { getNested } from '@/utils/util';

import DeleteButton from '../base/deleteButton';
import ProductConversionDataTable from './productConversionDataTable';
const { Title } = Typography;
const toYearAndMonth = (val) => {
  return moment(val).format('YYYY年MM月');
};
class ConversionAnalysis extends Component {
  constructor(props) {
    super(props);
    this.state = {
      show: {
        shopConversionAnalyse: true,
        productConversionAnalyse: true,
      },
    };
  }

  categoryName() {
    const { conversionRateTableData } = this.props.dataSource;
    if (conversionRateTableData) {
      const { categoryData } = conversionRateTableData;
      if (categoryData) {
        const { mainCateLv1Desc, mainCateLv2Desc, mainCateLv3Desc } = categoryData;
        return `${mainCateLv1Desc} >> ${mainCateLv2Desc} >> ${mainCateLv3Desc}`;
      }
    }
    return '';
  }

  conversionRateTableData() {
    const result = [];
    const { conversionRateTableData } = this.props.dataSource;
    if (conversionRateTableData) {
      const { categoryConversionRate, searchConversionRate, systemRecommendRate } =
        conversionRateTableData;
      categoryConversionRate.forEach((item) => {
        const row = {};
        // 日期
        row.statDate = item.statDate;
        // 询盘人数 / 点击
        const selfConversionRate = item.fbUv / item.searchClicks;
        const avgConversionRate = item.fbUvRivalAvg / item.searchClicksRivalAvg;
        row.conversionRate = `${mathUtils.parseToPercent(
          selfConversionRate,
        )} (${mathUtils.parseToPercent(avgConversionRate)})`;
        // (询盘 + TM) 人数 / 点击
        const selfFbTmConversionRate = (item.fbUv + item.tmUv) / item.searchClicks;
        const avgFbTmConversionRate =
          (item.fbUvRivalAvg + item.tmUvRivalAvg) / item.searchClicksRivalAvg;
        row.fbTmConversionRate = `${mathUtils.parseToPercent(
          selfFbTmConversionRate,
        )} (${mathUtils.parseToPercent(avgFbTmConversionRate)})`;
        // 搜索流量商机转换率
        if (searchConversionRate) {
          const searchData = searchConversionRate.filter(
            (i) => i.statDate === item.statDate,
          );
          if (searchData && searchData[0]) {
            row.searchRate = `${mathUtils.parseToPercent(
              searchData[0].uvAbRate,
            )} (${mathUtils.parseToPercent(searchData[0].uvAbRateRivalAvg)})`;
          }
        }

        // 系统推荐商机转化率
        if (systemRecommendRate) {
          const systemRecomendData = systemRecommendRate.filter(
            (i) => i.statDate === item.statDate,
          );
          if (systemRecomendData && systemRecomendData[0]) {
            row.systemRecommendRate = `${mathUtils.parseToPercent(
              systemRecomendData[0].uvAbRate,
            )} (${mathUtils.parseToPercent(systemRecomendData[0].uvAbRateRivalAvg)})`;
          }
        }
        row.id = Math.random();
        result.push(row);
      });
    }
    return result;
  }

  productConversionData() {
    const result = [];
    const { productConversionData } = this.props.dataSource;
    if (productConversionData) {
      productConversionData.forEach((item) => {
        const row = {};
        if (item.fbTop3) {
          row.label = '高反馈产品';
          row.sort = 1;
        }
        if (item.clickRateAbnormal) {
          row.label = '高曝光低点击产品';
          row.clickRateAbnormal = item.clickRateAbnormal;
          row.sort = 3;
        }
        if (item.fbRateAbnormal) {
          row.label = '高点击低反馈产品';
          row.fbRateAbnormal = item.fbRateAbnormal;
          row.sort = 4;
        }
        if (item.fbDrop3) {
          row.label = '较前4周询盘减少产品';
          row.fbDrop3 = item.fbDrop3;
          row.sort = 2;
        }
        row.subject = item.subject;
        // 价格信息
        let price = getNested(
          item,
          'priceInfo',
          'price',
          'productRangePrices',
          'priceRangeText',
        );
        if (!price) {
          price = getNested(item, 'priceInfo', 'price', 'formatLadderPrice');
        }
        row.price = price;
        // 其余产品信息
        row.moq =
          getNested(item, 'priceInfo', 'moq') +
          getNested(item, 'priceInfo', 'price', 'unit');
        row.sumProdShowNum = item.sumProdShowNum;
        row.sumProdClickNum = item.sumProdClickNum;
        row.sumProdVisitorCnt = item.sumProdVisitorCnt;
        row.sumProdFbNum = item.sumProdFbNum;
        row.atmFbUv = item.atmFbUv;
        row.tmUv = item.tmUv;
        row.crtOrd = item.crtOrd;
        row.clickRate = mathUtils.parseToPercent(
          row.sumProdClickNum / row.sumProdShowNum,
        );
        row.clickFbRate = mathUtils.parseToPercent(
          row.sumProdFbNum / row.sumProdClickNum,
        );
        row.visitFbRate = mathUtils.parseToPercent(
          row.sumProdFbNum / row.sumProdVisitorCnt,
        );
        row.id = item.id;
        row.detailURL = item.detailURL;
        row.imageURL = item.imageURL;
        // 效果词信息
        row.effectSourceWords = getNested(item, 'keywordEffect', 'effectSourceWords');
        // 较前4周询盘减少产品 前4周数据
        if (item.fbDrop3) {
          const beforeWeeks = item.beforeWeeks;
          row.beforeWeeks = {
            sumProdShowNum: beforeWeeks.sumProdShowNum,
            sumProdClickNum: beforeWeeks.sumProdClickNum,
            sumProdVisitorCnt: beforeWeeks.sumProdVisitorCnt,
            sumProdFbNum: beforeWeeks.sumProdFbNum,
            atmFbUv: beforeWeeks.atmFbUv,
            crtOrd: beforeWeeks.crtOrd,
            clickRate: mathUtils.parseToPercent(
              beforeWeeks.sumProdClickNum / beforeWeeks.sumProdShowNum,
            ),
            clickFbRate: mathUtils.parseToPercent(
              beforeWeeks.sumProdFbNum / beforeWeeks.sumProdClickNum,
            ),
            visitFbRate: mathUtils.parseToPercent(
              beforeWeeks.sumProdFbNum / beforeWeeks.sumProdVisitorCnt,
            ),
          };
        }
        // 高点击词、高曝光词信息
        if (item.fbRateAbnormal) {
          row.highClickWordEffect = getNested(
            item,
            'keywordEffect',
            'highClickWordEffect',
          );
        }
        if (item.clickRateAbnormal) {
          row.highSearchImpsWordEffect = getNested(
            item,
            'keywordEffect',
            'highSearchImpsWordEffect',
          );
        }
        // row.id = Math.random();
        result.sort((a, b) => a.sort - b.sort);
        result.push(row);
      });
    }
    return result;
  }

  render() {
    const tableColumns = [
      {
        title: '时间',
        dataIndex: 'statDate',
        align: 'center',
        render: (dom, record) => (
          <Space>
            <span> {toYearAndMonth(record.statDate)}</span>
          </Space>
        ),
      },
      {
        title: (dom, record) => (
          <div>
            <div style={{ textAlign: 'center' }}>主营三级类目转化率</div>
            <div style={{ textAlign: 'center' }}>（{this.categoryName()}）</div>
          </div>
        ),
        align: 'center',
        children: [
          {
            title: '询盘人数/点击',
            dataIndex: 'conversionRate',
            align: 'center',
          },
          {
            title: '(询盘+TM)人数/点击',
            dataIndex: 'fbTmConversionRate',
            align: 'center',
          },
        ],
      },
      {
        title: (dom, record) => (
          <div>
            <div style={{ textAlign: 'center' }}>店铺商机转化率</div>
            <div style={{ textAlign: 'center' }}>=（询盘+TM+订单）人数去重/访问人数</div>
          </div>
        ),
        align: 'center',
        children: [
          {
            title: '搜索流量',
            dataIndex: 'searchRate',
            align: 'center',
          },
          {
            title: '系统推荐',
            dataIndex: 'systemRecommendRate',
            align: 'center',
          },
        ],
      },
    ];
    return (
      <>
        {/* {this.state.show.shopConversionAnalyse ? (
          <div className="conversion-analysis">
            <Title level={4}>
              店铺转化率
              <DeleteButton
                deleteModel={() => {
                  this.setState((prevState, _) => ({
                    show: Object.assign({}, prevState.show, {
                      shopConversionAnalyse: false,
                    }),
                  }));
                }}
              />
            </Title>
            <p>括号中数据为行业平均数据</p>
            <Table
              dataSource={this.conversionRateTableData()}
              columns={tableColumns}
              pagination={false}
              bordered
              rowKey="id"
            />
          </div>
        ) : null} */}

        {this.state.show.productConversionAnalyse ? (
          <div>
            <Title level={4}>
              {' '}
              重点产品是否要调整
              <DeleteButton
                deleteModel={() => {
                  this.setState((prevState, _) => ({
                    show: Object.assign({}, prevState.show, {
                      productConversionAnalyse: false,
                    }),
                  }));
                }}
              />
            </Title>
            {this.productConversionData().map((item, index) => (
              <ProductConversionDataTable
                dataSource={item}
                key={Math.random()}
                index={index}
              />
            ))}
          </div>
        ) : null}
      </>
    );
  }
}
export default ConversionAnalysis;
