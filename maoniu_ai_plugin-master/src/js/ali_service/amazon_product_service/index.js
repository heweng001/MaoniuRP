import axios from "axios";
import { isArrayLength } from "util";

const PREFIX_URL = "https://www.amazon.com";
const urlList = [
  { url: `${PREFIX_URL}/gp/bestsellers/ref=zg_bsnr_tab`, name: "销量榜" },
  { url: `${PREFIX_URL}/gp/new-releases/ref=zg_bs_tab`, name: "新品榜" },
  {
    url: `${PREFIX_URL}/gp/movers-and-shakers/ref=zg_bsnr_tab`,
    name: "飙升榜",
  },
];

export function resetScoreAmazonProduct() {
  amazonProductCurrentProgress = 0;
}

let amazonProductCurrentProgress = 0;

function infoAmazonProductProgress(progressPort, progress) {
  const moduleName = "amazonProductList";
  amazonProductCurrentProgress += progress;
  progressPort.postMessage({
    moduleName,
    progress: amazonProductCurrentProgress,
  });
}

function getAmazonCategory(item) {
  const { url, name } = item;
  return axios({
    url,
    method: "get",
  })
    .then((res) => {
      const domParser = new DOMParser();
      const document = domParser.parseFromString(res.data, `text/html`);
      const categoryNode = document.getElementsByClassName(
        "_p13n-zg-nav-tree-all_style_zg-browse-root__-jwNv"
      );
      if (isArrayLength(categoryNode)) {
        const aNode = categoryNode[0].querySelectorAll("a");
        const categoryList = [];
        for (const node of aNode) {
          const url = PREFIX_URL + node.getAttribute("href");
          const categoryName = node.innerHTML;
          categoryList.push({ url, categoryName });
        }
        return {
          name,
          categoryList,
        };
      }
      return {};
    })
    .catch((err) => {
      console.log(`获取getAmazonCategory失败了${err}`);
    });
}

async function getThreeAmazonCategory() {
  const categoryList = [];
  for (const item of urlList) {
    const result = await getAmazonCategory(item);
    categoryList.push(result);
  }
  console.log(categoryList, "categoryList");
  return categoryList;
}

function getProductList(item) {
  const { name, url } = item;
  return axios({
    url,
    method: "get",
  })
    .then((res) => {
      const domParser = new DOMParser();
      const document = domParser.parseFromString(res.data, "text/html");
      const parentProductNode = document.getElementsByClassName(
        "a-cardui _p13n-zg-list-grid-desktop_style_grid-cell__1uMOS p13n-grid-content"
      );
      if (isArrayLength(parentProductNode)) {
        const productList = [];
        for (const node of parentProductNode) {
          const productInfo = {};
          // 排名
          const rankNode = node.getElementsByClassName(
            "_p13n-zg-list-grid-desktop_style_zg-grid-rank-metadata__33jPv"
          );
          if (isArrayLength(rankNode)) {
            const rank = rankNode[0].innerText;
            productInfo.rank = rank;
          }

          // 主图及产品链接
          const aNode = node.getElementsByClassName("a-link-normal");
          if (isArrayLength(aNode)) {
            const productUrl = aNode[0].getAttribute("href");
            productInfo.productUrl = PREFIX_URL + productUrl;
            const imageNode = aNode[0].getElementsByTagName("img");
            if (isArrayLength(imageNode)) {
              const imageUrl = imageNode[0].getAttribute("src");
              productInfo.imageUrl = imageUrl;
            }
          }

          // 标题
          const subjectNodeOne = node.getElementsByClassName(
            "_p13n-zg-list-grid-desktop_truncationStyles_p13n-sc-css-line-clamp-3__g3dy1"
          );
          const subjectNodeTwo = node.getElementsByClassName(
            "_p13n-zg-list-grid-desktop_truncationStyles_p13n-sc-css-line-clamp-4__2q2cc"
          );
          if (isArrayLength(subjectNodeOne)) {
            productInfo.subject = subjectNodeOne[0].innerText;
          }
          if (isArrayLength(subjectNodeTwo)) {
            productInfo.subject = subjectNodeTwo[0].innerText;
          }

          // 价格
          const priceNodeOne = node.getElementsByClassName(
            "_p13n-zg-list-grid-desktop_price_p13n-sc-price__3mJ9Z"
          );
          const priceNodeTwo = node.getElementsByClassName("p13n-sc-price");
          const prices = [];
          if (isArrayLength(priceNodeOne)) {
            for (const price of priceNodeOne) {
              prices.push(price.innerText);
            }
          }
          if (isArrayLength(priceNodeTwo)) {
            for (const price of priceNodeTwo) {
              prices.push(price.innerText);
            }
          }
          productInfo.prices = prices;

          productList.push(productInfo);
        }
        return {
          name,
          productList: productList.slice(0, 20),
        };
      }
      return {
        name,
        productList: [],
      };
    })
    .catch((err) => {
      console.log(`获取getProductList失败了${err}`);
    });
}

async function getThreeProductList(urls, progressPort) {
  const results = [];
  const score = 100 / urls.length;
  for (const item of urls) {
    const result = await getProductList(item);
    results.push(result);
    infoAmazonProductProgress(progressPort, score);
  }
  return results;
}

const amazonProductService = {
  async getAmazonProductCategoryList() {
    return await getThreeAmazonCategory();
  },
  async getAmazonProductList(param, progressPort) {
    return await getThreeProductList(param.amazonPageUrl, progressPort);
  },
};

export default amazonProductService;
