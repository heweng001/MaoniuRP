import gatherProductService from "@/js/service/gather-product";

const productHelperService = {
  gatherAndSaveProduct: async function (ctoken, url, sendResponse) {
    let result = await gatherProductService.gatherProductFromUrlList(
      [url],
      ctoken
    );
    console.log(result);
    let item = sessionStorage.getItem("nick");
    console.log(item);
    chrome.cookies.getAll(
      {
        domain: "localhost",
      },
      function (cookies) {
        console.log(cookies);
        let result = "";
        for (let cookieObj of cookies) {
          if (cookieObj.domain === ".localhost") {
            let { name, value } = cookieObj;
            result = result + `${name}=${value};`;
          }
        }
        sendResponse({ success: true, value: result });
      }
    );
  },
};
export default productHelperService;
