const AUTH_TOKEN_KEY = 'ai-copilot-token';
const DEFAULT_TOP20_SEARCH_PAGE_COUNT = 5;
const DEFAULT_SHOP_PRODUCTS_PER_CATEGORY = 2;
const SCRAPE_PARAM_HINT =
  '可填 1–20，数值越大抓取可能越准确但速度会明显降低，一般建议按默认值即可。';
const ALIBABA_LOGIN_URL = 'https://i.alibaba.com';
const EXTENSION_ID_KEYS = ['peer-top20-extension-id', 'ai-plugin-id'];
const EXTENSION_INFO_SYNC_MS = 15000;

const state = {
  user: null,
  token: localStorage.getItem(AUTH_TOKEN_KEY) || '',
  view: 'report',
  pluginVersion: '',
  pluginOk: false,
  extensionId: '',
  latestExtensionInfo: null,
  extensionInfoSyncTimer: null,
  preview: {
    type: '',
    title: '',
    html: '',
    reports: null,
    rawData: null,
    shopPayload: null,
  },
  cacheItems: [],
  cacheCollapsedGroups: new Set(),
  pendingCaptchaRetry: null,
  users: [],
  top20SelectedCategory: '',
};

const loginView = document.getElementById('loginView');
const appView = document.getElementById('appView');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const sidebarUser = document.getElementById('sidebarUser');
const viewTitle = document.getElementById('viewTitle');
const pluginStatusBtn = document.getElementById('pluginStatusBtn');
const pluginStatusText = document.getElementById('pluginStatusText');
const pluginDot = document.getElementById('pluginDot');
const pluginGuideModal = document.getElementById('pluginGuideModal');
const captchaGuideModal = document.getElementById('captchaGuideModal');
const captchaGuideDesc = document.getElementById('captchaGuideDesc');
const captchaOpenBtn = document.getElementById('captchaOpenBtn');
const captchaContinueBtn = document.getElementById('captchaContinueBtn');
const loginGuideModal = document.getElementById('loginGuideModal');
const loginGuideDesc = document.getElementById('loginGuideDesc');
const loginGuideOpenBtn = document.getElementById('loginGuideOpenBtn');
const pluginGuideTitle = document.getElementById('pluginGuideTitle');
const pluginGuideDesc = document.getElementById('pluginGuideDesc');
const pluginUpdateNotice = document.getElementById('pluginUpdateNotice');
const pluginUpdateNoticeTitle = document.getElementById('pluginUpdateNoticeTitle');
const pluginUpdateNoticeText = document.getElementById('pluginUpdateNoticeText');
const pluginInstallSteps = document.getElementById('pluginInstallSteps');
const pluginUpdateSteps = document.getElementById('pluginUpdateSteps');
const recheckExtensionBtn = document.getElementById('recheckExtensionBtn');
const downloadExtensionBtn = document.getElementById('downloadExtensionBtn');
const extensionVersionBadge = document.getElementById('extensionVersionBadge');

