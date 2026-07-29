import { Card, Col, Image, Row, Typography } from 'antd';
import React, { Component } from 'react';

import { getNested } from '@/utils/util';
const { Paragraph, Title, Text } = Typography;
class SameProductKeyCard extends Component {
  getProductItem() {
    const result = this.props.dataSource?.map((product) => {
      return {
        detailProductUrl: product?.detailProductUrl,
        image: product?.image,
        tradePrice: product.tradePrice,
        ladderPrice: product.ladderPrice,
        inquiry: product.inquiry,
        transaction: getNested(product, 'productOrderValue', 'totalTransactions'),
      };
    });
    return result;
  }

  render() {
    const gridStyle = {
      width: '20%',
      minHeight: '260px',
      maxHeight: '300px',
      textAlign: 'center',
      padding: '5px',
      fontSize: '12px',
    };
    return (
      <>
        <Title level={4}>{this.props.shopUrl}</Title>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            width: '100%',
          }}
        >
          {this.getProductItem()?.map((data) => (
            <Card.Grid hoverable={false} style={gridStyle} key={Math.random()}>
              <Card
                cover={
                  <a href={data.detailProductUrl} target="_blank" rel="noreferrer">
                    <Image src={data.image} preview={false} height={160} width={160} />
                  </a>
                }
                bordered={false}
                bodyStyle={{ padding: '0', fontSize: '12px' }}
              >
                <Card.Meta
                  title=""
                  description={
                    <>
                      <Paragraph>
                        <Text>FBO: {data.tradePrice}</Text>
                        <Text>MOQ:{data.ladderPrice}</Text>
                      </Paragraph>
                      <Paragraph>
                        <Row>
                          <Col span={12}>
                            <Text>
                              {data?.inquiry ? ` ${data.inquiry}` : '询盘数: 无数据'}
                            </Text>
                          </Col>
                          <Col span={12}>
                            <Text>
                              {data?.transaction
                                ? `订单数: ${data.transaction}`
                                : '订单数: 无数据'}
                            </Text>
                          </Col>
                        </Row>
                      </Paragraph>
                    </>
                  }
                />
              </Card>
            </Card.Grid>
          ))}
        </div>
      </>
    );
  }
}
export default SameProductKeyCard;
