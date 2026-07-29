import { Card, Col, Image, Row, Typography } from 'antd';
import React from 'react';

// 产品表格
class ProductGrid extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    const { productList, mark } = this.props;
    let title = '';
    if (mark === 'inquiry' || mark === 'selling') {
      title = `${productList.keyword}近90天${
        mark === 'inquiry' ? '询盘' : '订单'
      }降序(叶子类目${productList.list[0]?.leafCategory}热品报告，订单数据区间为近1年)`;
    }
    if (mark === 'highInquiry') {
      title = `${productList.keyword}搜索结果下，优秀同行产品自然排名情况`;
    }
    const gridStyle = {
      width: '20%',
      minHeight: '350px',
      maxHeight: '350px',
      textAlign: 'center',
      padding: '5px',
      fontSize: '12px',
    };

    const cardConfig = {
      bordered: false,
      style: { padding: 0 },
    };
    // map 回调函数
    const getProductItem = (product) => {
      const data = {};
      data.key = `${product?.id || product?.productId}${mark}`;
      data.url = product?.productUrl || product?.url;
      data.image = product?.image || product?.mainImageUrl;
      data.name = product?.companyInfo?.companyName || product?.companyName;
      data.homeUrl = product?.companyInfo?.homeUrl || product?.homeUrl;
      data.price = product?.tradePrice?.price || product?.formatLadderPrice;
      data.MinOrder = product?.tradePrice?.minOrder || product?.MOQ;
      data.isRTS = product?.isRTS;
      if (product.transanctionData && Object.keys(product.transanctionData).length) {
        data.totalTransactions = product.transanctionData?.totalTransactions;
        data.totalBuyers = product.transanctionData?.totalBuyers;
        data.totalQuantities = product.transanctionData?.totalQuantities;
      } else if (product.transactionData && Object.keys(product.transactionData).length) {
        data.totalTransactions = product.transactionData?.totalTransactions;
        data.totalBuyers = product.transactionData?.totalBuyers;
        data.totalQuantities = product.transactionData?.totalQuantities;
      }
      return (
        <Card.Grid key={data.key} style={gridStyle} hoverable={false}>
          <Card
            cover={
              <a href={data.url} target="_blank" rel="noreferrer">
                <Image src={data.image} preview={false} height={160} width={160} />
              </a>
            }
            bordered={false}
            style={{ padding: '0', fontSize: '12px' }}
          >
            <Card.Meta
              style={{ fontSize: '12px' }}
              title={
                <Typography.Text ellipsis>
                  {
                    <a href={data.homeUrl} target="_blank" rel="noreferrer">
                      {data.name}
                    </a>
                  }
                </Typography.Text>
              }
              description={
                <>
                  <Typography.Paragraph>
                    <Typography.Text style={{ fontSize: 16 }} strong>
                      {data.price}
                    </Typography.Text>
                    <br />
                    <Typography.Text>{data.MinOrder}(Min Order)</Typography.Text>
                  </Typography.Paragraph>

                  <Typography.Paragraph>
                    <Row>
                      <Col span={12}>
                        <Typography.Text>
                          {data?.totalTransactions
                            ? `订单数: ${data.totalTransactions}`
                            : '订单数: 暂无'}
                        </Typography.Text>
                      </Col>
                      <Col span={12}>
                        <Typography.Text>
                          {data?.isRTS ? 'RTS' : 'Customization'}
                        </Typography.Text>
                      </Col>
                      <Col span={12}>
                        <Typography.Text>
                          {data?.totalBuyers
                            ? `买家数: ${data.totalBuyers}`
                            : '买家数: 暂无'}
                        </Typography.Text>
                      </Col>
                      <Col span={12}>
                        <Typography.Text>
                          {data?.totalQuantities
                            ? `数量: ${data.totalQuantities}`
                            : ' 数量: 暂无'}
                        </Typography.Text>
                      </Col>
                    </Row>
                  </Typography.Paragraph>
                </>
              }
            />
          </Card>
        </Card.Grid>
      );
    };
    return (
      <Card
        title={<Typography.Title level={4}>{`${title}`}</Typography.Title>}
        {...cardConfig}
      >
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          {productList.list.map(getProductItem)}
        </div>
      </Card>
    );
  }
}
export default ProductGrid;