const top20Keywords = document.getElementById('top20Keywords');
const top20SearchPageCount = document.getElementById('top20SearchPageCount');
const top20SearchPageCountHint = document.getElementById('top20SearchPageCountHint');
const generateTop20Btn = document.getElementById('generateTop20Btn');
const top20Status = document.getElementById('top20Status');
const shopUrlInput = document.getElementById('shopUrlInput');
const shopProductsPerCategory = document.getElementById('shopProductsPerCategory');
const shopProductsPerCategoryHint = document.getElementById('shopProductsPerCategoryHint');
const generateShopBtn = document.getElementById('generateShopBtn');
const shopStatus = document.getElementById('shopStatus');
const previewTitle = document.getElementById('previewTitle');
const previewMeta = document.getElementById('previewMeta');
const previewEmpty = document.getElementById('previewEmpty');
const previewGenerating = document.getElementById('previewGenerating');
const previewGeneratingTitle = document.getElementById('previewGeneratingTitle');
const previewGeneratingMessage = document.getElementById('previewGeneratingMessage');
const previewGeneratingElapsed = document.getElementById('previewGeneratingElapsed');
const previewContent = document.getElementById('previewContent');
const previewActions = document.getElementById('previewActions');
const downloadHtmlBtn = document.getElementById('downloadHtmlBtn');
const downloadExcelBtn = document.getElementById('downloadExcelBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const top20CategoryFilterWrap = document.getElementById('top20CategoryFilterWrap');
const top20CategoryFilter = document.getElementById('top20CategoryFilter');

const PDF_FOOTER_TEXT = '本报告数据由ai操盘手提供，如对报告数据有疑问可加微信 maoniuchaoren。';
let generatingTimer = null;
let generatingStartedAt = 0;

const cacheTableBody = document.getElementById('cacheTableBody');
const refreshCacheBtn = document.getElementById('refreshCacheBtn');
const cacheFilterObject = document.getElementById('cacheFilterObject');
const cacheFilterType = document.getElementById('cacheFilterType');
const cacheFilterCreator = document.getElementById('cacheFilterCreator');
const cacheFilterResetBtn = document.getElementById('cacheFilterResetBtn');
const accountsTableBody = document.getElementById('accountsTableBody');
const refreshAccountsBtn = document.getElementById('refreshAccountsBtn');
const createAccountBtn = document.getElementById('createAccountBtn');
const accountForm = document.getElementById('accountForm');
const accountFormCard = document.getElementById('accountFormCard');
const accountFormTitle = document.getElementById('accountFormTitle');
const accountFormDesc = document.getElementById('accountFormDesc');
const accountsListDesc = document.getElementById('accountsListDesc');
const accountEditId = document.getElementById('accountEditId');
const accountUsername = document.getElementById('accountUsername');
const accountPassword = document.getElementById('accountPassword');
const accountRole = document.getElementById('accountRole');
const accountParentId = document.getElementById('accountParentId');
const accountFormError = document.getElementById('accountFormError');
const resetAccountFormBtn = document.getElementById('resetAccountFormBtn');

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseKeywords(text) {
  return String(text || '')
    .split(/[\n,，;；]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function setLine(el, message, type = '') {
  el.textContent = message || '';
  el.className = `status-line ${type}`.trim();
  el.onclick = null;
}

function isAlibabaLoginError(message = '') {
  const text = String(message || '');
  return /未检测到阿里巴巴登录|未登录.*阿里巴巴|请先登录.*alibaba|请确认已登录/i.test(text);
}

function showLoginGuideModal(message = '') {
  if (loginGuideDesc) {
    loginGuideDesc.textContent =
      message ||
      '生成报告需要先登录阿里巴巴国际站，否则插件无法抓取同行数据。';
  }
  loginGuideModal?.classList.remove('hidden');
}

function hideLoginGuideModal() {
  loginGuideModal?.classList.add('hidden');
}

function setLoginRequiredStatus(el, message = '') {
  const text =
    message ||
    '未检测到阿里巴巴登录状态，请先登录后再生成报告。';
  el.innerHTML = `${escapeHtml(text)} <button type="button" class="status-action" data-open-login="true">打开阿里巴巴登录页</button>`;
  el.className = 'status-line login-required';
  el.onclick = (event) => {
    if (event.target?.dataset?.openLogin) {
      event.preventDefault();
      openVerificationPage(ALIBABA_LOGIN_URL);
    }
  };
}

function bindLoginGuideModal() {
  loginGuideOpenBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    openVerificationPage(ALIBABA_LOGIN_URL);
  });
  document.querySelectorAll('[data-close-login-modal="true"]').forEach((node) => {
    node.addEventListener('click', () => hideLoginGuideModal());
  });
}

function handleReportGenerationError(el, error) {
  const message = error?.message || '生成失败';
  if (isCaptchaPendingError(error)) {
    setLine(el, '请先完成验证，完成后点击弹窗中的「继续生成」', 'warning');
    return;
  }
  if (isAlibabaLoginError(message)) {
    setLoginRequiredStatus(el, message);
    showLoginGuideModal(message);
    return;
  }
  setLine(el, message, 'error');
}

function showReportGenerating(message, title = '正在生成报告') {
  previewEmpty.classList.add('hidden');
  previewContent.classList.add('hidden');
  previewActions.classList.add('hidden');
  previewGenerating.classList.remove('hidden');
  previewGeneratingTitle.textContent = title;
  previewGeneratingMessage.textContent = message;
  generatingStartedAt = Date.now();
  previewGeneratingElapsed.textContent = '已等待 0s';
  if (generatingTimer) {
    clearInterval(generatingTimer);
  }
  generatingTimer = setInterval(() => {
    const secs = Math.floor((Date.now() - generatingStartedAt) / 1000);
    previewGeneratingElapsed.textContent = `已等待 ${secs}s`;
  }, 1000);
}

function updateReportGenerating(message, title) {
  if (message) {
    previewGeneratingMessage.textContent = message;
  }
  if (title) {
    previewGeneratingTitle.textContent = title;
  }
}

function hideReportGenerating(restore = true) {
  previewGenerating.classList.add('hidden');
  if (generatingTimer) {
    clearInterval(generatingTimer);
    generatingTimer = null;
  }
  if (!restore) {
    return;
  }
  if (state.preview.type) {
    previewEmpty.classList.add('hidden');
    previewContent.classList.remove('hidden');
    previewActions.classList.remove('hidden');
  } else {
    previewEmpty.classList.remove('hidden');
    previewContent.classList.add('hidden');
    previewActions.classList.add('hidden');
  }
}

function setGeneratingBusy(busy) {
  generateTop20Btn.disabled = busy;
  generateShopBtn.disabled = busy;
  generateTop20Btn.classList.toggle('is-loading', busy);
  generateShopBtn.classList.toggle('is-loading', busy);
}

function sanitizeFilenamePart(value, maxLen = 60) {
  return String(value || 'report')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim()
    .slice(0, maxLen) || 'report';
}

function formatPdfDateStamp(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function buildPdfFilename() {
  const dateStamp = formatPdfDateStamp();
  if (state.preview.type === 'top20') {
    const keywords = parseKeywords(top20Keywords.value);
    const keyword = sanitizeFilenamePart(keywords[0] || 'report', 40);
  return `${keyword}-top同行榜-${dateStamp}.pdf`;
  }
  if (state.preview.type === 'shop-inquiry') {
    const base = sanitizeFilenamePart(state.preview.title || '指定同行询盘分布');
    return `${base}.pdf`;
  }
  const base = sanitizeFilenamePart(state.preview.title || 'report');
  return `${base}-${dateStamp}.pdf`;
}

function getTop20SearchPageCount() {
  const parsed = Number.parseInt(top20SearchPageCount?.value, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_TOP20_SEARCH_PAGE_COUNT;
  }
  return Math.min(20, Math.max(1, parsed));
}

function setTop20SearchPageCount(value) {
  const normalized = Math.min(
    20,
    Math.max(1, Number.parseInt(value, 10) || DEFAULT_TOP20_SEARCH_PAGE_COUNT),
  );
  if (top20SearchPageCount) {
    top20SearchPageCount.value = String(normalized);
  }
  if (top20SearchPageCountHint) {
    top20SearchPageCountHint.textContent = SCRAPE_PARAM_HINT;
  }
  return normalized;
}

function resetReportInputDefaults() {
  setTop20SearchPageCount(DEFAULT_TOP20_SEARCH_PAGE_COUNT);
  setShopProductsPerCategory(DEFAULT_SHOP_PRODUCTS_PER_CATEGORY);
}

function bindTop20SearchPageCount() {
  if (!top20SearchPageCount) {
    return;
  }
  setTop20SearchPageCount(DEFAULT_TOP20_SEARCH_PAGE_COUNT);
  top20SearchPageCount.addEventListener('change', () => {
    setTop20SearchPageCount(top20SearchPageCount.value);
  });
}

function getTop20GeneratingMessage(searchPageCount = getTop20SearchPageCount()) {
  return `插件正在抓取阿里巴巴数据（每关键词 ${searchPageCount} 页），通常需要 10–30 秒，请勿关闭页面`;
}

function getShopProductsPerCategory() {
  const parsed = Number.parseInt(shopProductsPerCategory?.value, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_SHOP_PRODUCTS_PER_CATEGORY;
  }
  return Math.min(20, Math.max(1, parsed));
}

function setShopProductsPerCategory(value) {
  const normalized = Math.min(20, Math.max(1, Number.parseInt(value, 10) || DEFAULT_SHOP_PRODUCTS_PER_CATEGORY));
  if (shopProductsPerCategory) {
    shopProductsPerCategory.value = String(normalized);
  }
  if (shopProductsPerCategoryHint) {
    shopProductsPerCategoryHint.textContent = SCRAPE_PARAM_HINT;
  }
  return normalized;
}

function bindShopProductsPerCategory() {
  if (!shopProductsPerCategory) {
    return;
  }
  setShopProductsPerCategory(DEFAULT_SHOP_PRODUCTS_PER_CATEGORY);
  shopProductsPerCategory.addEventListener('change', () => {
    setShopProductsPerCategory(shopProductsPerCategory.value);
  });
}

function getShopGeneratingMessage(productsPerCategory = getShopProductsPerCategory()) {
  return `正在抓取 Profile 分类、特色产品与销量页（每分组 ${productsPerCategory} 个产品 ID），大店通常需 30–50 秒，请勿关闭页面`;
}

function resolvePrimaryVerificationUrl(response = {}) {
  const links = resolveVerificationLinks(response);
  return links[0]?.url || 'https://i.alibaba.com';
}

function resolveVerificationLinks(response = {}) {
  const links = [];
  const seen = new Set();
  const add = (url, label) => {
    const normalized = String(url || '').trim();
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    links.push({ url: normalized, label: label || '验证页面' });
  };

  if (Array.isArray(response.verificationUrls)) {
    response.verificationUrls.forEach((item) => {
      if (typeof item === 'string') {
        add(item, '验证页面');
        return;
      }
      add(item?.url, item?.label || '验证页面');
    });
  }

  add(response.verificationUrl, '优先打开的验证页');
  add(response.data?.verificationCodeUrlPage, '触发验证的搜索页');
  add(response.verifyUrl, '验证页面');
  add(response.captchaUrl, '验证页面');

  if (!links.length) {
    add('https://i.alibaba.com', '阿里巴巴后台登录页');
  }

  return links;
}

function showCaptchaGuideModal(response = {}) {
  const message =
    response.message ||
    response.data?.message ||
    '阿里巴巴检测到异常访问，请先完成验证码后再重新生成报告。';

  if (captchaGuideDesc) {
    captchaGuideDesc.textContent = message;
  }

  if (captchaOpenBtn) {
    captchaOpenBtn.dataset.url = resolvePrimaryVerificationUrl(response);
  }

  captchaGuideModal?.classList.remove('hidden');
}

function hideCaptchaGuideModal() {
  captchaGuideModal?.classList.add('hidden');
}

function isCaptchaResponse(response = {}) {
  return Boolean(
    response.captcha ||
      response.isExistVerificationCode ||
      response.data?.isExistVerificationCode,
  );
}

function rejectCaptchaResponse(response = {}) {
  showCaptchaGuideModal(response);
  const error = new Error('阿里巴巴触发了验证码，请按弹窗指引完成验证后再试');
  error.isCaptchaPending = true;
  throw error;
}

function isCaptchaPendingError(error) {
  return Boolean(error?.isCaptchaPending);
}

async function continueAfterCaptchaVerification() {
  hideCaptchaGuideModal();
  const retry = state.pendingCaptchaRetry;
  if (typeof retry !== 'function') {
    return;
  }
  await retry();
}

async function openVerificationPage(url) {
  const targetUrl = String(url || '').trim();
  if (!targetUrl) {
    return;
  }

  try {
    if (getExtensionId() && window.chrome?.runtime?.sendMessage) {
      await sendExtensionMessage({ type: 'openVerificationPage', url: targetUrl }, 10000, true);
      return;
    }
  } catch {
    /* fallback below */
  }

  window.open(targetUrl, '_blank', 'noopener,noreferrer');
}

function bindCaptchaGuideModal() {
  captchaOpenBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    openVerificationPage(captchaOpenBtn.dataset.url);
  });

  captchaContinueBtn?.addEventListener('click', (event) => {
    event.preventDefault();
    continueAfterCaptchaVerification();
  });

  document.querySelectorAll('[data-close-captcha-modal="true"]').forEach((node) => {
    node.addEventListener('click', () => hideCaptchaGuideModal());
  });
}

function resolveShopUrl(input) {
  if (window.ShopUrlUtil) {
    return window.ShopUrlUtil.normalize(input);
  }
  const value = String(input || '').trim();
  if (!value) {
    return { valid: false, message: '请填写阿里巴巴店铺网址' };
  }
  return { valid: true, shopUrl: value.replace(/\/$/, ''), wasCorrected: false, correctionHint: '' };
}

