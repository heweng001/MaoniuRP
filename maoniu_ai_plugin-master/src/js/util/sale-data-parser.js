import CryptoJS from "crypto-js";
import { Axios } from "../common";

let ivbnm;
export default {
  async decodePositionData(value) {
    if (!ivbnm) {
      ivbnm = await getIvbnm();
    }
    console.log("🚀 ~ ivbnm:", ivbnm);
    return _decode(value);
  },
};

async function getIvbnm() {
  return await Axios({
    url: "https://profile.alibaba.com/profile/detail_buyer_select.htm",
  }).then((res) => {
    const prefix = "window.ivbnm = ";
    const suffix = ";";
    const slicePrefix = res.substring(res.indexOf(prefix) + prefix.length);
    return slicePrefix.substring(0, slicePrefix.indexOf(suffix));
  });
}

function _decode(value) {
  var t = CryptoJS.enc.Utf8.parse("04adb4e2f055c978c9bb101ee1bc5cd4"),
    n = CryptoJS.enc.Utf8.parse(ivbnm);
  return CryptoJS.AES.decrypt(value, t, {
    iv: n,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Iso10126,
  }).toString(CryptoJS.enc.Utf8);
}
