import { MA_URL } from '@/constant';

import request from '../utils/request';

const PREFIX: string = `${MA_URL}/api/v1/report`;

const reportApi = {
  getReportList: (params: any) => {
    return request({
      url: `${PREFIX}`,
      method: 'get',
      params,
    });
  },
  postReport: (data: any) => {
    return request({
      url: `${PREFIX}`,
      method: 'post',
      data,
    });
  },
  getReportDetail: (reportId: number) => {
    return request({
      url: `${PREFIX}/${reportId}`,
      method: 'get',
    });
  },
  getReportSuccessRate: () => {
    return request({
      url: `${PREFIX}/success-rate`,
      method: 'get',
    });
  },
  getRecentHourIpCount: () => {
    return request({
      url: `${PREFIX}/ip-count`,
      method: 'get',
    });
  },
  getIpLock() {
    return request({
      url: `${MA_URL}/api/v1/shopDiagnosis/ip-lock`,
      method: 'get',
    });
  },
  releaseIpLock: () => {
    return request({
      url: `${MA_URL}/api/v1/shopDiagnosis/ip-lock`,
      method: 'delete',
    });
  },
  updateReportDetail: (data: any) => {
    return request({
      url: `${PREFIX}/detail`,
      method: 'PUT',
      data,
    });
  },
  getLatestVersion: () => {
    return request({
      url: `${MA_URL}/api/v1/plugin-version`,
      method: 'get',
    });
  },
  getAgentInfo: (params: { oem: string }) => {
    return request({
      url: `${MA_URL}/api/v1/companies/oem/report`,
      method: 'get',
      params,
    });
  },
  getSaleRankProduct: (data: string[]) => {
    return request({
      url: `${PREFIX}/sale-rank-product`,
      method: 'post',
      data,
    });
  },
};

export default reportApi;
