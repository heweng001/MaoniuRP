import loki from 'lokijs';

console.log('logging tool lokijs load', process.env.NODE_ENV);

const isProdEnv = process.env.NODE_ENV === 'production';

const db = new loki('report-db', {
  autoload: true,
  autoloadCallback: () => {},
  autosave: true,
  autosaveInterval: 5000,
  persistenceMethod: 'localStorage',
});

const logCollection = db.addCollection('logs');

function sendLogToLoki(entry) {
  const url = 'https://loki.maoniux.com/loki/api/v1/push';
  const headers = {
    'Content-Type': 'application/json',
  };
  const body = JSON.stringify({
    streams: [
      {
        stream: {
          job: isProdEnv ? 'report' : 'dev-report',
        },
        values: [
          [
            String(entry.timestamp),
            `${sessionStorage.getItem('nick')}: ${JSON.stringify(entry.message)}`,
          ],
        ],
      },
    ],
  });

  fetch(url, {
    method: 'POST',
    headers,
    body,
    mode: 'cors', // 设置跨域请求模式
    // credentials: "include", // 携带当前域名的 cookie
  }).catch(() => {});
}

function logToLoki(message, level) {
  const timestamp = performance?.timeOrigin
    ? performance.now() + performance.timeOrigin
    : Date.now();
  const entry = {
    timestamp: timestamp * 1e6,
    level: level || 'info',
    message,
  };

  logCollection.insert(entry);
  sendLogToLoki(entry);
}

if (isProdEnv) {
  const originalLog = console.log;
  console.log = function (...message) {
    logToLoki(message, 'info');

    originalLog.apply(console, arguments);
  };

  // console.warn = (message) => {
  //   logToLoki(message, "warning");
  // };

  const orignialError = console.error;

  console.error = function (...message) {
    logToLoki(message, 'error');

    orignialError.apply(console, arguments);
  };
}
