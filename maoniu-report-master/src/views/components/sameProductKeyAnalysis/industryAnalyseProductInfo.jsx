import React, { useMemo } from 'react';

import { getNested } from '@/utils/util';

import PopularProductTable from './popularProductTable';

const industryAnalyseProductInfo = ({ productsInfo }) => {
  const toRequireProductFormat = (originArray) => {
    let result = originArray
      .map((item) => {
        return {
          id: getNested(item, 'id'),
          image: getNested(item, 'imageUrls', 'original'),
          isRTS: getNested(item, 'rtsProduct'),
          productUrl: getNested(item, 'url'),
          tradePrice: {
            minOrder: getNested(item, 'moq'),
            price: getNested(item, 'fobPriceWithoutUnit'),
            unit: getNested(item, 'fobUnit'),
          },
          transanctionData: getNested(item, 'transactionInfo'),
          companyInfo: {
            companyName: '',
            homeUrl: '',
          },
        };
      })
      .slice(0, 10);
    return result;
  };

  const computedHotProductInfo = useMemo(() => {
    let result = toRequireProductFormat(productsInfo.hotProductInfo);
    return result;
  }, [productsInfo]);
  console.log('computedHotProductInfo', computedHotProductInfo);
  const computedShowCaseProductInfo = useMemo(() => {
    let result = toRequireProductFormat(productsInfo.showCaseProductInfo);
    return result;
  }, [productsInfo]);
  console.log('computedShowCaseProductInfo', computedShowCaseProductInfo);

  return (
    <>
      <div>
        <div className="title">热门产品</div>
        <PopularProductTable
          value={computedHotProductInfo}
          module-name="热门产品"
        ></PopularProductTable>
        <div className="title margin-top">橱窗产品</div>
        <PopularProductTable
          value={computedShowCaseProductInfo}
          module-name="橱窗产品"
        ></PopularProductTable>
      </div>
    </>
  );
};

export default industryAnalyseProductInfo;
