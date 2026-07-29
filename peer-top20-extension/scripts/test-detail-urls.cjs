const crypto = require('crypto');

function getCompareId(ids) {
  return crypto.createHash('md5').update([...ids, '91801202compare'].join(',')).digest('hex');
}

async function inspect(url, label, headers) {
  const res = await fetch(url, { headers });
  const text = await res.text();
  console.log('\n===', label, '===');
  console.log('status', res.status, 'len', text.length);
  console.log('detailData', text.includes('window.detailData'));
  console.log('__detail_data__', text.includes('window.__detail_data__'));
  console.log('pathList', text.includes('"pathList"'));
  console.log('productCategoryId', /"productCategoryId"\s*:\s*\d+/.test(text));
  console.log('captcha', text.includes('"action": "captcha"'));
  console.log('login', text.includes('"action": "login"'));
  const catMatch = text.match(/"productCategoryId"\s*:\s*"?(\d+)"?/);
  console.log('categoryId match', catMatch?.[1] || null);
  return text;
}

async function main() {
  const ids = [1601190991934];
  const cmpUrl = `https://www.alibaba.com/detail/compareProducts.html?ids=${ids.join(',')}&compareId=${getCompareId(ids)}`;
  const cmpRes = await fetch(cmpUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      Referer: 'https://www.alibaba.com/detail/compareProducts.html',
    },
  });
  const cmpHtml = await cmpRes.text();
  const start = cmpHtml.indexOf('  data: ');
  const end = cmpHtml.indexOf(' });', start);
  const sample = JSON.parse(cmpHtml.substring(start + 8, end)).listView[0];
  let url = sample.compareProductView.productDetailUrl;
  if (url.startsWith('//')) url = `https:${url}`;

  const shopUrl = `https://shengdeproduct.en.alibaba.com/product-detail/${url.split('/').pop()}`;

  const baseHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  await inspect(url, 'www without xhr', { ...baseHeaders, Referer: 'https://shengdeproduct.en.alibaba.com/productlist.html' });
  await inspect(url, 'www with xhr', {
    ...baseHeaders,
    Referer: 'https://shengdeproduct.en.alibaba.com/productlist.html',
    'X-Requested-With': 'XMLHttpRequest',
  });
  await inspect(shopUrl, 'shop subdomain', {
    ...baseHeaders,
    Referer: 'https://shengdeproduct.en.alibaba.com/productlist.html',
  });
}

main().catch(console.error);
