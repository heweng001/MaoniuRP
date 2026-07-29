import { Space, Table, Typography } from 'antd';
import React, { Component } from 'react';

import style from './showcaseProductTable.less';
const { Title } = Typography;
const formatRate = (val) => {
  if (val) {
    return parseFloat(Math.round(val * 10000) / 100);
  }
  return 0;
};
const formatRank = (obj) => {
  const { rank, rankIndex } = obj;
  if (rank > 0) {
    return `${rank}页 ${rankIndex}位`;
  } else {
    return '查无排名';
  }
};
class ShowcaseProductTable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tableData: [],
    };
  }

  componentDidMount() {
    if (!this.props.dataSource) {
      return;
    }
    const res = [];
    this.props.dataSource.forEach((showcase) => {
      if (showcase.rankKeywordList) {
        for (let i = 0; i < showcase.rankKeywordList.length; i++) {
          const keyword = showcase.rankKeywordList[i];
          const element = { ...showcase, ...keyword };
          if (i === 0) {
            element.root = true;
            element.childrenLength = showcase.rankKeywordList.length;
            element.editOpen = false;
          }
          res.push(element);
        }
      } else {
        const element = { ...showcase };
        element.root = true;
        element.childrenLength = 1;
        element.editOpen = false;
        res.push(element);
      }
    });
    const tableData = res.sort((a, b) => b.sumProdFbNum - a.sumProdFbNum);
    this.setState({ tableData });
    for (const item of tableData) {
      if (item.keywordEffect.length > 0) {
        item.keywordEffect = item.keywordEffect.sort((a, b) => b.heat - a.heat);
      }
    }
    // 去重
    const data = this.uniqueArray(tableData);
    this.setState({ tableData: data });
  }

  uniqueArray(arr) {
    const res = new Map();
    return arr.filter((arr) => !res.has(arr.id) && res.set(arr.id, 1));
  }

  render() {
    const tableColumns = [
      {
        title: '产品',
        dataIndex: 'imageURL',
        fixed: 'left',
        ellipsis: true,
        search: false,
        width: 120,
        align: 'center',
        render: (dom, record) => (
          <Space>
            <img src={record.imageURL} alt="" width="100px" height="100px" />
          </Space>
        ),
      },
      {
        title: '标题',
        dataIndex: 'subject',
        width: 200,
        align: 'center',
      },
      {
        title: '产品数据(近4周)',
        dataIndex: 'subject',
        align: 'center',
        render: (dom, record) => (
          <div className={style['product-data']}>
            <p>
              <span>曝光: {record.sumProdShowNum}</span>
              <span>点击: {record.sumProdClickNum}</span>
              <span>访客: {record.sumProdVisitorCnt}</span>
            </p>
            <p>
              <span>询盘: {record.sumProdFbNum}</span>
              <span>TM: {record.atmFbUv}</span>
              <span>订单数: {record.orderBuyerCnt}</span>
            </p>
            <p>
              <span>
                点击率: {formatRate(record.sumProdClickNum / record.sumProdShowNum)}%
              </span>
              <span>
                反馈率: {formatRate(record.sumProdFbNum / record.sumProdVisitorCnt)}%
              </span>
              <span>id: {record.id}</span>
            </p>
          </div>
        ),
      },
      {
        title: '重点关键词(热度)与排名',
        dataIndex: 'subject',
        align: 'center',
        render: (dom, record) => (
          <Space>
            {record.keywordEffect.length > 0 ? (
              <div>
                {record.keywordEffect.map((item) => (
                  <div key={Math.random()} className={style.keywordEffect}>
                    <span>{item.keyword}</span>
                    <span>热度: {item.heat}</span>
                    <span>{formatRank(item)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <span>该橱窗下暂无重点关键词排名在前20页</span>
              </div>
            )}
          </Space>
        ),
      },
    ];

    return (
      <div>
        <div className="section">
          <Table
            dataSource={this.state.tableData}
            columns={tableColumns}
            rowKey="id"
            bordered
            pagination={false}
          />
        </div>
      </div>
    );
  }
}
export default ShowcaseProductTable;
