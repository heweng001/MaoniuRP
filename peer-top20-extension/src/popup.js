const extensionIdInput = document.getElementById('extensionId');
const copyIdBtn = document.getElementById('copyIdBtn');
const loginStatus = document.getElementById('loginStatus');
const openReportBtn = document.getElementById('openReportBtn');

const REPORT_URL = 'http://localhost:3456';
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

openReportBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: REPORT_URL });
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
