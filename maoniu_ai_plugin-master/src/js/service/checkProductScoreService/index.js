import Axios from "axios";
import commonService from "@/js/service/commonService";
import { getNested } from "util";

const productCheckService = {
  async checkScore(param) {
    console.log(param);
    let { id, catId, jsonBody } = param;
    let xsrfToken = await commonService.getXsrfToken();
    if (!xsrfToken) {
      xsrfToken = await commonService.getXsrfToken2();
    }
    let formData = new FormData();
    formData.append("catId", catId);
    formData.append("jsonBody", JSON.stringify(jsonBody));
    return Axios({
      url: "https://post.alibaba.com/product/asyncOpt.htm",
      headers: {
        "x-xsrf-token": xsrfToken,
        "content-type": "application/x-www-form-urlencoded",
        "x-requested-with": "XMLHttpRequest",
      },
      method: "post",
      params: {
        optType: "productQualityAsyncRender",
        "X-XSRF-TOKEN": xsrfToken,
      },
      data: formData,
    }).then((res) => {
      let data = getNested(
        res,
        "data",
        "components",
        "productQuality",
        "props"
      );
      let formError = getNested(res, "data", "models", "formError");
      console.log(res);
      return { id, data, formError };
    });
  },
  async checkProductRisk(data) {
    console.log(data);
    let { id, catId, jsonBody } = data;
    let xsrfToken = await commonService.getXsrfToken();
    let formData = new FormData();
    formData.append("catId", catId);
    formData.append("jsonBody", JSON.stringify(jsonBody));
    return Axios({
      url: "https://post.alibaba.com/product/asyncOpt.htm",
      headers: {
        "x-xsrf-token": xsrfToken,
        "content-type": "application/x-www-form-urlencoded",
        "x-requested-with": "XMLHttpRequest",
      },
      method: "post",
      params: {
        optType: "productRiskCheckAsyncRender",
        "X-XSRF-TOKEN": xsrfToken,
      },
      data: formData,
    }).then((res) => {
      console.log(res);
      let data = getNested(res, "data", "models");
      return { id, data };
    });
  },
};
export default productCheckService;
