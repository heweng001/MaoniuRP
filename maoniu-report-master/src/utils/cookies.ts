const cookies = {
  getCookie: (name: string) => {
    //name 为想要取到的键值的键名
    const reg = /\s/g;
    const result = document.cookie.replace(reg, '');
    const resultArr = result.split(';');
    for (let i = 0; i < resultArr.length; i++) {
      const nameArr = resultArr[i].split('=');
      if (nameArr[0] === name) {
        return nameArr[1];
      }
    }
  },
};

export default cookies;
