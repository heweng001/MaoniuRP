import { Table } from 'antd';
import _, { sum } from 'lodash';
import React, { Component } from 'react';

import mathUtils from '@/utils/mathUtils';
import reportUtils from '@/utils/report';

class ShopVisitorTable extends Component {
  constructor(props) {
    super(props);
  }

  htmlDecode(input) {
    var textarea = document.createElement('textarea');
    textarea.innerHTML = input;
    return textarea.value;
  }

  computedDataList() {
    const totalInquiries = this.props?.dataSource?.feedbackSubjectList?.length;
    let shopRegion = this.props?.dataSource?.shopRegion;

    if (shopRegion?.length) {
      let result = shopRegion?.map((item) => {
        const L1Cnt =
          (item.value?.['L1+']?.length || 0) +
          (item.value?.['L1']?.length || 0) +
          (item.value?.['L2']?.length || 0);
        const L3Cnt = item.value?.['L3']?.length || 0;
        const L4Cnt = item.value?.['L4']?.length || 0;
        return {
          countryName: this.htmlDecode(item.country),
          L0Cnt: item.value?.['L0']?.length || 0,
          L1Cnt,
          L3Cnt,
          L4Cnt,
          sumCnt: item.size,
          percent: (((L1Cnt + L3Cnt + L4Cnt) / totalInquiries) * 100).toFixed(2) + '%',
        };
      });

      if (shopRegion?.length > 10) {
        const others = result.slice(10, result.length);
        const othersSum = others.reduce(
          (acc, cur) => {
            acc.L0Cnt += cur.L0Cnt;
            acc.L1Cnt += cur.L1Cnt;
            acc.L3Cnt += cur.L3Cnt;
            acc.L4Cnt += cur.L4Cnt;
            acc.sumCnt += cur.sumCnt;
            return acc;
          },
          {
            L0Cnt: 0,
            L1Cnt: 0,
            L3Cnt: 0,
            L4Cnt: 0,
            sumCnt: 0,
          },
        );
        othersSum['countryName'] = '其他国家';
        othersSum['percent'] =
          (
            (
              (othersSum.L1Cnt + othersSum.L3Cnt + othersSum.L4Cnt) /
              othersSum.sumCnt
            ).toFixed(4) * 100
          ).toFixed(2) + '%';
        result = [...result.slice(0, 10), othersSum];
      }

      const summary = result.reduce(
        (acc, cur) => {
          acc.L0Cnt += cur.L0Cnt;
          acc.L1Cnt += cur.L1Cnt;
          acc.L3Cnt += cur.L3Cnt;
          acc.L4Cnt += cur.L4Cnt;
          acc.sumCnt += cur.sumCnt;
          return acc;
        },
        {
          L0Cnt: 0,
          L1Cnt: 0,
          L3Cnt: 0,
          L4Cnt: 0,
          sumCnt: 0,
        },
      );
      summary['countryName'] = '合计';
      summary['percent'] =
        (
          ((summary.L1Cnt + summary.L3Cnt + summary.L4Cnt) / summary.sumCnt).toFixed(4) *
          100
        ).toFixed(2) + '%';
      return [...result, summary];
    }
  }

  convertData(type) {
    let data = this.props.dataSource.shopRegion;
    if (!data || !Array.isArray(data)) {
      return [];
    }
    data = data.filter((d) => d.targetName === type);
    const result = [];
    for (const item of data) {
      const countryDetail = item.countryDetail;
      const countryArray = countryDetail.split(';');
      for (const country of countryArray) {
        const dataArray = country.split('#');
        if (dataArray && dataArray.length === 3) {
          result.push({
            countryName: dataArray[0],
            indicatorValue: dataArray[1],
            indicatorPercent: parseFloat(dataArray[2] * 100).toFixed(2) + '%',
          });
        }
      }
    }
    result.sort((a, b) => {
      return parseInt(b.indicatorValue) - parseInt(a.indicatorValue);
    });
    return result;
  }

  render() {
    const tableColumn = [
      {
        title: '国家',
        dataIndex: 'countryName',
        align: 'center',
      },
      {
        title: 'L0 商机数',
        dataIndex: 'L0Cnt',
        align: 'center',
      },
      {
        title: 'L1+ 商机数',
        dataIndex: 'L1Cnt',
        align: 'center',
      },
      {
        title: 'L3 商机数',
        dataIndex: 'L3Cnt',
        align: 'center',
        render: (text, record) => <span>{text || '/'}</span>,
      },
      {
        title: 'L4 商机数',
        dataIndex: 'L4Cnt',
        align: 'center',
        render: (text, record) => <span>{text || '/'}</span>,
      },
      {
        title: '合计',
        dataIndex: 'sumCnt',
        align: 'center',
      },
      {
        title: '占比',
        dataIndex: 'percent',
        align: 'center',
      },
    ];
    return (
      <Table
        size="small"
        pagination={false}
        bordered
        dataSource={this.computedDataList()}
        columns={tableColumn}
        rowKey="id"
      />
    );
  }
}
export default ShopVisitorTable;
