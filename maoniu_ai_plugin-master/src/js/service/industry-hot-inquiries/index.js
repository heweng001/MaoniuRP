import companyService from "@/js/ali_service/company_service";
import productService from "@/js/ali_service/product-service";
import sameIndustryService from "@/js/ali_service/same_industry_service";
import _ from "lodash";

function rGroup(shopUrl, groups) {
  return groups.map(async (item) => {
    if (item.children?.length) {
      return (await Promise.all(rGroup(shopUrl, item.children))).flatMap(
        (item) => item
      );
    }
    const { url } = item;

    const productListData = await productService.getProductListPageData(
      `${shopUrl}${url}`
    );
    const productList =
      productListData?.productListPc?.mds?.moduleData?.data?.productList;
    return doCategories(productList.slice(0, 2));
  });
}

async function doCategories(productList) {
  const productIds = productList.map((item) => item.id);
  if (!productIds?.length) {
    return [];
  }
  let compareProductsData = [];
  try {
    compareProductsData = await sameIndustryService.getCompareProductsData(
      productIds
    );
  } catch (err) {
    return [];
  }

  const promises = _.shuffle(compareProductsData)
    ?.slice(0, 100)
    .map((item) => {
      const { compareCompanyView, compareProductView } = item;

      const { iquiries } = compareCompanyView;

      const { productDetailUrl } = compareProductView;

      return productService
        .getProductDetail(productDetailUrl)
        .then((res) => {
          const categoryId = res?.globalData?.product?.productCategoryId;
          return { categoryId, iquiries };
        })
        .catch((err) => {
          console.error(err);
        });
    });
  return await Promise.all(promises);
}

export default {
  async shopCategoryInquries(shopUrl) {
    let pageModuleData = await productService.getProductListPageData(
      `${shopUrl}/productlist.html`
    );

    const { productGroups } = pageModuleData;

    const groups = productGroups?.mds?.moduleData?.data?.groups;

    // 按分组取产品
    const groupPromises = rGroup(shopUrl, groups);

    // 取橱窗产品
    const showcasePromises = companyService
      .getShowcaseProductList(shopUrl)
      .then((res) => {
        return doCategories(res.slice(0, 4));
      });
    // console.log(showcasePromises);

    // 取销量最高产品
    const orderPromises = companyService
      .getProductList(shopUrl, { sortType: "ctrOrder-desc" })
      .then((res) => {
        return doCategories(res.slice(0, 4));
      });
    // console.log(orderPromises);

    const data = (
      await Promise.all([...groupPromises, showcasePromises, orderPromises])
    )
      .flatMap((item) => item)
      .filter((item) => item);
    // console.log(data);
    const uniqueData = {};
    for (let item of data) {
      const categoryId = item.categoryId;
      if (
        !uniqueData[categoryId] ||
        item.iquiries > uniqueData[categoryId].iquiries
      ) {
        uniqueData[categoryId] = item;
      }
    }

    const uniqueArray = Object.values(uniqueData);
    console.log(
      `更新店铺 ${shopUrl} 类目询盘统计, 共检测${data.length}条数据， 去重后${uniqueArray.length}`
    );
    return uniqueArray;
  },
};
