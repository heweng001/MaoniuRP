const REPORT_PORTS = new Set(['3456']);

function shouldAnnounceExtensionId() {
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

if (shouldAnnounceExtensionId()) {
  announceExtensionId();
  document.addEventListener('DOMContentLoaded', announceExtensionId);

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== window.location.origin) {
      return;
    }
    const data = event.data;
    if (data?.source === 'peer-top20-report' && data?.type === 'requestExtensionId') {
      announceExtensionId();
    }
  });
}
