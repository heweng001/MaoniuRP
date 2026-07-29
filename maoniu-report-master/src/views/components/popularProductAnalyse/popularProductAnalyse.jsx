// 类目询盘、销售榜
import React from 'react';

import ProductGrid from '../highInquiryProducts/productGrid';

class PopularProductAnalyse extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      // 询盘列表
      inquiryList: [],
      // 销量列表
      sellingList: [],
    };
  }

  componentDidMount() {
    this.getDataList();
  }

  // 获取询盘与销量列表
  getDataList = () => {
    console.log(this.props);
    const { dataSource } = this.props;
    const inquiryList = [];
    const sellingList = [];
    dataSource.forEach((item) => {
      item.highInquiryProducts &&
        inquiryList.push({ list: item.highInquiryProducts, keyword: item.keyword });
      item.hotSellingProducts &&
        sellingList.push({ list: item.hotSellingProducts, keyword: item.keyword });
    });
    this.setState({ inquiryList, sellingList });
  };

  render() {
    const { inquiryList, sellingList } = this.state;

    return (
      <div>
        {/* 询盘榜 */}
        {inquiryList &&
          inquiryList.length &&
          inquiryList.map((item) => (
            <ProductGrid
              productList={item}
              mark={'inquiry'}
              key={`inquiry${item.keyword}`}
            />
          ))}
        {/* 销量榜 */}
        {sellingList &&
          sellingList.length &&
          sellingList.map((item) => (
            <ProductGrid
              productList={item}
              mark={'selling'}
              key={`selling${item.keyword}`}
            />
          ))}
      </div>
    );
  }
}
export default PopularProductAnalyse;
