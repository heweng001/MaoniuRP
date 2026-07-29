import { Space, Table, Typography } from 'antd';
import React, { Component } from 'react';

import mathUtils from '@/utils/mathUtils';
import { getNested } from '@/utils/util';

import style from '../showcaseTable/showcaseProductTable.less';
const { Title } = Typography;
class ProductAnalyseData extends Component {
  parseNumber(value) {
    if (!isNaN(value)) {
      if (Number.isInteger(value)) {
        return value;
      } else {
        return parseFloat(value);
      }
    }
    return 0;
  }

  computedTableData() {
    let result = [];
    this.props.dataSource?.forEach((item) => {
      const each = {};
      Object.assign(each, item);
      each.imageURL = getNested(item, 'productData', 'imageURL');
      each.subject = getNested(item, 'productData', 'subject');
      each.sumProdShowNum = mathUtils.numberFormat(
        getNested(item, 'productData', 'sumProdShowNum'),
      );
      each.sumProdClickNum = mathUtils.numberFormat(
        getNested(item, 'productData', 'sumProdClickNum'),
      );
      each.sumProdVisitorCnt = mathUtils.numberFormat(
        getNested(item, 'productData', 'sumProdVisitorCnt'),
      );
      each.sumProdFbNum = mathUtils.numberFormat(
        getNested(item, 'productData', 'sumProdFbNum'),
      );
      each.tmUv = mathUtils.numberFormat(getNested(item, 'productData', 'tmUv'));
      each.atmFbUv = mathUtils.numberFormat(getNested(item, 'productData', 'atmFbUv'));
      each.key_click = mathUtils.numberFormat(
        getNested(item, 'keywordPromotionData', 'click'),
      );
      each.key_cost = mathUtils.numberFormat(
        getNested(item, 'keywordPromotionData', 'cost'),
      );
      each.key_avg_cost = mathUtils.numberFormat(each.key_cost / each.key_click);
      each.other_click = mathUtils.numberFormat(
        getNested(item, 'otherPromotionData', 'click'),
      );
      each.other_cost = mathUtils.numberFormat(
        getNested(item, 'otherPromotionData', 'cost'),
      );
      each.other_avg_cost = mathUtils.numberFormat(each.other_cost / each.other_click);
      each.rec_click = mathUtils.numberFormat(
        getNested(item, 'recommendPromotionData', 'click'),
      );
      each.rec_cost = mathUtils.numberFormat(
        getNested(item, 'recommendPromotionData', 'cost'),
      );
      each.rec_avg_cost = mathUtils.numberFormat(each.rec_cost / each.rec_click);
      each.id = Math.random();
      result.push(each);
    });
    result = result.sort((a, b) => {
      const b_cost =
        this.parseNumber(b.key_cost) +
        this.parseNumber(b.other_cost) +
        this.parseNumber(b.rec_cost);
      const a_cost =
        this.parseNumber(a.key_cost) +
        this.parseNumber(a.other_cost) +
        this.parseNumber(a.rec_cost);
      return b_cost - a_cost;
    });
    return result;
  }

  computedUrl(keyword) {
    return (
      'https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&CatId=&SearchText=' +
      keyword
    );
  }

  render() {
    const tableColumns = [
      {
        title: '产品(近4周)',
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
        title: '产品数据',
        dataIndex: 'subject',
        align: 'center',
        width: 400,
        render: (dom, record) => (
          <div className={style['product-data']}>
            <p>标题：{record.subject}</p>
            <p>
              <span>曝光: {record.sumProdShowNum}</span>
              <span>点击: {record.sumProdClickNum}</span>
              <span>访客: {record.sumProdVisitorCnt}</span>
            </p>
            <p
              style={{
                color:
                  record.sumProdFbNum === 0 && record.atmFbUv === 0
                    ? 'rgb(227 29 29 / 85%)'
                    : 'rgba(0, 0, 0, 0.85)',
              }}
            >
              <span>询盘个数: {record.sumProdFbNum}</span>
              <span>TM个数: {record.atmFbUv}</span>
            </p>
            <p>产品ID:{record.productId}</p>
          </div>
        ),
      },
      {
        title: '点击',
        dataIndex: '',
        align: 'center',
        render: (dom, record) => (
          <div className={style['product-data']}>
            <p>
              <span>关键词推广：{record.key_click}</span>
            </p>
            <p>
              <span>其他搜索推广: {record.other_click}</span>
            </p>
          </div>
        ),
      },
      {
        title: '花费',
        dataIndex: '',
        align: 'center',
        render: (dom, record) => (
          <div className={style['product-data']}>
            <p>
              <span>关键词推广：{record.key_cost}</span>
            </p>
            <p>
              <span>其他搜索推广: {record.other_cost}</span>
            </p>
          </div>
        ),
      },
      {
        title: '平均点击花费',
        dataIndex: '',
        align: 'center',
        render: (dom, record) => (
          <div className={style['product-data']}>
            <p>
              <span>关键词推广：{record.key_avg_cost}</span>
            </p>
            <p>
              <span>其他搜索推广: {record.other_avg_cost}</span>
            </p>
          </div>
        ),
      },
      {
        title: '点击词及数据(搜索点击，直通车点击)',
        dataIndex: '',
        align: 'center',
        render: (dom, record) => (
          <div>
            {record.keywordData.map((item) => (
              <p key={Math.random()}>
                <a
                  href={this.computedUrl(item.searchKeyword)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.searchKeyword}
                </a>
                <span> ({item.searchClicks}</span>,
                <span style={{ marginLeft: '10px' }}>{item.p4pClickCnt})</span>
              </p>
            ))}
          </div>
        ),
      },
    ];
    return (
      <div className="productAnalyseData">
        <Title level={4}>直通车费用花在这些产品上是否值得?</Title>
        <Table
          rowKey="id"
          pagination={false}
          columns={tableColumns}
          bordered
          dataSource={this.computedTableData()}
        />
      </div>
    );
  }
}
export default ProductAnalyseData;
