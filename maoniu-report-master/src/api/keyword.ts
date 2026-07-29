import { parseDomain, ParseResultType } from 'parse-domain';

import { MA_URL } from '@/constant';

import request from '../utils/request';
const PREFIX: string = `${MA_URL}/api/v1`;

const keywordApi = {
  // 重点关键词
  getEmphasisKeyword: (shopName: string) => {
    return request({
      url: `${PREFIX}/mydata/emphasis/${shopName}`,
      method: 'get',
    });
  },
  getKeywordHeat: (data: string[], shopName: string) => {
    const { host } = window.location;
    const parseResult = parseDomain(host);
    let privateDomain = 'maoniux.com';
    if (parseResult.type == ParseResultType.Listed) {
      const { domain, topLevelDomains } = parseResult;
      const joinDomain = [domain, ...topLevelDomains].join('.');
      privateDomain = joinDomain;
    }
    return request({
      url: `https://aifj.${privateDomain}/api/v1/keywords/heat/${shopName}`,
      method: 'post',
      data,
    });
  },
};
export default keywordApi;