async function runShopInquiryReport(inputUrl, { updateInput = false } = {}) {
  const normalized = resolveShopUrl(inputUrl);
  if (!normalized.valid) {
    setLine(shopStatus, normalized.message, 'error');
    return;
  }

  if (updateInput) {
    shopUrlInput.value = normalized.shopUrl;
  }

  const ready = await ensureExtensionUpToDate(shopStatus);
  if (!ready) {
    return;
  }

  state.pendingCaptchaRetry = () => runShopInquiryReport(inputUrl, { updateInput });

  generateShopBtn.disabled = true;
  setGeneratingBusy(true);
  if (normalized.wasCorrected) {
    showReportGenerating(`${normalized.correctionHint}；${getShopGeneratingMessage()}`);
    setLine(shopStatus, `${normalized.correctionHint}；正在查询（每分组 ${getShopProductsPerCategory()} 个产品 ID）...`);
  } else {
    showReportGenerating(getShopGeneratingMessage());
    setLine(shopStatus, `插件正在查询店铺类目询盘（每分组 ${getShopProductsPerCategory()} 个产品 ID）...`);
  }

  const productsPerCategory = getShopProductsPerCategory();
  const startedAt = Date.now();
  const pluginStartedAt = Date.now();
  try {
    const data = await fetchShopInquiryData(normalized.shopUrl, { productsPerCategory });
    const pluginMs = Date.now() - pluginStartedAt;
    if (!data.categories?.length) {
      throw new Error(data.debug?.note || '未查询到类目询盘数据');
    }
    updateReportGenerating('正在汇总并渲染报告...');
    setLine(shopStatus, '正在生成报告...');
    const serverStartedAt = Date.now();
    const result = await apiFetch('/api/reports/shop-inquiry', {
      method: 'POST',
      body: JSON.stringify({
        shopUrl: normalized.originalInput || normalized.shopUrl,
        categories: data.categories,
        stats: data.stats || data.debug?.stats || null,
        timings: data.timings || data.debug?.timings || null,
        isComplete: data.isComplete ?? data.stats?.isComplete ?? true,
        pluginVersion: state.pluginVersion,
        productsPerCategory,
        durationMs: Date.now() - startedAt,
        pluginMs,
      }),
    });
    const serverMs = Date.now() - serverStartedAt;
    const timings = {
      ...(result.timings || data.timings || data.debug?.timings || {}),
      samplingGroupCount:
        data.stats?.samplingGroupCount ?? result.timings?.samplingGroupCount,
      sampledProductIdTotal:
        data.stats?.sampledProductIdTotal ?? result.timings?.sampledProductIdTotal,
      uniqueProducts:
        data.stats?.uniqueProducts ??
        result.timings?.uniqueProducts ??
        data.timings?.uniqueProducts,
      pluginMs,
      serverMs,
      totalMs: Date.now() - startedAt,
    };
    const statusMessage = buildShopInquiryStatusMessage(result.message, {
      timings,
      stats: data.stats,
      productsPerCategory,
      categoryCount: result.categories?.length,
    });
    const statusType = result.status === 'incomplete' ? 'warning' : 'success';
    showPreview({
      type: 'shop-inquiry',
      title: result.title,
      message: statusMessage,
      html: result.html,
      shopPayload: {
        shopUrl: result.shopUrl,
        categories: result.categories,
        incompleteNote: result.status === 'incomplete' ? result.message?.split('；')[0] || '' : '',
      },
    });
    setLine(
      shopStatus,
      statusMessage || (result.status === 'incomplete' ? '报告不完整' : '报告生成成功'),
      statusType,
    );
    state.pendingCaptchaRetry = null;
  } catch (error) {
    if (!isCaptchaPendingError(error)) {
      state.pendingCaptchaRetry = null;
    }
    handleReportGenerationError(shopStatus, error);
  } finally {
    hideReportGenerating();
    setGeneratingBusy(false);
    resetReportInputDefaults();
  }
}

function renderShopInquiryActionCell(home) {
  const normalized = resolveShopUrl(home || '');
  if (!normalized.valid) {
    return '<span class="muted-text">-</span>';
  }
  return `<button type="button" class="btn ghost shop-inquiry-btn" data-shop-url="${escapeHtml(normalized.shopUrl)}">查全店询盘</button>`;
}

function getTop20CategoryOptions(reports = []) {
  const categories = [];
  const seen = new Set();
  for (const report of reports || []) {
    for (const category of report.categories || []) {
      if (!category?.category || seen.has(category.category)) {
        continue;
      }
      seen.add(category.category);
      categories.push(category.category);
    }
  }
  return categories;
}

function resolveTop20Category(report, selectedCategory = '') {
  if (!report?.categories?.length) {
    return null;
  }
  if (selectedCategory) {
    return (
      report.categories.find((item) => item.category === selectedCategory) ||
      null
    );
  }
  return report.categories[0];
}

function populateTop20CategoryFilter(reports = []) {
  const categories = getTop20CategoryOptions(reports);
  if (!top20CategoryFilter || !top20CategoryFilterWrap) {
    return;
  }
  if (!categories.length) {
    top20CategoryFilterWrap.classList.add('hidden');
    top20CategoryFilter.innerHTML = '';
    state.top20SelectedCategory = '';
    return;
  }
  top20CategoryFilterWrap.classList.remove('hidden');
  top20CategoryFilter.innerHTML = categories
    .map(
      (category) =>
        `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`,
    )
    .join('');
  if (
    state.top20SelectedCategory &&
    categories.includes(state.top20SelectedCategory)
  ) {
    top20CategoryFilter.value = state.top20SelectedCategory;
  } else {
    state.top20SelectedCategory = categories[0];
    top20CategoryFilter.value = categories[0];
  }
}

function refreshTop20Preview() {
  if (state.preview.type !== 'top20' || !state.preview.reports?.length) {
    return;
  }
  previewContent.innerHTML = renderTop20Preview(
    state.preview.reports,
    state.top20SelectedCategory,
  );
}

function renderTop20Preview(reports, selectedCategory = state.top20SelectedCategory) {
  return reports
    .map((report) => {
      const category = resolveTop20Category(report, selectedCategory);
      if (!category) return '';
      const totalHint =
        category.totalCount > 20
          ? `<p class="report-note">该类目共 ${category.totalCount} 个同行，导出 PDF 时仅保留前 20 名。</p>`
          : '';
      const rows = category.rows
        .map(
          (row) => `
          <tr>
            <td>第${row.rank}名</td>
            <td>${row.home ? `<a href="${escapeHtml(row.home)}" target="_blank" rel="noreferrer">${escapeHtml(row.companyName)}</a>` : escapeHtml(row.companyName)}</td>
            <td>${escapeHtml(row.mainProducts)}</td>
            <td>${escapeHtml(row.platformCategory || row.categoryName || '-')}</td>
            <td>${escapeHtml(row.pageViews)}</td>
            <td>${escapeHtml(row.inquiries)}</td>
            <td>${escapeHtml(row.inquiryRate)}</td>
            <td>${escapeHtml(row.transactionNumber)}</td>
            <td>${escapeHtml(row.transactionPrice)}</td>
            <td>${escapeHtml(row.displayStarLevel)}</td>
            <td>${escapeHtml(row.supplierYear)}</td>
            <td>${renderShopInquiryActionCell(row.home)}</td>
          </tr>`,
        )
        .join('');
      const summary = category.summary;
      return `
        <section class="report-section">
          <h4>${escapeHtml(category.category)} · ${escapeHtml(report.keyword)}</h4>
          <p class="report-note">访客、询盘为近 6 个月类目数据；订单量为全店近 6 个月数据。</p>
          ${totalHint}
          <table class="report-table">
            <thead>
              <tr>
                <th>排名</th><th>公司</th><th>主营</th><th>类目</th><th>访问</th><th>询盘</th><th>询盘率</th>
                <th>订单量</th><th>订单额</th><th>星等级</th><th>年限</th><th>查全店询盘</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              <tr class="summary-row">
                <td colspan="4">同行平均</td>
                <td>${escapeHtml(summary.pageViews)}</td>
                <td>${escapeHtml(summary.inquiries)}</td>
                <td>${escapeHtml(summary.inquiryRate)}</td>
                <td>${escapeHtml(summary.transactionNumber)}</td>
                <td>${escapeHtml(summary.transactionPrice)}</td>
                <td>${escapeHtml(summary.displayStarLevel)}</td>
                <td>${escapeHtml(summary.supplierYear)}</td>
                <td>-</td>
              </tr>
            </tbody>
          </table>
        </section>`;
    })
    .join('');
}

function buildTop20PdfHtml(reports, reportTitle, selectedCategory = state.top20SelectedCategory) {
  const sections = reports
    .map((report) => {
      const category = resolveTop20Category(report, selectedCategory);
      if (!category) return '';
      const exportRows = category.rows.slice(0, 20);
      const rows = exportRows
        .map(
          (row) => `
          <tr>
            <td>第${row.rank}名</td>
            <td>${escapeHtml(row.companyName)}</td>
            <td>${escapeHtml(row.mainProducts)}</td>
            <td>${escapeHtml(row.platformCategory || row.categoryName || '-')}</td>
            <td>${escapeHtml(row.pageViews)}</td>
            <td>${escapeHtml(row.inquiries)}</td>
            <td>${escapeHtml(row.inquiryRate)}</td>
            <td>${escapeHtml(row.transactionNumber)}</td>
            <td>${escapeHtml(row.transactionPrice)}</td>
            <td>${escapeHtml(row.displayStarLevel)}</td>
            <td>${escapeHtml(row.supplierYear)}</td>
          </tr>`,
        )
        .join('');
      const summary = category.summary;
      return `
        <section class="report-section">
          <h4>${escapeHtml(category.category)} · ${escapeHtml(report.keyword)}</h4>
          <p class="report-note">访客、询盘为近 6 个月类目数据；订单量为全店近 6 个月数据。PDF 仅导出当前类目前 20 名同行。</p>
          <table>
            <thead>
              <tr>
                <th>排名</th><th>公司</th><th>主营</th><th>类目</th><th>访问</th><th>询盘</th><th>询盘率</th>
                <th>订单量</th><th>订单额</th><th>星等级</th><th>年限</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              <tr class="summary-row">
                <td colspan="4">同行平均</td>
                <td>${escapeHtml(summary.pageViews)}</td>
                <td>${escapeHtml(summary.inquiries)}</td>
                <td>${escapeHtml(summary.inquiryRate)}</td>
                <td>${escapeHtml(summary.transactionNumber)}</td>
                <td>${escapeHtml(summary.transactionPrice)}</td>
                <td>${escapeHtml(summary.displayStarLevel)}</td>
                <td>${escapeHtml(summary.supplierYear)}</td>
              </tr>
            </tbody>
          </table>
        </section>`;
    })
    .join('');
  return `
    <h2>${escapeHtml(reportTitle)}</h2>
    ${sections}
    <p class="pdf-export-footer">${escapeHtml(PDF_FOOTER_TEXT)}</p>`;
}

