import Axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

const service = Axios.create({});

service.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

service.interceptors.response.use(
  (response: AxiosResponse) => {
    if (response.status >= 300) {
      return Promise.reject(response);
    }
    return response;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

export default service;
