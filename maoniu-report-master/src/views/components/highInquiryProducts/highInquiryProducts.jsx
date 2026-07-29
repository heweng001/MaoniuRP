import { Component } from 'react';

import ProductGrid from './productGrid';

class HighInquiryProducts extends Component {
  constructor(props) {
    super(props);
    // this.getDataList = this.getDataList.bind(this);
    this.state = {
      // 高询盘列表
      inquiryList: [],
    };
  }

  componentDidMount() {
    this.getDataList();
  }

  // 获取高询盘列表
  getDataList = () => {
    const { dataSource } = this.props;
    const inquiryList = [];
    dataSource.forEach((item) => {
      item.highInquiryProductList &&
        inquiryList.push({
          list: item.highInquiryProductList.slice(0, 20),
          keyword: item.keyword,
        });
    });
    this.setState({ inquiryList });
  };

  render() {
    const { inquiryList } = this.state;

    return (
      <div>
        {/* 高询盘榜 */}
        {inquiryList &&
          inquiryList.length &&
          inquiryList.map((item) => (
            <ProductGrid
              productList={item}
              mark={'highInquiry'}
              key={`highInquiry${item.keyword}`}
            />
          ))}
      </div>
    );
  }
}
export default HighInquiryProducts;