function buildPdfExportHtml() {
  const { type, title, reports, html, shopPayload } = state.preview;
  const footer = `<p class="pdf-export-footer">${escapeHtml(PDF_FOOTER_TEXT)}</p>`;
  if (type === 'top20' && reports?.length) {
    return `<div class="pdf-export-root">${buildTop20PdfHtml(reports, title, state.top20SelectedCategory)}</div>`;
  }
  if (type === 'shop-inquiry' && shopPayload) {
    return `<div class="pdf-export-root"><h2>${escapeHtml(title)}</h2>${renderShopPreview(
      shopPayload.categories,
      shopPayload.shopUrl,
      shopPayload.incompleteNote || '',
    )}${footer}</div>`;
  }
  if (html) {
    return `<div class="pdf-export-root"><h2>${escapeHtml(title)}</h2>${html}${footer}</div>`;
  }
  return '';
}

function authHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${state.token}`,
    ...extra,
  };
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || `请求失败 (${response.status})`);
  }
  return data;
}

function showLogin() {
  loginView.classList.remove('hidden');
  appView.classList.add('hidden');
}

function showApp() {
  loginView.classList.add('hidden');
  appView.classList.remove('hidden');
  sidebarUser.innerHTML = `
    <div>${escapeHtml(state.user.username)}</div>
    <div>${escapeHtml(state.user.roleLabel || state.user.role)}</div>`;
}

async function bootstrapAuth() {
  if (!state.token) {
    showLogin();
    return;
  }
  try {
    const data = await apiFetch('/api/auth/me');
    state.user = data.user;
    showApp();
    initAppAfterLogin();
  } catch {
    state.token = '';
    localStorage.removeItem(AUTH_TOKEN_KEY);
    showLogin();
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.textContent = '';
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.getElementById('loginUsername').value.trim(),
        password: document.getElementById('loginPassword').value,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || '登录失败');
    }
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    showApp();
    initAppAfterLogin();
  } catch (error) {
    loginError.textContent = error.message || '登录失败';
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: authHeaders(),
    });
  } catch {
    /* ignore */
  }
  state.token = '';
  state.user = null;
  localStorage.removeItem(AUTH_TOKEN_KEY);
  showLogin();
});

function switchView(view) {
  state.view = view;
  document.querySelectorAll('.nav-item').forEach((node) => {
    node.classList.toggle('active', node.dataset.view === view);
  });
  document.querySelectorAll('.view').forEach((node) => node.classList.remove('active'));
  document.getElementById(`${view}View`).classList.add('active');
  const titles = { report: '报告', cache: '缓存', accounts: '账号' };
  viewTitle.textContent = titles[view] || '报告';
  if (view === 'cache') loadCacheList();
  if (view === 'accounts') loadAccounts();
}

document.querySelectorAll('.nav-item').forEach((node) => {
  node.addEventListener('click', () => switchView(node.dataset.view));
});

function getExtensionId() {
  return state.extensionId || localStorage.getItem(EXTENSION_ID_KEYS[0]) || '';
}

function saveExtensionId(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return false;
  localStorage.setItem(EXTENSION_ID_KEYS[0], trimmed);
  localStorage.setItem(EXTENSION_ID_KEYS[1], trimmed);
  state.extensionId = trimmed;
  return true;
}

async function waitForExtensionId(timeoutMs = 4000) {
  const existing = getExtensionId();
  if (existing) {
    return existing;
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    window.postMessage({ source: 'peer-top20-report', type: 'requestExtensionId' }, window.location.origin);
    await sleep(400);
    const id = getExtensionId();
    if (id) {
      return id;
    }
  }
  return '';
}

function setPluginStatus(status, text) {
  pluginStatusBtn.classList.remove('ok', 'warn', 'error');
  pluginStatusBtn.classList.add(status);
  pluginStatusText.textContent = text;
}

function sendExtensionMessage(message, timeoutMs = 150000, allowFailure = false) {
  return new Promise((resolve, reject) => {
    const extensionId = getExtensionId();
    if (!extensionId) {
      reject(new Error('未检测到插件，请先安装插件并刷新页面'));
      return;
    }
    if (!window.chrome?.runtime?.sendMessage) {
      reject(new Error('当前浏览器不支持 Chrome 插件通信'));
      return;
    }

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`插件超时（${Math.round(timeoutMs / 1000)} 秒）`));
    }, timeoutMs);

    window.chrome.runtime.sendMessage(extensionId, message, (response) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (window.chrome.runtime.lastError) {
        reject(new Error(window.chrome.runtime.lastError.message));
        return;
      }
      if (!response) {
        reject(new Error('插件无响应'));
        return;
      }
      if (!response.success && !allowFailure) {
        reject(new Error(response.message || '插件返回失败'));
        return;
      }
      resolve(response);
    });
  });
}

async function probeExtension(options = {}) {
  const { allowRediscover = true } = options;
  if (!window.chrome?.runtime?.sendMessage) {
    setPluginStatus('error', '浏览器不支持插件');
    state.pluginOk = false;
    return false;
  }

  let extensionId = getExtensionId();
  if (!extensionId) {
    setPluginStatus('warn', '正在检测插件...');
    extensionId = await waitForExtensionId(4000);
  }

  if (!extensionId) {
    setPluginStatus('warn', '未检测到插件');
    state.pluginOk = false;
    return false;
  }

  try {
    const response = await sendExtensionMessage({ type: 'getVersion' }, 10000);
    if (response.success && response.value) {
      state.pluginVersion = response.value;
      state.pluginOk = true;
      updatePluginStatusLabel();
      return true;
    }
    state.pluginOk = false;
    setPluginStatus('error', '插件连接失败');
    return false;
  } catch (error) {
    if (allowRediscover) {
      setPluginStatus('warn', '正在重新检测插件...');
      const previousId = extensionId;
      state.extensionId = '';
      localStorage.removeItem(EXTENSION_ID_KEYS[0]);
      localStorage.removeItem(EXTENSION_ID_KEYS[1]);
      const rediscovered = await waitForExtensionId(3000);
      if (rediscovered && rediscovered !== previousId) {
        return probeExtension({ allowRediscover: false });
      }
      if (rediscovered) {
        return probeExtension({ allowRediscover: false });
      }
    }
    state.pluginOk = false;
    setPluginStatus('error', '插件未连接');
    pluginStatusBtn.title = error.message;
    return false;
  }
}

function compareSemver(current, latest) {
  const parseParts = (value) =>
    String(value || '0')
      .trim()
      .split('.')
      .map((part) => Number.parseInt(part, 10) || 0);
  const left = parseParts(current);
  const right = parseParts(latest);
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const a = left[index] || 0;
    const b = right[index] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

function isPluginOutdated() {
  const latestVersion = state.latestExtensionInfo?.version;
  if (!latestVersion || !state.pluginVersion) {
    return false;
  }
  return compareSemver(state.pluginVersion, latestVersion) < 0;
}

function updatePluginStatusLabel() {
  if (!state.pluginOk) {
    return;
  }
  if (isPluginOutdated()) {
    setPluginStatus('warn', `插件 v${state.pluginVersion}（需更新 v${state.latestExtensionInfo.version}）`);
    return;
  }
  setPluginStatus('ok', `插件 v${state.pluginVersion}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchServerExtensionInfo() {
  try {
    const info = await fetch(`/api/extension/info?_=${Date.now()}`, { cache: 'no-store' }).then((res) =>
      res.json(),
    );
    state.latestExtensionInfo = info;
    syncExtensionDownloadUi(info);
    return info;
  } catch {
    return { available: false };
  }
}

function syncExtensionDownloadUi(info = state.latestExtensionInfo) {
  if (!info?.available) {
    downloadExtensionBtn.href = '#';
    downloadExtensionBtn.removeAttribute('download');
    downloadExtensionBtn.classList.add('disabled');
    return;
  }

  downloadExtensionBtn.href = info.downloadUrl;
  downloadExtensionBtn.download = info.fileName || 'ai-copilot-extension.zip';
  downloadExtensionBtn.classList.remove('disabled');
}

function refreshPluginGuideVersionText(info = state.latestExtensionInfo) {
  if (pluginGuideModal.classList.contains('hidden') || !info?.available) {
    return;
  }

  if (!pluginUpdateSteps.classList.contains('hidden') && state.pluginVersion) {
    pluginGuideDesc.textContent = `当前版本 v${state.pluginVersion}，系统最新版本 v${info.version}`;
  }
}

