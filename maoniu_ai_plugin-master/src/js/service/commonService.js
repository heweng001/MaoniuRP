import { Axios } from "../common";

const commonService = {
  getCsrfToken() {
    let url = "https://message.alibaba.com/message/default.htm";
    return Axios({
      method: "get",
      url,
    })
      .then((res) => {
        const csrfT = res.substring(res.indexOfEnd("csrfTokenVal: '"));
        let resultJson = csrfT.substring(0, csrfT.indexOf("',"));
        return resultJson;
      })
      .catch(() => {});
  },
  getXsrfToken() {
    let promise = new Promise((resolve) => {
      chrome.cookies.getAll(
        {
          domain: "post.alibaba.com",
          name: "XSRF-TOKEN",
        },
        async function (res) {
          if (res[0] && res[0].value) {
            resolve(res[0].value);
          } else {
            resolve("");
          }
        }
      );
    });
    return promise;
  },
  getXsrfToken2() {
    let promise = new Promise((resolve) => {
      chrome.cookies.getAll(
        {
          domain: ".alibaba.com",
          name: "XSRF-TOKEN",
        },
        async function (res) {
          res = res.filter((item) => item.domain === ".alibaba.com");
          if (res[0] && res[0].value) {
            resolve(res[0].value);
          } else {
            resolve("");
          }
        }
      );
    });
    return promise;
  },
};
export default commonService;
