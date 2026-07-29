import React from 'react';

import IndustryAnalyseCompanyInfoTable from './industryAnalyseCompanyInfoTable';
import IndustryAnalyseProductInfo from './industryAnalyseProductInfo';

const newIndustryAnalyse = (props) => {
  const {
    industryDataArray = [
      {
        shopAddress: '',
        companyInfo: {},
        productsInfo: {},
        transactionInfo: {},
      },
    ],
  } = props;

  return (
    <section className="industryAnalyse">
      {industryDataArray.map((item, index) => {
        return (
          <div key={index}>
            <IndustryAnalyseCompanyInfoTable
              companyInfo={item.companyInfo}
            ></IndustryAnalyseCompanyInfoTable>
            <IndustryAnalyseProductInfo
              productsInfo={item.productsInfo}
            ></IndustryAnalyseProductInfo>
          </div>
        );
      })}
    </section>
  );
};

export default newIndustryAnalyse;
