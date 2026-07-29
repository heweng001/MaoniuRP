const REPORT_PORTS = new Set(['3456']);
const REPORT_SITE_META = 'meta[name="peer-top20-report"]';
const DEFAULT_REPORT_URL = 'http://localhost:3456';
const REPORT_URL_STORAGE_KEY = 'reportUrl';

function isReportSiteDocument() {
  return Boolean(document.querySelector(REPORT_SITE_META));
}

function shouldAnnounceExtensionId() {
  if (isReportSiteDocument()) {
    return true;
  }
  const { port, hostname } = window.location;
  if (REPORT_PORTS.has(port)) {
    return true;
  }
  return hostname === 'localhost' || hostname === '127.0.0.1';
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

if (shouldAnnounceExtensionId()) {
  persistReportUrl(window.location.origin);
  announceExtensionId();
  document.addEventListener('DOMContentLoaded', () => {
    persistReportUrl(window.location.origin);
    announceExtensionId();
  });

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== window.location.origin) {
      return;
    }
    const data = event.data;
    if (data?.source !== 'peer-top20-report' && data?.source !== 'peer-top20-extension') {
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
}