function applyExtensionInfoUpdate(info, { previousInfo } = {}) {
  syncExtensionDownloadUi(info);

  const versionChanged = info?.version !== previousInfo?.version;
  const buildChanged = info?.builtAt !== previousInfo?.builtAt;
  if (!versionChanged && !buildChanged) {
    return false;
  }

  if (info?.available) {
    if (state.pluginOk && state.pluginVersion) {
      extensionVersionBadge.textContent = `已安装 v${state.pluginVersion} / 最新 v${info.version}`;
    } else {
      extensionVersionBadge.textContent = `服务端包 v${info.version}`;
    }
  } else {
    extensionVersionBadge.textContent = '插件包未构建';
  }

  updatePluginStatusLabel();
  refreshPluginGuideVersionText(info);
  return true;
}

async function syncExtensionInfoFromServer() {
  const previousInfo = state.latestExtensionInfo;
  const info = await fetchServerExtensionInfo();
  applyExtensionInfoUpdate(info, { previousInfo });
  return info;
}

function startExtensionInfoSync() {
  if (state.extensionInfoSyncTimer) {
    return;
  }

  const sync = () => {
    syncExtensionInfoFromServer();
  };

  state.extensionInfoSyncTimer = setInterval(sync, EXTENSION_INFO_SYNC_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      sync();
    }
  });
  window.addEventListener('focus', sync);
}

function triggerExtensionDownload(info = state.latestExtensionInfo) {
  if (!info?.available || !info.downloadUrl) {
    return false;
  }
  const link = document.createElement('a');
  link.href = info.downloadUrl;
  link.download = info.fileName || 'ai-copilot-extension.zip';
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}

function showPluginInstallModal() {
  pluginGuideTitle.textContent = 'Chrome 插件安装说明';
  pluginGuideDesc.classList.add('hidden');
  pluginUpdateNotice.classList.add('hidden');
  pluginInstallSteps.classList.remove('hidden');
  pluginUpdateSteps.classList.add('hidden');
  recheckExtensionBtn.classList.add('hidden');
  pluginGuideModal.classList.remove('hidden');
  loadExtensionInfo();
}

function showPluginUpdateModal({ currentVersion, latestVersion, autoDownloaded }) {
  pluginGuideTitle.textContent = '插件需要更新';
  pluginGuideDesc.textContent = `当前版本 v${currentVersion}，系统最新版本 v${latestVersion}`;
  pluginGuideDesc.classList.remove('hidden');
  pluginUpdateNotice.classList.remove('hidden');
  pluginUpdateNoticeTitle.textContent = '请先更新插件后再生成报告';
  pluginUpdateNoticeText.textContent = autoDownloaded
    ? '已尝试通过 Chrome 自动更新；若未成功，系统已自动下载最新插件包，请按下方步骤手动安装。'
    : '系统无法自动更新插件，请点击下载最新插件包并按下方步骤手动安装。';
  pluginInstallSteps.classList.add('hidden');
  pluginUpdateSteps.classList.remove('hidden');
  recheckExtensionBtn.classList.remove('hidden');
  pluginGuideModal.classList.remove('hidden');
  loadExtensionInfo();
}

async function attemptAutoExtensionUpdate() {
  try {
    const result = await sendExtensionMessage(
      { type: 'attemptExtensionUpdate', latestVersion: state.latestExtensionInfo?.version || '' },
      15000,
      true,
    );
    if (result.pendingReload) {
      await sleep(3500);
      await probeExtension();
      if (!isPluginOutdated()) {
        return { success: true, method: 'chrome_auto_update' };
      }
    }
    if (result.updated) {
      await probeExtension();
      if (!isPluginOutdated()) {
        return { success: true, method: 'chrome_auto_update' };
      }
    }
    return { success: false, message: result.message || 'Chrome 未能自动安装更新' };
  } catch (error) {
    return { success: false, message: error.message || '自动更新失败' };
  }
}

async function ensureExtensionUpToDate(statusEl) {
  await fetchServerExtensionInfo();
  const connected = await probeExtension();
  if (!connected) {
    setLine(statusEl, '插件未就绪，请先安装插件并刷新页面', 'error');
    showPluginInstallModal();
    return false;
  }

  if (!state.latestExtensionInfo?.available) {
    return true;
  }

  updatePluginStatusLabel();
  if (!isPluginOutdated()) {
    return true;
  }

  const currentVersion = state.pluginVersion;
  const latestVersion = state.latestExtensionInfo.version;
  setLine(
    statusEl,
    `检测到插件 v${currentVersion}，最新 v${latestVersion}，正在尝试自动更新...`,
  );

  const autoResult = await attemptAutoExtensionUpdate();
  if (autoResult.success) {
    setLine(statusEl, `插件已更新至 v${state.pluginVersion}`, 'success');
    updatePluginStatusLabel();
    return true;
  }

  const autoDownloaded = triggerExtensionDownload();
  showPluginUpdateModal({ currentVersion, latestVersion, autoDownloaded });
  setLine(
    statusEl,
    `插件版本过低（当前 v${currentVersion}，需要 v${latestVersion}）。${autoDownloaded ? '已自动下载最新插件包，' : ''}请按弹窗说明更新后点击「重新检测版本」`,
    'error',
  );
  return false;
}

async function loadExtensionInfo() {
  const info = await syncExtensionInfoFromServer();
  try {
    if (info.available) {
      extensionVersionBadge.textContent = `服务端包 v${info.version}`;
      if (state.pluginOk && state.pluginVersion) {
        extensionVersionBadge.textContent = `已安装 v${state.pluginVersion} / 最新 v${info.version}`;
      }
    } else {
      extensionVersionBadge.textContent = '插件包未构建';
    }
  } catch {
    extensionVersionBadge.textContent = '版本未知';
  }
  updatePluginStatusLabel();
}

pluginStatusBtn.addEventListener('click', () => {
  if (state.pluginOk && !isPluginOutdated()) return;
  if (state.pluginOk && isPluginOutdated()) {
    showPluginUpdateModal({
      currentVersion: state.pluginVersion,
      latestVersion: state.latestExtensionInfo?.version,
      autoDownloaded: false,
    });
    triggerExtensionDownload();
    return;
  }
  showPluginInstallModal();
});

downloadExtensionBtn.addEventListener('click', async (event) => {
  event.preventDefault();
  const info = await syncExtensionInfoFromServer();
  if (!info?.available) {
    return;
  }
  triggerExtensionDownload(info);
});

recheckExtensionBtn.addEventListener('click', async () => {
  recheckExtensionBtn.disabled = true;
  await syncExtensionInfoFromServer();
  await probeExtension();
  if (state.pluginOk && !isPluginOutdated()) {
    pluginGuideModal.classList.add('hidden');
    setLine(top20Status, `插件已更新至 v${state.pluginVersion}`, 'success');
    setLine(shopStatus, `插件已更新至 v${state.pluginVersion}`, 'success');
  } else {
    pluginUpdateNoticeText.textContent = state.pluginOk
      ? `当前仍为 v${state.pluginVersion}，最新为 v${state.latestExtensionInfo?.version}。请确认已移除旧插件并加载新文件夹后重试。`
      : '仍未检测到插件，请确认已安装插件并刷新本页后重试。';
  }
  await loadExtensionInfo();
  recheckExtensionBtn.disabled = false;
});

document.querySelectorAll('[data-close-modal="true"]').forEach((node) => {
  node.addEventListener('click', () => pluginGuideModal.classList.add('hidden'));
});

function syncReportOriginToExtension() {
  window.postMessage(
    { source: 'peer-top20-report', type: 'setReportOrigin', value: window.location.origin },
    window.location.origin,
  );
}

function listenForExtensionIdMessage() {
  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const data = event.data;
    if (data?.source !== 'peer-top20-extension' || data?.type !== 'extensionId' || !data.value) return;
    saveExtensionId(data.value);
    probeExtension();
  });
  syncReportOriginToExtension();
  window.postMessage({ source: 'peer-top20-report', type: 'requestExtensionId' }, window.location.origin);
}

function formatDuration(ms) {
  const value = Number(ms) || 0;
  if (value < 1000) return `${value}ms`;
  return `${(value / 1000).toFixed(1)}s`;
}

function formatShopInquiryTimingSummary(timings) {
  if (!timings) return '';
  const timingBits = [];
  if (timings.samplingMs) timingBits.push(`采样 ${formatDuration(timings.samplingMs)}`);
  if (timings.compareMs) {
    const batchHint = timings.compareBatches ? `（${timings.compareBatches} 批）` : '';
    timingBits.push(`compare ${formatDuration(timings.compareMs)}${batchHint}`);
  }
  if (timings.detailMs) timingBits.push(`详情 ${formatDuration(timings.detailMs)}`);
  if (timings.totalMs) timingBits.push(`总计 ${formatDuration(timings.totalMs)}`);
  return timingBits.length ? `，耗时 ${timingBits.join(' / ')}` : '';
}

function extractShopInquiryPrefix(serverMessage) {
  if (!serverMessage) return '';
  const headline = '已生成指定同行询盘分布';
  const idx = serverMessage.indexOf(headline);
  if (idx <= 0) return '';
  return serverMessage.slice(0, idx).replace(/[；;]\s*$/, '').trim();
}

