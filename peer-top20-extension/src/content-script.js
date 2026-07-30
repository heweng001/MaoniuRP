const REPORT_PORTS = new Set(['3456']);
const REPORT_SITE_META = 'meta[name="peer-top20-report"]';
const REPORT_URL_STORAGE_KEY = 'reportUrl';

function isKnownReportHost() {
  const { hostname } = window.location;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === 'maoniux.com' ||
    hostname.endsWith('.maoniux.com') ||
    hostname === 'maoniunet.com' ||
    hostname.endsWith('.maoniunet.com')
  );
}

function isReportSiteDocument() {
  return Boolean(document.querySelector(REPORT_SITE_META));
}

function shouldAnnounceExtensionId() {
  if (isReportSiteDocument() || isKnownReportHost()) {
    return true;
  }
  const { port } = window.location;
  return REPORT_PORTS.has(port);
}

function announceExtensionId() {
  window.postMessage(
    {
      source: 'peer-top20-extension',
      type: 'extensionId',
      value: chrome.runtime.id,
    },
    window.location.origin,
  );
}

function persistReportUrl(url) {
  if (!url || typeof url !== 'string') {
    return;
  }
  chrome.storage.local.set({ [REPORT_URL_STORAGE_KEY]: url.replace(/\/$/, '') });
}

function activateIfReportSite() {
  if (!shouldAnnounceExtensionId()) {
    return false;
  }
  persistReportUrl(window.location.origin);
  announceExtensionId();
  return true;
}

window.addEventListener('message', (event) => {
  if (event.source !== window || event.origin !== window.location.origin) {
    return;
  }
  const data = event.data;
  if (data?.source !== 'peer-top20-report') {
    return;
  }
  if (data?.type === 'setReportOrigin' && data?.value) {
    persistReportUrl(data.value);
    return;
  }
  if (data?.type === 'requestExtensionId') {
    announceExtensionId();
  }
});

activateIfReportSite();
document.addEventListener('DOMContentLoaded', activateIfReportSite);
