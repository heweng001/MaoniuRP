import { Axios } from "common";
import { ALI } from "@/js/service/keyword/api";
import { ALI_REPORT } from "@/js/service/report/api";

const MESSAGE = "查询太频繁，请明日再试！";

const headers = (form) => {
  return { "content-type": `multipart/form-data; boundary=${form._boundary}` };
};

let csrfToken;

function getNonP4pCsrfToken() {
  let url = ALI_REPORT.getAliNonP4pCsrfToken;
  return Axios({
    method: "get",
    url,
  })
    .then((res) => {
      let start = 'name="_csrf_token_" value="';
      let end = '"';
      let remain = res.substring(res.indexOfEnd(start));
      csrfToken = remain.substring(0, remain.indexOf(end));
    })
    .catch(() => {});
}

const rankService = {
  async getRankByKeyword(data, id) {
    if (!csrfToken) {
      await getNonP4pCsrfToken();
    }
    let url = ALI.getAliRankByKeyword;
    const form = new FormData();
    form.append("queryString", data.queryString);
    form.append("_csrf_token_", csrfToken);
    return Axios({
      method: "post",
      url,
      data: form,
      headers: headers(form),
    })
      .then((res) => {
        let parser = new DOMParser();
        let noRank = { keywordId: id, rank: 0 };
        let parsedHtml = parser.parseFromString(res, "text/html");
        let searchResult = parsedHtml.querySelectorAll(".search-result");
        let text = searchResult[0].innerText;
        if (text.trim() === MESSAGE) {
          return { success: false, message: MESSAGE };
        }
        let rankArr = parsedHtml.querySelectorAll(
          "#rank-searech-table tbody tr .ranking"
        );
        if (rankArr.length === 0) {
          return noRank;
        }
        let trArr = parsedHtml.querySelectorAll("#rank-searech-table tbody tr");
        for (let item of trArr) {
          let chargeArr = item.querySelectorAll(".charge span");
          if (
            chargeArr.length === 0 ||
            (chargeArr.length === 1 && chargeArr[0].innerText === "橱窗产品")
          ) {
            let product = item.querySelector(".products");
            let productName =
              product.querySelectorAll(":scope > a")[0].innerText;
            let productId = product
              .querySelector(":scope > div > a")
              .getAttribute("href")
              .split("id=")[1];
            let productImg = product
              .querySelector(":scope > div > a > img")
              .getAttribute("src")
              .replace("_50x50.jpg", "");
            let ranking = item.querySelector(".ranking a").innerText;
            let re = /\d+/gi;
            let rankArr = ranking.match(re);
            let rank, rankIndex, rankOrder;
            if (rankArr && rankArr.length > 1) {
              rank = parseInt(rankArr[0]);
              rankIndex = parseInt(rankArr[1]);
              if (rank === 1) {
                rankOrder = rankIndex;
              } else {
                rankOrder = (rank - 1) * 50 + rankIndex;
              }
            }
            return {
              keywordId: id,
              rank,
              rankIndex,
              rankOrder,
              rankProduct: productName,
              rankProductImg: productImg,
              rankProductId: parseInt(productId),
            };
          }
        }
        return noRank;
      })
      .catch((err) => {
        console.log(err);
        return { keywordId: 0, rank: 0 };
      });
  },
};

export default rankService;
