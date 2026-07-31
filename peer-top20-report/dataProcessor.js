/** 数据处理 - 移植自 sameIndustryAnalysis.jsx */

export function parseToNumber(value) {
  if (value === null || value === undefined || value === '') {
    return Number.NaN;
  }
  const text = String(value).replace(/[,+$ ]/g, '');
  const num = Number.parseFloat(text);
  return Number.isNaN(num) ? Number.NaN : num;
}

export function calculateAvg(values, fixNumber = 2) {
  const valid = values.filter((v) => !Number.isNaN(v));
  if (!valid.length) {
    return 'N/A';
  }
  const total = valid.reduce((sum, item) => sum + item, 0);
  if (fixNumber === -1) {
    return Math.trunc(total / valid.length);
  }
  return Number((total / valid.length).toFixed(fixNumber));
}

export function unescapeHtml(text) {
  if (!text) {
    return '';
  }
  return String(text)
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function resolvePlatformCategory(record) {
  const direct = String(record.platformCategory || '').trim();
  if (direct && direct !== '-') {
    return unescapeHtml(direct);
  }

  const path = record.categoryPath;
  if (Array.isArray(path) && path.length) {
    const fromPath = path
      .map((item) => String(item?.categoryName || '').trim())
      .filter(Boolean)
      .join(' > ');
    if (fromPath) {
      return unescapeHtml(fromPath);
    }
  }

  const categoryName = String(record.categoryName || '').trim();
  if (categoryName) {
    return unescapeHtml(categoryName);
  }

  return '-';
}

function buildListedProductRow(product) {
  const pageViews = parseToNumber(product.pageViews);
  const inquiries = parseToNumber(product.iquiries);
  let inquiryRate = 'N/A';
  if (!Number.isNaN(pageViews) && pageViews > 0 && !Number.isNaN(inquiries)) {
    inquiryRate = `${((inquiries / pageViews) * 100).toFixed(2)}%`;
  }
  return {
    productId: String(product.productId || ''),
    mainProducts: unescapeHtml(product.mainProducts || ''),
    platformCategory: unescapeHtml(product.platformCategory || '-'),
    pageViews: String(product.pageViews || ''),
    inquiries: String(product.iquiries || ''),
    inquiryRate,
    productDetailUrl: String(product.productDetailUrl || ''),
  };
}

export function buildPeerRow(record, rank) {
  const pageViews = parseToNumber(record.pageViews);
  const inquiries = parseToNumber(record.iquiries);
  let inquiryRate = 'N/A';
  if (!Number.isNaN(pageViews) && pageViews > 0 && !Number.isNaN(inquiries)) {
    inquiryRate = `${((inquiries / pageViews) * 100).toFixed(2)}%`;
  }

  return {
    rank,
    companyName: String(record.companyName || ''),
    home: String(record.home || ''),
    mainProducts: unescapeHtml(record.mainProducts || ''),
    platformCategory: resolvePlatformCategory(record),
    pageViews: String(record.pageViews || ''),
    inquiries: String(record.iquiries || ''),
    inquiryRate,
    transactionNumber: String(record.transactionNumber || ''),
    transactionPrice: String(record.transactionPrice || ''),
    displayStarLevel: String(record.displayStarLevel || ''),
    supplierYear: String(record.supplierYear || ''),
    listedProductCount: Number(record.listedProductCount) || 1,
    listedProducts: Array.isArray(record.listedProducts)
      ? record.listedProducts.map(buildListedProductRow)
      : [],
  };
}

export function buildSummary(records) {
  const pageViews = calculateAvg(records.map((r) => parseToNumber(r.pageViews)), 0);
  const inquiries = calculateAvg(records.map((r) => parseToNumber(r.iquiries)), 0);
  const transactionNumber = calculateAvg(
    records.map((r) => parseToNumber(r.transactionNumber)),
    -1,
  );
  const transactionPrice = calculateAvg(
    records.map((r) => parseToNumber(r.transactionPrice)),
    0,
  );
  const displayStarLevel = calculateAvg(
    records.map((r) => parseToNumber(r.displayStarLevel)),
    -1,
  );
  const supplierYear = calculateAvg(records.map((r) => parseToNumber(r.supplierYear)), -1);

  const pageViewsNum = parseToNumber(pageViews);
  const inquiriesNum = parseToNumber(inquiries);
  let inquiryRate = 'N/A';
  if (!Number.isNaN(pageViewsNum) && pageViewsNum > 0 && !Number.isNaN(inquiriesNum)) {
    inquiryRate = `${((inquiriesNum / pageViewsNum) * 100).toFixed(2)}%`;
  }

  return {
    pageViews,
    inquiries,
    inquiryRate,
    transactionNumber,
    transactionPrice: transactionPrice === 'N/A' ? 'N/A' : `$${transactionPrice}`,
    displayStarLevel,
    supplierYear,
  };
}

export function buildCategoryGroup(category, records, { inquiryThreshold = 0 } = {}) {
  const filtered =
    inquiryThreshold > 0
      ? records.filter((record) => {
          const inquiries = parseToNumber(record.iquiries);
          return !Number.isNaN(inquiries) && inquiries > inquiryThreshold;
        })
      : records;
  const sorted = [...filtered].sort((a, b) => {
    const left = parseToNumber(a.iquiries);
    const right = parseToNumber(b.iquiries);
    if (Number.isNaN(left) && Number.isNaN(right)) return 0;
    if (Number.isNaN(left)) return 1;
    if (Number.isNaN(right)) return -1;
    return right - left;
  });
  const top20 = sorted.slice(0, 20);
  return {
    category,
    rows: sorted.map((record, index) => buildPeerRow(record, index + 1)),
    summary: buildSummary(top20),
    totalCount: sorted.length,
  };
}

function resolveInquiryThreshold(data, item) {
  const fromItem =
    item?.scrapingStats?.inquiryThreshold ??
    item?.timings?.inquiryThreshold ??
    item?.inquiryThreshold;
  const fromRoot =
    data?.inquiryThreshold ?? data?.timings?.inquiryThreshold ?? data?.scrapingStats?.inquiryThreshold;
  const value = fromItem ?? fromRoot ?? 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function processSameIndustryData(data) {
  const source = data.sameIndustryAnalyseList || data;
  if (!Array.isArray(source)) {
    throw new Error('输入数据缺少 sameIndustryAnalyseList 字段或格式不正确');
  }

  return source.map((item) => {
    const keyword = String(item.keyword || '');
    const inquiryThreshold = resolveInquiryThreshold(data, item);
    const grouped = item.effectDataCategoryGrouped || [];
    let categories = [];
    let defaultCategory = '未分类';

    if (grouped.length) {
      categories = grouped
        .map((group) =>
          buildCategoryGroup(String(group.category || '未分类'), group.value || [], {
            inquiryThreshold,
          }),
        )
        .filter((category) => category.rows.length > 0);
      defaultCategory = categories[0]?.category || '未分类';
    } else {
      const effectData = item.effectData || [];
      defaultCategory = String(effectData[0]?.category || '默认类目');
      categories = [
        buildCategoryGroup(defaultCategory, effectData, { inquiryThreshold }),
      ].filter((category) => category.rows.length > 0);
    }

    return { keyword, categories, defaultCategory };
  });
}

export function countReportRows(reports) {
  return reports.reduce(
    (total, report) =>
      total + report.categories.reduce((sum, category) => sum + category.rows.length, 0),
    0,
  );
}

export function assertReportHasRows(reports) {
  if (!reports.length) {
    throw new Error('未找到可处理的同行数据');
  }
  if (countReportRows(reports) === 0) {
    throw new Error(
      '报告里没有同行店铺数据。请确认已登录阿里巴巴国际站、关键词有效且未被验证码拦截。',
    );
  }
}
