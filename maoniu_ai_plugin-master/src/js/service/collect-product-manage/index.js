import { getNested, isArrayLength, isJson, isNumber } from "util";
// import axios from "axios";
import { Axios } from "@/js/common";

async function convertData(formList, otherData, domain) {
  const {
    brandName = "OEM",
    customAttribute1688 = "no",
    endNumber = "",
    exchangeRate = "1",
    onlyDetailDescription = false,
    operator: priceSymbol = "multiply",
    prefix = "",
    productGroup = [],
    productType = "sourcing",
    profits: profit = "100",
    remark = "",
    removeAllLink = false,
    startNumber = "",
    tradeName = "",
    video = "no",
    shippingTemplateId = "",
    countryPreference = "",
  } = otherData;
  const emptyList = ["no", ""];
  let models = [];
  if ((startNumber && endNumber) || prefix) {
    models = getModels(startNumber, endNumber, prefix);
  }
  formList.forEach((item, index) => {
    // Brand Name
    replaceModelName(item, "Brand Name", brandName);
    // descriptionDetail
    if (item.descriptionDetail) {
      setModelFrom1688(item);
    }
    // model
    if (isArrayLength(models) && models[index]) {
      item["model"] = models[index];
    }
    // customAttribute1688
    if (emptyList.includes(customAttribute1688)) {
      setCustomAttribute1688(item);
    }
    // video
    if (emptyList.includes(video)) {
      setProductVideo(item);
    }
    if (video === "yes") {
      setDefaultProductVideo(item);
    }
  });
  const webProductOtherData = {
    tradeName,
    remark,
    groupId: getGroupId(productGroup),
    groupIdChain: getGroupIdChain(productGroup),
    groupInfo: await getGroupInfo(productGroup, domain),
    onlyDetailDescription,
    productType,
    exchangeRate: getExchangeRate(exchangeRate),
    priceSymbol,
    profit: getProfit(profit),
    removeAllLink,
    shippingTemplateId,
    countryPreference,
  };
  return {
    formList,
    webProductOtherData,
  };
}

function getModels(startNumber, endNumber, prefix) {
  const models = [];
  if (startNumber.toString().startsWith("0")) {
    const length = startNumber.length;
    for (let i = startNumber; i <= endNumber; i++) {
      models.push(prefix + i.toString().padStart(length, "0"));
    }
  } else {
    for (let i = startNumber; i <= endNumber; i++) {
      models.push(prefix.toString() + i);
    }
  }
  return models;
}

function replaceModelName(item, modelName, val) {
  if (item && Object.hasOwn(item, "attribute")) {
    let value = getNested(item, "attribute", "productBasicProperties", "value");
    if (!value) {
      value = getNested(item, "attribute", "productBasicProperties");
    }
    if (value) {
      for (let name of value) {
        if (name.attrName === "Model Number") {
          item.model = name.attrValue;
        }
        if (name.attrName === modelName) {
          name.attrValue = val;
        }
      }
    }
  }
}

function setModelFrom1688(item) {
  const descriptionDetail = item.descriptionDetail;
  if (isJson(descriptionDetail)) {
    let detail = JSON.parse(descriptionDetail);
    let supplierNumber = getNested(detail, "supplierNumber");
    item["model"] = supplierNumber;
  }
}

function setCustomAttribute1688(item) {
  if (item && Object.hasOwn(item, "attributeFrom1688")) {
    item.attributeFrom1688 = [];
  }
}

function setProductVideo(item) {
  if (item && Object.hasOwn(item, "videoUrl")) {
    item.videoUrl = "";
  }
}

function setDefaultProductVideo(item) {
  if (
    item &&
    Object.hasOwn(item, "videoUrl") &&
    item.videoUrl.endsWith("/0.mp4")
  ) {
    item.videoUrl = "";
  }
}

function getGroupId(productGroup) {
  if (isArrayLength(productGroup)) {
    return productGroup.at(-1);
  }
  return "";
}

function getGroupIdChain(productGroup) {
  if (isArrayLength(productGroup)) {
    return productGroup.join();
  }
  return "";
}

async function getGroupInfo(productGroup, domain) {
  let groups = await getProductGroup(domain);
  const result = [];
  if (isArrayLength(productGroup)) {
    for (const group of productGroup) {
      const firstGroupInfo = groups.find((f) => +f.value === +group);
      if (firstGroupInfo) {
        result.push(firstGroupInfo.label);
        if (isArrayLength(firstGroupInfo.children)) {
          groups = firstGroupInfo.children;
        }
      }
    }
    if (isArrayLength(result)) {
      return result.join(">");
    }
  }
  return "";
}

function getExchangeRate(exchangeRate) {
  if (exchangeRate && isNumber(+exchangeRate)) {
    return +exchangeRate;
  }
  return "";
}

function getProfit(profit) {
  if (profit && isNumber(+profit)) {
    return profit / 100;
  }
  return "";
}

function getProductGroup(domain) {
  const url = getProductGroupUrl(domain);
  return Axios({
    url,
    method: "get",
  }).then((res) => {
    const data = getNested(res, "data");
    if (isArrayLength(data)) {
      return res.data.map((m) => {
        return {
          label: m.groupName,
          value: m.groupId,
          children: convertProductGroup(m.children),
        };
      });
    }
    return [];
  });
}

function convertProductGroup(groups) {
  if (isArrayLength(groups)) {
    return groups.map((m) => {
      const res = {
        label: m.groupName,
        value: m.groupId,
        children: [],
      };
      if (isArrayLength(m.children)) {
        res.children = convertProductGroup(m.children);
      }
      return res;
    });
  }
  return [];
}

function getProductGroupUrl(domain) {
  if (domain === "localhost") {
    return "http://192.168.5.123:8761/api/v1/product-group";
  }
  return `https://${domain}/api/v1/product-group`;
}

function getCollectProductConfigUrl(domain) {
  if (domain === "localhost") {
    return "http://192.168.5.123:8761/api/v1/collect-product-config";
  }
  return `https://${domain}/api/v1/collect-product-config`;
}

function getTemplateInfoUrl(val, domain) {
  if (domain === "localhost") {
    return `http://192.168.5.123:8761/api/v1/collect-product-config/${val}`;
  }
  return `https://${domain}/api/v1/collect-product-config/${val}`;
}

// function getTemplateUrl(domain, nick) {
//   // console.log(domain, "domain");
//   if (domain === "localhost") {
//     return `http://localhost:8761/api/v1/collect-product-config/by/${nick}`;
//   }
//   return `https://${domain}/api/v1/collect-product-config/by/${nick}`;
// }

function getTemplateDetailInfo(url) {
  return Axios({
    url,
    methods: "get",
  })
    .then((res) => {
      return res;
    })
    .catch((err) => {
      console.log(`获取采集品模板名称数据出错了: ${err}`);
    });
}

const collectProductManage = {
  async getCollectProductData(formList, webProductOtherData, domain) {
    return await convertData(formList, webProductOtherData, domain);
  },
  getCollectProductConfig(domain) {
    return Axios({ url: getCollectProductConfigUrl(domain) }).then((res) => {
      return res;
    });
  },
  getCollectProductConfigDetail(val, domain) {
    return getTemplateDetailInfo(getTemplateInfoUrl(val, domain));
  },

  // async getTemplateInfo(val, domain) {
  //   const templateInfoUrl = getTemplateInfoUrl(val, domain);
  //   if (templateInfoUrl) {
  //     return await getTemplateDetailInfo(templateInfoUrl);
  //   }
  //   return null;
  // },
};
export default collectProductManage;