function buildShopInquiryStatusMessage(prefixNotes, { timings, stats, productsPerCategory, categoryCount } = {}) {
  const platformCount =
    categoryCount ?? timings?.platformLeafCategories ?? stats?.platformLeafCategories;
  const groupCount = timings?.samplingGroupCount ?? stats?.samplingGroupCount;
  const sampledTotal = timings?.sampledProductIdTotal ?? stats?.sampledProductIdTotal;
  const uniqueProducts = timings?.uniqueProducts ?? stats?.uniqueProducts;
  const perGroup =
    productsPerCategory ?? stats?.productsPerCategory ?? timings?.productsPerCategory ?? 2;

  const detailParts = [];
  if (platformCount != null) detailParts.push(`${platformCount}个类目`);
  if (perGroup) detailParts.push(`每分组${perGroup}个产品id`);
  if (groupCount && sampledTotal) {
    const dedup =
      uniqueProducts && uniqueProducts !== sampledTotal ? `（去重${uniqueProducts}个）` : '';
    detailParts.push(`${groupCount}个分组共${sampledTotal}个产品id${dedup}`);
  } else if (groupCount) {
    detailParts.push(`${groupCount}个分组`);
  } else if (sampledTotal) {
    const dedup =
      uniqueProducts && uniqueProducts !== sampledTotal ? `（去重${uniqueProducts}个）` : '';
    detailParts.push(`共${sampledTotal}个产品id${dedup}`);
  }

  let message = '已生成指定同行询盘分布';
  if (detailParts.length) {
    message += `（${detailParts.join('，')}）`;
  }
  message += formatShopInquiryTimingSummary(timings);

  const prefix = extractShopInquiryPrefix(prefixNotes) || String(prefixNotes || '').trim();
  if (prefix && !prefix.includes('已生成指定同行询盘分布')) {
    message = `${prefix}；${message}`;
  }
  return message;
}

function formatTop20TimingsSummary(timings) {
  if (!timings) return '';
  const parts = [];
  if (timings.searchMs) {
    parts.push(`搜索 ${formatDuration(timings.searchMs)}`);
  }
  if (timings.compareMs) {
    parts.push(`compare ${formatDuration(timings.compareMs)}（${timings.compareBatches || 0} 批）`);
  }
  if (timings.detailMs) {
    parts.push(
      `类目解析 ${formatDuration(timings.detailMs)}（${timings.detailSuccess || 0}/${timings.detailCandidates || 0}）`,
    );
  }
  if (timings.uniqueProducts) {
    parts.push(`${timings.uniqueProducts} 产品`);
  }
  if (timings.uniqueSuppliers) {
    parts.push(`${timings.uniqueSuppliers} 供应商`);
  }
  if (timings.serverMs ?? timings.serverRenderMs) {
    parts.push(`服务端 ${formatDuration(timings.serverMs ?? timings.serverRenderMs)}`);
  }
  if (timings.totalMs) {
    parts.push(`总计 ${formatDuration(timings.totalMs)}`);
  }
  return parts.join(' · ');
}

async function fetchTop20RawData(keywords, searchPageCount = DEFAULT_TOP20_SEARCH_PAGE_COUNT) {
  const response = await sendExtensionMessage(
    {
      type: 'getDataReportDetail',
      query: {
        sameIndustryAnalyse: true,
        keywordArray: keywords,
        feedbackInterval: 'month',
        isReport: true,
        searchPageCount,
      },
      nickname: '',
    },
    180000 + Math.max(0, keywords.length - 1) * 60000 + Math.max(0, searchPageCount - 5) * 15000,
    true,
  );

  if (isCaptchaResponse(response)) {
    rejectCaptchaResponse(response);
  }
  if (!response.success) {
    throw new Error(response.message || '插件抓取失败');
  }
  if (!response.data?.sameIndustryAnalyseList?.length) {
    throw new Error('插件未返回同行数据，请确认已登录 i.alibaba.com');
  }
  return response.data;
}

async function fetchShopInquiryData(shopUrl, { productsPerCategory = DEFAULT_SHOP_PRODUCTS_PER_CATEGORY } = {}) {
  const response = await sendExtensionMessage(
    {
      type: 'shopCategoryInquiries',
      query: { shopUrl, debug: false, productsPerCategory },
    },
    180000,
    true,
  );

  if (isCaptchaResponse(response)) {
    rejectCaptchaResponse(response);
  }
  if (!response.success) {
    throw new Error(response.message || '店铺询盘查询失败');
  }
  return response.data;
}

function renderShopPreview(categories, shopUrl, incompleteNote = '') {
  const incompleteBanner = incompleteNote
    ? `<div class="incomplete-banner">⚠ ${escapeHtml(incompleteNote)}</div>`
    : '';
  if (window.ShopTreeClient) {
    return incompleteBanner + window.ShopTreeClient.renderPreview({ shopUrl, categories });
  }
  const rows = (categories || [])
    .map(
      (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.categoryName || item.categoryId || '未分类')}</td>
        <td>${escapeHtml(item.iquiries ?? '-')}</td>
      </tr>`,
    )
    .join('');
  return `
    <section class="report-section">
      <h4>指定同行询盘分布</h4>
      <p class="report-note">店铺：${escapeHtml(shopUrl)} · 近 6 个月叶子类目询盘</p>
      <table class="report-table">
        <thead><tr><th>序号</th><th>叶子类目</th><th>类目询盘</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="3">暂无数据</td></tr>'}</tbody>
      </table>
    </section>`;
}

function bindPreviewTree() {
  if (window.ShopTreeClient) {
    window.ShopTreeClient.bindToggles(previewContent);
  }
}

function showPreview({ type, title, message, html, reports, rawData, shopPayload }) {
  hideReportGenerating(false);
  state.preview = { type, title, html, reports, rawData, shopPayload };
  previewTitle.textContent = title;
  previewMeta.textContent = message;
  previewEmpty.classList.add('hidden');
  previewContent.classList.remove('hidden');
  previewActions.classList.remove('hidden');
  downloadExcelBtn.classList.toggle('hidden', type !== 'top20');
  top20CategoryFilterWrap?.classList.toggle('hidden', type !== 'top20');
  if (type === 'shop-inquiry' && shopPayload) {
    previewContent.innerHTML = renderShopPreview(
      shopPayload.categories,
      shopPayload.shopUrl,
      shopPayload.incompleteNote || '',
    );
    bindPreviewTree();
  } else if (type === 'top20' && reports?.length) {
    populateTop20CategoryFilter(reports);
    previewContent.innerHTML = renderTop20Preview(reports, state.top20SelectedCategory);
  } else if (html) {
    previewContent.innerHTML = html;
  }
}

generateTop20Btn.addEventListener('click', () => {
  runTop20Report();
});

async function runTop20Report() {
  const keywords = parseKeywords(top20Keywords.value);
  if (!keywords.length) {
    setLine(top20Status, '请至少输入一个关键词', 'error');
    return;
  }

  const ready = await ensureExtensionUpToDate(top20Status);
  if (!ready) {
    return;
  }

  state.pendingCaptchaRetry = runTop20Report;

  generateTop20Btn.disabled = true;
  setGeneratingBusy(true);
  const searchPageCount = getTop20SearchPageCount();
  showReportGenerating(getTop20GeneratingMessage(searchPageCount), '正在抓取数据');
  setLine(top20Status, `插件正在抓取数据（每关键词 ${searchPageCount} 页）...`);
  const startedAt = Date.now();
  try {
    const pluginStartedAt = Date.now();
    const rawData = await fetchTop20RawData(keywords, searchPageCount);
    const pluginMs = Date.now() - pluginStartedAt;
    updateReportGenerating('正在汇总并渲染报告...');
    setLine(top20Status, '正在生成报告...');
    const serverStartedAt = Date.now();
    const result = await apiFetch('/api/reports/top20', {
      method: 'POST',
      body: JSON.stringify({
        keywordText: top20Keywords.value,
        keywords,
        rawData,
        searchPageCount,
        pluginVersion: state.pluginVersion,
        durationMs: Date.now() - startedAt,
        pluginMs,
        serverMs: 0,
        timings: rawData.timings || null,
      }),
    });
    const serverMs = Date.now() - serverStartedAt;
    const timings = result.timings || {
      ...(rawData.timings || {}),
      pluginMs,
      serverMs,
      totalMs: Date.now() - startedAt,
    };
    const timingSummary = formatTop20TimingsSummary(timings);
    showPreview({
      type: 'top20',
      title: result.title,
      message: timingSummary
        ? `${result.message} · 抓取 ${searchPageCount} 页 · ${timingSummary}`
        : `${result.message} · 抓取 ${searchPageCount} 页`,
      html: result.html,
      reports: result.reports,
      rawData,
    });
    setLine(top20Status, timingSummary ? `报告生成成功 · ${timingSummary}` : '报告生成成功', 'success');
    state.pendingCaptchaRetry = null;
  } catch (error) {
    if (!isCaptchaPendingError(error)) {
      state.pendingCaptchaRetry = null;
    }
    handleReportGenerationError(top20Status, error);
  } finally {
    hideReportGenerating();
    setGeneratingBusy(false);
    resetReportInputDefaults();
  }
}

generateShopBtn.addEventListener('click', () => {
  runShopInquiryReport(shopUrlInput.value, { updateInput: true });
});

previewContent.addEventListener('click', (event) => {
  const btn = event.target.closest('.shop-inquiry-btn');
  if (!btn?.dataset.shopUrl) return;
  event.preventDefault();
  event.stopPropagation();
  runShopInquiryReport(btn.dataset.shopUrl, { updateInput: true });
});

downloadHtmlBtn.addEventListener('click', async () => {
  if (!state.preview.html && !state.preview.reports) return;
  try {
    const response = await fetch('/api/reports/export/html', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title: state.preview.title,
        html: state.preview.html,
        keywordText: top20Keywords.value,
        keywords: parseKeywords(top20Keywords.value),
        rawData: state.preview.rawData,
      }),
    });
    if (!response.ok) throw new Error('下载失败');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${state.preview.title || 'report'}.html`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    alert(error.message || '下载失败');
  }
});

