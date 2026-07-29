import './index.css';

import { Card, Col, Image, Row, Select, Typography } from 'antd';
import React from 'react';

import number4 from '../../assets/number-4.png';
import number5 from '../../assets/number-5.png';
import topother from '../../assets/top-other.png';
import top1 from '../../assets/top1.svg';
import top2 from '../../assets/top2.svg';
import top3 from '../../assets/top3.svg';

// 产品表格
class ProductGrid extends React.Component {
  constructor(props) {
    super(props);
    console.log('🚀 ~ ProductGrid ~ constructor ~ props:', props);
    this.state = {};
  }

  render() {
    const {
      data: { products: allProducts, selected, keyword },
      handleCategoryChange,
    } = this.props;

    let productList;
    let category = '';
    if (selected === undefined || selected === null) {
      productList = [];
    } else {
      const { products: selectedProducts, category: selectedCategory } = selected;
      productList = selectedProducts?.slice(0, 20);
      category = selectedCategory;
    }

    const categoryOptions = allProducts?.map((item) => item.category);
    // if (mark === 'inquiry' || mark === 'selling') {
    //   title = `${productList.keyword}近90天${
    //     mark === 'inquiry' ? '询盘' : '订单'
    //   }降序(叶子类目${productList.list[0]?.leafCategory}热品报告，订单数据区间为近1年)`;
    // }
    // if (mark === 'highInquiry') {
    //   title = `${productList.keyword}搜索结果下，优秀同行产品自然排名情况`;
    // }
    const gridStyle = {
      width: '20%',
      minHeight: '240px',
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
    const getProductItem = (product, index) => {
      const data = {};
      data.key = product?.id || product?.productId;
      data.url = product?.productUrl || product?.url || product?.detail;
      data.image = product?.image || product?.mainImageUrl;
      data.name = product?.companyInfo?.companyName || product?.companyName;
      data.subject = product.subject;
      data.homeUrl = product?.companyInfo?.homeUrl || product?.homeUrl;
      data.price = product?.price;
      data.MinOrder = product?.moq;
      data.isRTS = product?.rts;
      data.inquiry90 = product.inquiry90;
      data.inquiry30 = product.inquiry30;
      data.views = product.views?.match(/([\d,+]+)/)?.[1];
      data.orders = product.orders?.match(/([\d,+]+)/)?.[1];
      // if (product.transanctionData && Object.keys(product.transanctionData).length) {
      //   data.totalTransactions = product.transanctionData?.totalTransactions;
      //   data.totalBuyers = product.transanctionData?.totalBuyers;
      //   data.totalQuantities = product.transanctionData?.totalQuantities;
      // } else if (product.transactionData && Object.keys(product.transactionData).length) {
      //   data.totalTransactions = product.transactionData?.totalTransactions;
      //   data.totalBuyers = product.transactionData?.totalBuyers;
      //   data.totalQuantities = product.transactionData?.totalQuantities;
      // }
      const bgStyle =
        index > 4
          ? {
              backgroundImage: `url(${topother})`,
            }
          : {};
      const rankLogo = () => {
        if (index === 0) {
          return <img src={top1} alt="rank1" width="32" />;
        }
        if (index === 1) {
          return <img src={top2} alt="rank2" width="32" />;
        }
        if (index === 2) {
          return <img src={top3} alt="rank3" width="32" />;
        }
        if (index === 3) {
          return <img src={number4} alt="rank4" width="24" />;
        }
        if (index === 4) {
          return <img src={number5} alt="rank5" width="24" />;
        }
        return <span width="24">#{index + 1}</span>;
      };
      return (
        <Card.Grid key={data.key} style={gridStyle} hoverable={false}>
          <Card
            type="inner"
            cover={
              <div>
                <a href={data.url} target="_blank" rel="noreferrer">
                  <Image src={data.image} preview={false} height={160} width={160} />
                </a>
                <div
                  className="customize-top"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                  }}
                >
                  <div className="top-ranking-tag" style={bgStyle}>
                    {rankLogo()}
                  </div>
                </div>
              </div>
            }
            bordered={false}
            style={{ padding: '0', fontSize: '12px' }}
            bodyStyle={{ padding: '8px' }}
          >
            <Card.Meta
              style={{ fontSize: '12px' }}
              description={
                <>
                  <Typography.Paragraph>
                    <Typography.Text ellipsis>{data.subject}</Typography.Text>
                  </Typography.Paragraph>

                  <div>
                    <Typography.Text>{data.price}</Typography.Text>
                    <Typography.Text>
                      {data?.isRTS ? 'RTS' : 'Customization'}
                    </Typography.Text>
                  </div>

                  <div>
                    <Typography.Text>{data.MinOrder}(Min Order)</Typography.Text>
                  </div>

                  <Typography.Paragraph>
                    <Row>
                      <Col span={12}>
                        <Typography.Text>
                          90天询盘: {data.inquiry90 || '-'}
                        </Typography.Text>
                      </Col>
                      <Col span={12}>
                        <Typography.Text>
                          30天询盘: {data.inquiry30 || '-'}
                        </Typography.Text>
                      </Col>
                    </Row>
                    <Row>
                      <Col span={12}>
                        <Typography.Text>90天订单: {data.orders || '-'}</Typography.Text>
                      </Col>
                      <Col span={12}>
                        <Typography.Text>90天访客: {data.views || '-'}</Typography.Text>
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
    const title = (
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {`关键词 ${keyword} 近90天询盘降序，叶子类目 ${category}`}
        <Select
          defaultValue={category}
          onChange={(value) => handleCategoryChange(keyword, value)}
          style={{ width: '240px' }}
        >
          {categoryOptions.map((option) => {
            return (
              <Select.Option key={option} value={option}>
                {option}
              </Select.Option>
            );
          })}
        </Select>
      </div>
    );
    return (
      <Card title={title} {...cardConfig}>
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexWrap: 'wrap',
          }}
        >
          {productList.map(getProductItem)}
        </div>
      </Card>
    );
  }
}
export default ProductGrid;
