import { Col, Row } from 'antd';
import React, { useMemo } from 'react';

import styles from './index.less';

function getNested(obj, ...args) {
  return args.reduce((obj, level) => obj && obj[level], obj);
}

const popularProductTableCell = ({ value = {} }) => {
  const computedData = useMemo(() => {
    const result = {};
    result.image = value.image;
    result.transaction = getNested(value, 'transanctionData', 'totalTransactions');
    result.quantity = getNested(value, 'transanctionData', 'totalQuantities');
    result.buyer = getNested(value, 'transanctionData', 'totalBuyers');
    let price = value.tradePrice.price;
    if (price.indexOf('US') != -1) {
      price = price.substring(2);
    }
    result.price = price;
    result.companyName = getNested(value, 'companyInfo', 'companyName');
    result.homeUrl = getNested(value, 'companyInfo', 'homeUrl');
    if (value.inquiry && typeof value.inquiry === 'string') {
      result.inquiry = value.inquiry.substring(0, value.inquiry.indexOf(','));
    }
    result.isRTS = getNested(value, 'isRTS');
    return result;
  }, [value]);

  return (
    <div>
      <div className="img img-div">
        <a href={value.productUrl} target="_blank" rel="noreferrer">
          {' '}
          <img src={computedData.image} className="image" alt="invalid" />
        </a>
      </div>
      <div className="text-div">
        <div className="companyName">
          <a href={computedData.homeUrl}>{computedData.companyName}</a>
        </div>
        <div>
          <div className="price">{computedData.price}</div>
          <div className="moq">
            {value.tradePrice.minOrder}
            <span className="min-order">(Min Order)</span>
          </div>
        </div>
        <Row style={{ fontSize: '12px' }}>
          <Col>
            {computedData.transaction ? (
              <p> 订单数: {computedData.transaction}</p>
            ) : (
              <p>暂无数据</p>
            )}
            {computedData.buyer ? <p>买家数: {computedData.buyer}</p> : <p>暂无数据</p>}
          </Col>
          <Col>
            <p>{computedData.isRTS ? 'RTS' : 'Customization'}</p>
            {computedData.quantity ? (
              <p>数量：{computedData.quantity}</p>
            ) : (
              <p>暂无数据</p>
            )}
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default popularProductTableCell;
