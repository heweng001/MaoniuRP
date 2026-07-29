import { Axios } from './common.js';

function request(options) {
  return Axios(options).then((data) => ({ data }));
}

function axios(options) {
  return request(options);
}

axios.get = (url, config = {}) => request({ ...config, url, method: 'get' });
axios.post = (url, data, config = {}) =>
  request({ ...config, url, method: 'post', data });

export default axios;
