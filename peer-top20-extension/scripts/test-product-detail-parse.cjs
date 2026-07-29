const crypto = require('crypto');

function getCompareId(ids) {
  return crypto.createHash('md5').update([...ids, '91801202compare'].join(',')).digest('hex');
}

function parseProductDetail(html) {
  if (typeof html !== 'string') {
    return null;
  }
  const markers = ['window.detailData = ', 'window.__detail_data__ = '];
  for (const marker of markers) {
    const start = html.indexOf(marker);
    if (start === -1) {
      continue;
    }
    const end = html.indexOf('"js_ssr"}}}', start);
    if (end === -1) {
      continue;
    }
    const jsonText = `${html.substring(start + marker.length, end)}"js_ssr"}}}`;
    try {
      return JSON.parse(jsonText);
    } catch (error) {
      console.log('parse fail for marker', marker, error.message);
    }
  }
  return null;
}

function parseCategoryFromPathList(html) {
  if (typeof html !== 'string') {
    return null;
  }
  const start = html.indexOf('"pathList":');
  if (start === -1) {
    return null;
  }
  const snippet = html.substring(start, start + 4000);
  const end = snippet.indexOf(']');
  if (end === -1) {
    return null;
  }
  try {
    const pathList = JSON.parse(snippet.substring(0, end + 1).replace('"pathList":', ''));
    const last = pathList[pathList.length - 1];
    const categoryName = last?.hrefObject?.name || last?.name || '';
    const categoryId = last?.hrefObject?.categoryId || last?.categoryId || categoryName;
    return { categoryId: String(categoryId || categoryName), categoryName };
  } catch (error) {
    console.log('pathList parse fail', error.message);
    return null;
  }
}

async function main() {
  const listRes = await fetch('https://shengdeproduct.en.alibaba.com/featureproductlist.html', {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Referer: 'https://shengdeproduct.en.alibaba.com/productlist.html',
    },
  });
  const listHtml = await listRes.text();
  const m = listHtml.match(/module-title=(['"])productListPc\1[^>]*module-data=(['"])([\s\S]*?)\2/i);
  const d = JSON.parse(decodeURIComponent(m[3]));
  const ids = (d.mds.moduleData.data.productList || []).slice(0, 3).map((p) => p.id).filter(Boolean);
  console.log('ids', ids);

  const cmpUrl = `https://www.alibaba.com/detail/compareProducts.html?ids=${ids.join(',')}&compareId=${getCompareId(ids)}`;
  const cmpRes = await fetch(cmpUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Referer: 'https://www.alibaba.com/detail/compareProducts.html',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  const cmpHtml = await cmpRes.text();
  const start = cmpHtml.indexOf('  data: ');
  const end = cmpHtml.indexOf(' });', start);
  const parsed = JSON.parse(cmpHtml.substring(start + 8, end));
  const sample = parsed.listView[0];
  console.log('compare keys', Object.keys(sample.compareProductView || {}));
  console.log('productDetailUrl', sample?.compareProductView?.productDetailUrl);
  console.log('detailUrl', sample?.compareProductView?.detailUrl);

  let url = sample?.compareProductView?.productDetailUrl || sample?.compareProductView?.detailUrl;
  if (url.startsWith('//')) url = `https:${url}`;
  if (!url.startsWith('http')) url = `https://${url}`;
  console.log('normalized', url);

  const detRes = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: 'https://shengdeproduct.en.alibaba.com/productlist.html',
      Accept: '*/*',
    },
  });
  console.log('detail status', detRes.status, 'ctype', detRes.headers.get('content-type'));
  const detText = await detRes.text();
  console.log('detail len', detText.length);
  console.log('has detailData', detText.includes('window.detailData = '));
  console.log('has __detail_data__', detText.includes('window.__detail_data__ = '));
  console.log('has pathList', detText.includes('"pathList":'));
  console.log('has productCategoryId', detText.includes('productCategoryId'));
  console.log('has captcha', detText.includes('"action": "captcha"'));

  const detailData = parseProductDetail(detText);
  console.log('parseProductDetail', detailData ? 'ok' : 'null');
  if (detailData) {
    console.log('productCategoryId', detailData?.globalData?.product?.productCategoryId);
    const pathList = detailData?.globalData?.seo?.breadCrumb?.pathList;
    console.log('pathList len', pathList?.length, 'last', pathList?.[pathList.length - 1]);
  }
  console.log('parseCategoryFromPathList', parseCategoryFromPathList(detText));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