downloadExcelBtn.addEventListener('click', async () => {
  if (!state.preview.rawData) return;
  try {
    const response = await fetch('/api/reports/export/excel', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        keywordText: top20Keywords.value,
        keywords: parseKeywords(top20Keywords.value),
        rawData: state.preview.rawData,
      }),
    });
    if (!response.ok) throw new Error('下载失败');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${state.preview.title || 'report'}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    alert(error.message || '下载失败');
  }
});

exportPdfBtn.addEventListener('click', async () => {
  if (!state.preview.type) return;
  if (typeof html2pdf === 'undefined') {
    alert('PDF 导出组件未加载，请刷新页面后重试');
    return;
  }
  const exportHtml = buildPdfExportHtml();
  if (!exportHtml) {
    alert('暂无可导出的报告内容');
    return;
  }

  exportPdfBtn.disabled = true;
  const prevText = exportPdfBtn.textContent;
  exportPdfBtn.textContent = '导出中...';
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:fixed;left:-10000px;top:0;width:1100px;';
  wrapper.innerHTML = exportHtml;
  document.body.appendChild(wrapper);
  const element = wrapper.firstElementChild || wrapper;

  try {
    await html2pdf()
      .set({
        margin: [8, 8, 10, 8],
        filename: buildPdfFilename(),
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: state.preview.type === 'top20' ? 'landscape' : 'portrait',
        },
        pagebreak: { mode: ['css', 'legacy'] },
      })
      .from(element)
      .save();
  } catch (error) {
    alert(error.message || 'PDF 导出失败');
  } finally {
    document.body.removeChild(wrapper);
    exportPdfBtn.disabled = false;
    exportPdfBtn.textContent = prevText;
  }
});

function formatTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function formatCacheStatus(status) {
  if (status === 'success') {
    return '<span class="tag success">成功</span>';
  }
  if (status === 'incomplete') {
    return '<span class="tag incomplete">不完整</span>';
  }
  return '<span class="tag failed">失败</span>';
}

const CACHE_TABLE_COLSPAN = 9;

function normalizeCacheObjectKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\/$/, '');
}

function getCacheFilterValues() {
  return {
    object: cacheFilterObject?.value || '',
    type: cacheFilterType?.value || '',
    creator: cacheFilterCreator?.value || '',
  };
}

function filterCacheItems(items, filters = getCacheFilterValues()) {
  return (items || []).filter((item) => {
    if (filters.type && item.type !== filters.type) {
      return false;
    }
    if (filters.creator && item.createdBy !== filters.creator) {
      return false;
    }
    if (filters.object && normalizeCacheObjectKey(item.targetObject) !== filters.object) {
      return false;
    }
    return true;
  });
}

