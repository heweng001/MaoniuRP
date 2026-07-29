import JSON5 from "json5";
const JS_TYPE = {
  NULL: "[object Null]",
  OBJECT: "[object Object]",
  ARRAY: "[object Array]",
  DATE: "[object Date]",
  STRING: "[object String]",
};

export function isType(val, type) {
  return Object.prototype.toString.call(val) === type;
}

export function partition(array, size) {
  return array.length
    ? [array.splice(0, size)].concat(partition(array, size))
    : [];
}
export function isArray(val) {
  return isType(val, JS_TYPE.ARRAY);
}
export function isArrayLength(val) {
  return val && isArray(Array.from(val)) && val.length;
}
export function isString(val) {
  return isType(val, JS_TYPE.STRING);
}
export function isBoolean(val) {
  return typeof val == "boolean";
}
export function isNumber(val) {
  return !isNaN(val) && val !== Infinity;
}
export function getNested(obj, ...args) {
  return args.reduce((obj, level) => obj && obj[level], obj);
}
export function isJson(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}
export function isJson5(str) {
  try {
    JSON5.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

export function isNull(val) {
  return isType(val, JS_TYPE.NULL) || (!val && typeof val === "object");
}

export function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function isDef(val) {
  return val !== "" && val !== void 0 && !isNull(val)
    ? isArray(val)
      ? !!val.length
      : true
    : false;
}
export function isObject(val) {
  return (
    (isType(val, JS_TYPE.OBJECT) || typeof val === "function") && !isNull(val)
  );
}

export function numberToPercent(num = 0, point = 2) {
  return (num * 100).toFixed(point);
}

//数组对象去重
export function unique(arr, name) {
  const res = new Map();
  return arr.filter((arr) => !res.has(arr[name]) && res.set(arr[name], 1));
}

export const toUrlEncoded = (obj, encode) =>
  Object.keys(obj)
    .map((k) => {
      let encodeUri = (encode ? encodeURIComponent(k) : k) + "=";
      if (obj[k]) {
        encodeUri += encode
          ? encodeURIComponent(JSON.stringify(obj[k]))
          : encodeURIComponent(obj[k]);
      }
      return encodeUri;
    })
    .join("&");

export function encode(param, arr) {
  const keys = Reflect.ownKeys(param);
  keys.forEach((key) => {
    const val = param[key];
    if (!key.includes("_") && isDef(val)) {
      if (isObject(val)) {
        encode(val, arr);
      } else if (isArray(val)) {
        let innerArrData = [];
        for (let item of val) {
          if (isArray(item) || isObject(item)) {
            encode(val, arr);
          } else {
            if (isDef(item)) {
              innerArrData.push(item);
            }
          }
        }
        arr.push(
          `${encodeURIComponent(key)}=${encodeURIComponent(
            innerArrData.join(",")
          )}`
        );
      } else {
        arr.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
      }
    }
  });
  return arr.join("&");
}

export function unescapeHtml(str) {
  return str.replace(
    /&amp;|&lt;|&gt;|&#39;|&quot;/g,
    (tag) =>
      ({
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&#39;": "'",
        "&quot;": '"',
      }[tag] || tag)
  );
}

/**
 * 字符串截取
 * @param source
 * @param start
 * @param end
 * @param includes: 是否截取start和end
 * @returns {*}
 */
export function subStringBetween(source, start, end = null, includes = false) {
  if (!source) {
    return "";
  }
  let startIndex = source.indexOf(start);
  if (startIndex >= 0) {
    if (!end) {
      return source.slice(startIndex + start.length).trim();
    } else {
      if (typeof end === "string") {
        let endIndex = source.indexOf(end, startIndex + start.length);
        if (endIndex > 0) {
          if (includes) {
            return source.slice(startIndex, endIndex + end.length).trim();
          } else {
            return source.slice(startIndex + start.length, endIndex).trim();
          }
        } else {
          return "";
        }
      } else {
        let allEnd = [];
        for (let e of end) {
          let index = source.find(e, startIndex + start.length);
          if (index > 0) {
            allEnd.push(index);
          }
        }
        if (allEnd.length > 0) {
          let endIndex = Math.min(...allEnd);
          if (includes) {
            return source.slice(startIndex, endIndex + end.length).trim();
          } else {
            return source.slice(startIndex + start.length, endIndex).trim();
          }
        } else {
          return "";
        }
      }
    }
  } else {
    return "";
  }
}
