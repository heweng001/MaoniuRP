import { Table, Typography } from 'antd';
import React, { Component } from 'react';

import mathUtils from '@/utils/mathUtils';

const { Title } = Typography;

class KeywordAnalyseData extends Component {
  constructor(props) {
    super(props);
  }

  computedTableData() {
    const result = [];
    this.props.dataSource?.forEach((item) => {
      const each = {};
      Object.assign(each, item);
      each.sumClickRate = mathUtils.parseToPercent(item.sumClickCnt / item.sumShowCnt);
      each.sumP4pClickRate = mathUtils.parseToPercent(
        item.sumP4pClickCnt / item.sumP4pShowCnt,
      );
      each.clickRate = mathUtils.parseToPercent(item.click / item.impr);
      each.avgCost = mathUtils.numberFormat(item.cost / item.click);
      each.cost = mathUtils.numberFormat(item.cost);
      each.SearchWordImpr = mathUtils.numberFormat(item?.searchWordData?.impr);
      each.SearchWordClick = mathUtils.numberFormat(item?.searchWordData?.click);
      each.SearchWordCost = mathUtils.numberFormat(item?.searchWordData?.cost);
      each.SearchWordClickRate = mathUtils.parseToPercent(
        each.SearchWordClick / each.SearchWordImpr,
      );
      each.SearchWordAvgCost = mathUtils.numberFormat(
        each.SearchWordCost / each.SearchWordClick,
      );
      result.push(each);
    });
    return result;
  }
  render() {
    const tableColumns = [
      {
        title: '关键词(近4周)',
        dataIndex: 'keyword',
        align: 'center',
      },
      {
        title: 'P4P卖家自选词数据',
        children: [
          {
            title: '曝光',
            dataIndex: 'impr',
            align: 'center',
          },
          {
            title: '点击',
            dataIndex: 'click',
            align: 'center',
          },
          {
            title: '点击率',
            dataIndex: 'clickRate',
            align: 'center',
          },
          {
            title: '花费',
            dataIndex: 'cost',
            align: 'center',
          },
          {
            title: '平均点击花费',
            dataIndex: 'avgCost',
            align: 'center',
          },
        ],
      },
      {
        title: 'P4P买家搜索数据',
        children: [
          {
            title: '曝光',
            dataIndex: 'SearchWordImpr',
            align: 'center',
          },
          {
            title: '点击',
            dataIndex: 'SearchWordClick',
            align: 'center',
          },
          {
            title: '点击率',
            dataIndex: 'SearchWordClickRate',
            align: 'center',
          },
          {
            title: '花费',
            dataIndex: 'SearchWordCost',
            align: 'center',
          },
          {
            title: '平均点击花费',
            dataIndex: 'SearchWordAvgCost',
            align: 'center',
            style: 'backgroundColor:grey',
          },
        ],
      },
      {
        title: 'P4P加自然搜索总数据',
        children: [
          {
            title: '曝光',
            dataIndex: 'sumShowCnt',
            align: 'center',
          },
          {
            title: '点击',
            dataIndex: 'sumClickCnt',
            align: 'center',
          },
          {
            title: '点击率',
            dataIndex: 'sumClickRate',
            align: 'center',
          },
        ],
      },
    ];
    return (
      <div className="keywordAnalyseData">
        <Title level={4}>主要引流关键词是否精准</Title>
        <Table
          columns={tableColumns}
          dataSource={this.computedTableData()}
          bordered
          rowKey={Math.random}
          pagination={false}
        />
      </div>
    );
  }
}
export default KeywordAnalyseData;
