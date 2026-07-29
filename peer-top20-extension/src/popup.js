const extensionIdInput = document.getElementById('extensionId');
const copyIdBtn = document.getElementById('copyIdBtn');
const loginStatus = document.getElementById('loginStatus');
const openReportBtn = document.getElementById('openReportBtn');

const DEFAULT_REPORT_URL = 'http://localhost:3456';
const REPORT_URL_STORAGE_KEY = 'reportUrl';
const STORAGE_KEY = 'peer-top20-extension-id';

extensionIdInput.value = chrome.runtime.id;
localStorage.setItem(STORAGE_KEY, chrome.runtime.id);

copyIdBtn.addEventListener('click', async () => {
  await navigator.clipboard.writeText(chrome.runtime.id);
  copyIdBtn.textContent = '已复制';
  setTimeout(() => {
    copyIdBtn.textContent = '复制';
  }, 1500);
});

function resolveReportUrl(callback) {
  chrome.storage.local.get([REPORT_URL_STORAGE_KEY], (result) => {
    callback(result[REPORT_URL_STORAGE_KEY] || DEFAULT_REPORT_URL);
  });
}

openReportBtn.addEventListener('click', () => {
  resolveReportUrl((url) => {
    chrome.tabs.create({ url });
  });
});

chrome.cookies.getAll({ domain: '.alibaba.com' }, (cookies) => {
  const loginCookie = (cookies || []).find((item) => item.name === 'xman_us_t');
  const hasToken = loginCookie?.value?.includes('ctoken=');
  const cookieCount = (cookies || []).length;
  loginStatus.textContent = hasToken
    ? `已登录（${cookieCount} 个 Cookie），可抓取真实数据`
    : '未登录阿里巴巴国际站，请先打开 https://i.alibaba.com 登录';
  loginStatus.style.color = hasToken ? '#059669' : '#dc2626';
});