function groupCacheItemsByObject(items) {
  const groups = new Map();
  const order = [];

  for (const item of items) {
    const key = normalizeCacheObjectKey(item.targetObject) || `__empty__:${item.id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: String(item.targetObject || '未命名对象').trim() || '未命名对象',
        items: [],
      });
      order.push(key);
    }
    const group = groups.get(key);
    group.items.push(item);
    if (!item.targetObject) {
      group.label = '未命名对象';
    }
  }

  return order.map((key) => groups.get(key));
}

function populateCacheFilterOptions(items) {
  const objectValue = cacheFilterObject?.value || '';
  const creatorValue = cacheFilterCreator?.value || '';

  const objectMap = new Map();
  const creators = new Set();
  for (const item of items || []) {
    const key = normalizeCacheObjectKey(item.targetObject);
    if (key) {
      objectMap.set(key, String(item.targetObject).trim());
    }
    if (item.createdBy) {
      creators.add(item.createdBy);
    }
  }

  if (cacheFilterObject) {
    const objectOptions = [...objectMap.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'zh-CN'))
      .map(
        ([key, label]) =>
          `<option value="${escapeHtml(key)}"${key === objectValue ? ' selected' : ''}>${escapeHtml(label)}</option>`,
      )
      .join('');
    cacheFilterObject.innerHTML = `<option value="">全部</option>${objectOptions}`;
  }

  if (cacheFilterCreator) {
    const creatorOptions = [...creators]
      .sort((a, b) => a.localeCompare(b, 'zh-CN'))
      .map(
        (name) =>
          `<option value="${escapeHtml(name)}"${name === creatorValue ? ' selected' : ''}>${escapeHtml(name)}</option>`,
      )
      .join('');
    cacheFilterCreator.innerHTML = `<option value="">全部</option>${creatorOptions}`;
  }
}

function renderCacheItemRow(item, { grouped = false } = {}) {
  const objectCell = grouped
    ? '<td class="object-cell cache-grouped-object"></td>'
    : `<td class="object-cell">${escapeHtml(item.targetObject || '-')}</td>`;
  return `
    <tr class="clickable cache-item-row" data-cache-id="${escapeHtml(item.id)}" data-group-key="${escapeHtml(normalizeCacheObjectKey(item.targetObject) || item.id)}">
      ${objectCell}
      <td>${escapeHtml(item.typeLabel)}</td>
      <td>${escapeHtml(item.createdBy)}</td>
      <td>${escapeHtml(formatTime(item.createdAt))}</td>
      <td>${escapeHtml(item.pluginVersion || '-')}</td>
      <td>${escapeHtml(item.inquirySummary || '-')}</td>
      <td>${escapeHtml(item.reportParams || '-')}</td>
      <td>${formatCacheStatus(item.status)}</td>
      <td>${escapeHtml(formatDuration(item.durationMs))}</td>
    </tr>`;
}

function renderCacheGroupHeader(group) {
  const collapsed = state.cacheCollapsedGroups.has(group.key);
  return `
    <tr class="cache-group-row" data-group-key="${escapeHtml(group.key)}">
      <td colspan="${CACHE_TABLE_COLSPAN}">
        <button
          type="button"
          class="cache-group-toggle"
          data-group-key="${escapeHtml(group.key)}"
          aria-expanded="${collapsed ? 'false' : 'true'}"
          title="${collapsed ? '展开' : '折叠'}"
        >${collapsed ? '+' : '−'}</button>
        <strong class="cache-group-label">${escapeHtml(group.label)}</strong>
        <span class="cache-group-meta">${group.items.length} 条记录</span>
      </td>
    </tr>`;
}

function renderCacheTableBody(items) {
  if (!items.length) {
    cacheTableBody.innerHTML = `<tr><td colspan="${CACHE_TABLE_COLSPAN}" class="empty-cell">暂无匹配的缓存报告</td></tr>`;
    return;
  }

  const groups = groupCacheItemsByObject(items);
  cacheTableBody.innerHTML = groups
    .flatMap((group) => {
      if (group.items.length === 1) {
        return [renderCacheItemRow(group.items[0])];
      }
      const collapsed = state.cacheCollapsedGroups.has(group.key);
      const rows = [renderCacheGroupHeader(group)];
      if (!collapsed) {
        rows.push(...group.items.map((item) => renderCacheItemRow(item, { grouped: true })));
      }
      return rows;
    })
    .join('');
}

function renderCacheList() {
  const filtered = filterCacheItems(state.cacheItems);
  renderCacheTableBody(filtered);
}

function resetCacheFilters() {
  if (cacheFilterObject) cacheFilterObject.value = '';
  if (cacheFilterType) cacheFilterType.value = '';
  if (cacheFilterCreator) cacheFilterCreator.value = '';
  renderCacheList();
}

function bindCacheFilters() {
  [cacheFilterObject, cacheFilterType, cacheFilterCreator].forEach((element) => {
    element?.addEventListener('change', renderCacheList);
  });
  cacheFilterResetBtn?.addEventListener('click', resetCacheFilters);
}

async function loadCacheList() {
  cacheTableBody.innerHTML = `<tr><td colspan="${CACHE_TABLE_COLSPAN}" class="empty-cell">加载中...</td></tr>`;
  try {
    const data = await apiFetch('/api/cache');
    state.cacheItems = data.items || [];
    populateCacheFilterOptions(state.cacheItems);
    if (!state.cacheItems.length) {
      cacheTableBody.innerHTML = `<tr><td colspan="${CACHE_TABLE_COLSPAN}" class="empty-cell">暂无缓存报告</td></tr>`;
      return;
    }
    renderCacheList();
  } catch (error) {
    cacheTableBody.innerHTML = `<tr><td colspan="${CACHE_TABLE_COLSPAN}" class="empty-cell">${escapeHtml(error.message)}</td></tr>`;
  }
}

cacheTableBody.addEventListener('click', async (event) => {
  const toggle = event.target.closest('.cache-group-toggle');
  if (toggle?.dataset.groupKey) {
    event.preventDefault();
    const groupKey = toggle.dataset.groupKey;
    if (state.cacheCollapsedGroups.has(groupKey)) {
      state.cacheCollapsedGroups.delete(groupKey);
    } else {
      state.cacheCollapsedGroups.add(groupKey);
    }
    renderCacheList();
    return;
  }

  const row = event.target.closest('[data-cache-id]');
  if (!row) return;
  try {
    const data = await apiFetch(`/api/cache/${row.dataset.cacheId}`);
    const item = data.item;
    switchView('report');
    if (item.type === 'shop-inquiry') {
      const statusSummary = buildShopInquiryStatusMessage(
        item.status === 'incomplete' ? item.errorMessage : '',
        {
          timings: item.payload?.timings,
          stats: item.payload?.scrapeStats,
          productsPerCategory: item.payload?.productsPerCategory,
          categoryCount: item.payload?.categories?.length,
        },
      );
      const cacheMeta = `缓存报告 · ${formatTime(item.createdAt)} · ${item.createdBy}${
        item.status === 'incomplete' ? ' · 不完整' : ''
      }`;
      showPreview({
        type: 'shop-inquiry',
        title: item.title,
        message: statusSummary ? `${cacheMeta} · ${statusSummary}` : cacheMeta,
        html: item.html,
        shopPayload: {
          shopUrl: item.payload?.shopUrl,
          categories: item.payload?.categories,
          incompleteNote: item.status === 'incomplete' ? item.errorMessage || '' : '',
        },
      });
    } else {
      const timingSummary = formatTop20TimingsSummary(item.payload?.timings);
      showPreview({
        type: 'top20',
        title: item.title,
        message: timingSummary
          ? `缓存报告 · ${formatTime(item.createdAt)} · ${item.createdBy} · ${timingSummary}`
          : `缓存报告 · ${formatTime(item.createdAt)} · ${item.createdBy}`,
        html: item.html,
        reports: item.reports,
      });
    }
  } catch (error) {
    alert(error.message || '打开缓存失败');
  }
});

refreshCacheBtn.addEventListener('click', loadCacheList);

function isAdminUser() {
  return state.user?.role === 'admin';
}

function configureAccountFormAccess({ editing = false } = {}) {
  const isAdmin = isAdminUser();
  accountFormCard.classList.toggle('hidden', !isAdmin && !editing);
  createAccountBtn?.classList.toggle('hidden', !isAdmin);
  accountFormTitle.textContent = isAdmin && !accountEditId.value ? '新建账号' : '编辑账号';
  accountFormDesc.textContent = isAdmin
    ? '管理员可创建经理 / 员工账号，并指定上级人员'
    : '可修改密码与上级人员，无法修改账号类型或新建账号';
  accountsListDesc.textContent = isAdmin
    ? '支持增删改查，列表包含 admin 管理员账号'
    : '仅显示本人及下级账号，点击编辑可修改密码与上级人员';
  accountUsername.disabled = Boolean(accountEditId.value) && !isAdmin;
  accountRole.disabled = !isAdmin;
  resetAccountFormBtn.classList.toggle('hidden', !isAdmin);
}

function resetAccountForm() {
  accountEditId.value = '';
  accountForm.reset();
  accountFormError.textContent = '';
  configureAccountFormAccess({ editing: false });
}

function fillParentOptions(users, selectedId = '') {
  accountParentId.innerHTML = '<option value="">无</option>';
  users
    .filter((user) => user.id !== accountEditId.value)
    .forEach((user) => {
      const option = document.createElement('option');
      option.value = user.id;
      option.textContent = `${user.username} (${user.roleLabel})`;
      accountParentId.appendChild(option);
    });
  accountParentId.value = selectedId || '';
}

async function loadParentOptions(targetUserId, selectedId = '') {
  if (!targetUserId) {
    fillParentOptions(state.users, selectedId);
    return;
  }
  if (isAdminUser()) {
    fillParentOptions(state.users, selectedId);
    return;
  }
  const data = await apiFetch(`/api/users/parent-options/${targetUserId}`);
  fillParentOptions(data.users || [], selectedId);
}

async function loadAccounts() {
  const isAdmin = isAdminUser();
  configureAccountFormAccess({ editing: false });
  accountsTableBody.innerHTML = '<tr><td colspan="4" class="empty-cell">加载中...</td></tr>';
  try {
    const data = await apiFetch('/api/users');
    state.users = data.users || [];
    fillParentOptions(state.users);
    const sortedUsers = [...state.users].sort((a, b) => {
      if (a.username === 'admin') return -1;
      if (b.username === 'admin') return 1;
      return a.username.localeCompare(b.username, 'zh-CN');
    });
    if (!sortedUsers.length) {
      accountsTableBody.innerHTML = '<tr><td colspan="4" class="empty-cell">暂无可见账号</td></tr>';
      return;
    }
    accountsTableBody.innerHTML = sortedUsers
      .map((user) => {
        const parent = state.users.find((item) => item.id === user.parentId);
        const canDelete = isAdmin && user.username !== 'admin';
        const adminBadge =
          user.username === 'admin' ? ' <span class="badge">系统账号</span>' : '';
        return `
          <tr>
            <td>${escapeHtml(user.username)}${adminBadge}</td>
            <td>${escapeHtml(user.roleLabel)}</td>
            <td>${escapeHtml(parent?.username || '-')}</td>
            <td>
              <button type="button" class="btn ghost edit-user-btn" data-id="${escapeHtml(user.id)}">编辑</button>
              ${canDelete ? `<button type="button" class="btn danger delete-user-btn" data-id="${escapeHtml(user.id)}">删除</button>` : ''}
            </td>
          </tr>`;
      })
      .join('');
  } catch (error) {
    accountsTableBody.innerHTML = `<tr><td colspan="4" class="empty-cell">${escapeHtml(error.message)}</td></tr>`;
  }
}

accountsTableBody.addEventListener('click', async (event) => {
  const editBtn = event.target.closest('.edit-user-btn');
  const deleteBtn = event.target.closest('.delete-user-btn');
  if (editBtn) {
    const user = state.users.find((item) => item.id === editBtn.dataset.id);
    if (!user) return;
    accountEditId.value = user.id;
    accountUsername.value = user.username;
    accountPassword.value = '';
    accountRole.value = user.role;
    await loadParentOptions(user.id, user.parentId || '');
    configureAccountFormAccess({ editing: true });
    return;
  }
  if (deleteBtn) {
    if (!confirm('确认删除该账号？')) return;
    try {
      await apiFetch(`/api/users/${deleteBtn.dataset.id}`, { method: 'DELETE' });
      resetAccountForm();
      loadAccounts();
    } catch (error) {
      accountFormError.textContent = error.message;
    }
  }
});

accountForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  accountFormError.textContent = '';
  const isAdmin = isAdminUser();
  const payload = {
    parentId: accountParentId.value || null,
  };
  if (accountPassword.value.trim()) {
    payload.password = accountPassword.value.trim();
  }
  try {
    if (accountEditId.value) {
      if (isAdmin) {
        payload.username = accountUsername.value.trim();
        payload.role = accountRole.value;
      }
      await apiFetch(`/api/users/${accountEditId.value}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } else {
      if (!isAdmin) {
        throw new Error('无权创建账号');
      }
      if (!payload.password) throw new Error('新建账号必须填写密码');
      await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          username: accountUsername.value.trim(),
          role: accountRole.value,
          parentId: payload.parentId,
          password: payload.password,
        }),
      });
    }
    resetAccountForm();
    loadAccounts();
  } catch (error) {
    accountFormError.textContent = error.message;
  }
});

resetAccountFormBtn.addEventListener('click', resetAccountForm);
refreshAccountsBtn.addEventListener('click', loadAccounts);
createAccountBtn?.addEventListener('click', () => {
  resetAccountForm();
  accountFormCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  accountUsername?.focus();
});
top20CategoryFilter?.addEventListener('change', () => {
  state.top20SelectedCategory = top20CategoryFilter.value;
  refreshTop20Preview();
});

function initAppAfterLogin() {
  const savedId = localStorage.getItem(EXTENSION_ID_KEYS[0]) || '';
  if (savedId) {
    state.extensionId = savedId;
  }
  bindTop20SearchPageCount();
  bindShopProductsPerCategory();
  bindCacheFilters();
  bindCaptchaGuideModal();
  bindLoginGuideModal();
  if (isAdminUser()) {
    configureAccountFormAccess({ editing: false });
  }
  listenForExtensionIdMessage();
  syncExtensionInfoFromServer().then(() => probeExtension());
  startExtensionInfoSync();
  switchView('report');
}

bootstrapAuth();
