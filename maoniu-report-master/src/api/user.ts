import { MA_URL } from '@/constant';

import request from '../utils/request';

const User = {
  getUserStatus: (shopName: string) => {
    return request({
      url: `${MA_URL}/api/v1/mydata/fbconfig/${shopName}`,
      method: 'get',
    });
  },
};

export default User;
