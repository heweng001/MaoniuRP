/**
 *
 * @param {String} domain
 * @param {String} name
 * @returns
 */
async function getCookie(domain, name) {
  return new Promise((resolve) => {
    chrome.cookies.getAll({ domain, name }, (cookies) => {
      // existing logic to return cookie value
      resolve(cookies);
    });
  });
}
/**
 *
 * @param {String} url
 * @param {*} cookie
 * @param {String} name
 * @param {String} newValue
 * @returns
 */
function updateCookie(url, cookie, name, newValue) {
  return new Promise((resolve) => {
    const { domain, path, expirationDate } = cookie;
    chrome.cookies.set(
      {
        domain,
        path,
        url,
        expirationDate,
        name,
        value: newValue,
      },
      () => {
        console.log(`set ${domain} cookie ${name} value ${newValue}`);
        resolve();
      }
    );
  });
}

function updateLocale(value) {
  const newValue = value
    ?.split("&")
    ?.map((item) => {
      let [k, v] = item.split("=");
      if (k === "sc_b_locale" && v !== "en_US") {
        v = "en_US";
      }
      return [k, v].join("=");
    })
    ?.join("&");
  return newValue;
}

export default {
  /**
   *
   * @param {String} url
   */
  async convertAlibaba2EnglishSite(url) {
    try {
      const domainName = "sc_g_cfg_f";
      const cookies = await getCookie(".alibaba.com", domainName);

      if (cookies && cookies.length) {
        await Promise.all(
          cookies.map(async (cookie) => {
            const updatedValue = updateLocale(cookie.value);

            if (updatedValue !== cookie.value) {
              await updateCookie(url, cookie, domainName, updatedValue);
            }
          })
        );
      }
    } catch (error) {
      console.error(error);
    }
  },
};
