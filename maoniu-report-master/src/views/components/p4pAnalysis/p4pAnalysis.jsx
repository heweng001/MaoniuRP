import React, { Component } from 'react';

import CampaignAnalyseData from './campaignAnalyseData';
import KeywordAnalyseData from './keywordAnalyseData';
import ProductAnalyseData from './productAnalyseData';
class P4pAnalysis extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { keywordAnalyseData, productAnalyseData, campaignData } =
      this.props.dataSource;
    return (
      <>
        {campaignData?.length && <CampaignAnalyseData dataSource={campaignData} />}
        {productAnalyseData?.length && (
          <ProductAnalyseData dataSource={productAnalyseData} />
        )}
        <KeywordAnalyseData dataSource={keywordAnalyseData} />
      </>
    );
  }
}
export default P4pAnalysis;
