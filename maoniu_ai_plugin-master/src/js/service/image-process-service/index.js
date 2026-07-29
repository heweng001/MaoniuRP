import { Axios } from "@/js/common";

// const domain = "aifj.maoniux.com";

function getImageProcessCompressUrl(domain) {
  if (domain?.includes("localhost")) {
    return `http://192.168.5.123:8761/api/v1/image-process/compress/by-url`;
  }
  return `https://${domain}/api/v1/image-process/compress/by-url`;
}

export default {
  compressImageByUrl(url, domain) {
    return Axios({
      url: getImageProcessCompressUrl(domain),
      method: "post",
      params: { url, kbyte: 1000 * 2 },
    }).then((res) => {
      return res;
    });
  },
  //   compressImage(file) {
  //     return Axios({
  //       url: getImageProcessCompressUrl(),
  //       method: "post",
  //       data: { file },
  //     }).then((res) => res);
  //   },
};
