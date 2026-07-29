import React, { useEffect, useState } from 'react';

import ProductGrid from './productGrid';

const TopSaleRankProduct = ({ dataSource }) => {
  const [dataList, setDataList] = useState([]);

  useEffect(() => {
    console.log('🚀 ~ TopSaleRankProduct ~ componentDidMount ~ componentDidMount:');
    getDataList();
  }, [dataSource]);

  const getDataList = () => {
    const list = dataSource?.map((item) => {
      item.selected = item.products?.[0];
      return item;
    });
    setDataList(list);
  };

  const handleCategoryChange = (keyword, category) => {
    console.log(
      '🚀 ~ TopSaleRankProduct ~ handleCategoryChange ~ keyword:',
      keyword,
      category,
    );
    const keywordObj = dataList?.find((item) => item.keyword === keyword);
    let selected = keywordObj?.products?.find((item) => item.category === category);
    keywordObj.selected = selected;
    setDataList([...dataList]);
  };

  return (
    <div>
      {dataList?.map((dataItem, index) => {
        return (
          <div key={index}>
            <ProductGrid
              data={dataItem}
              handleCategoryChange={handleCategoryChange}
            ></ProductGrid>
          </div>
        );
      })}
    </div>
  );
};

export default TopSaleRankProduct;
