import { Axios } from "@/js/common";
import qs from "qs";
const nonFormHeaders = { "content-type": "application/x-www-form-urlencoded" };

export default {
  /**
   * Deletes a photo from the photo bank.
   *
   * @param {string} ctoken - The authentication token.
   * @param {Array} ids - The array of photo IDs to be deleted.
   * @return {Promise} A promise that resolves to the response from the server.
   */
  deletePhotoBankImage(ctoken, ids) {
    return Axios({
      method: "POST",
      url: "https://photobank.alibaba.com/fetch/bank/photo/status",
      params: { ctoken },
      data: qs.stringify({
        status: 2,
        ids: JSON.stringify(ids),
      }),
      headers: nonFormHeaders,
    });
  },
};
