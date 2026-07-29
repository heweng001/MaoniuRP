import { Modal } from 'antd';

import {
  CHROME_EXTENSION_ID,
  LOCATION_HREF,
  PLUGIN_MESSAGE,
  PLUGIN_OTHER_PROMPT,
  PLUGIN_PROMPT,
  URL,
} from '../constant';

function noPluginPrompt(prompt: string) {
  return Modal.confirm({
    title: prompt,
    okText: '立即安装',
    cancelText: '取消',
    onOk() {
      return window.open(URL, '_blank');
    },
    onCancel() {
      return undefined;
    },
  });
}

function getCurrentPluginVersion() {
  const message = {
    type: 'getVersion',
  };
  return new Promise((resolve) => {
    window?.chrome?.runtime?.sendMessage(
      CHROME_EXTENSION_ID,
      Object.assign(message, { href: LOCATION_HREF }),
      (res: any) => {
        if (res && res.success) {
          resolve(res.value);
        }
        resolve(false);
      },
    );
  });
}

async function isUsePlugin() {
  const result = await getCurrentPluginVersion();
  if (result) {
    return result;
  }
  return noPluginPrompt(PLUGIN_PROMPT);
}

export const sendMessage = async (
  message: object,
  callback: any,
  notRuntineCallback?: any,
) => {
  if (!CHROME_EXTENSION_ID) {
    return noPluginPrompt(PLUGIN_PROMPT);
  }
  if (window.chrome.runtime) {
    const result = await isUsePlugin();
    if (result) {
      return window.chrome.runtime.sendMessage(
        CHROME_EXTENSION_ID,
        Object.assign(message, { href: LOCATION_HREF }),
        (res: any) => {
          if (!res) {
            return callback(noPluginPrompt(PLUGIN_PROMPT));
          }
          const { message, success } = res;
          if (!success && message === PLUGIN_MESSAGE) {
            return callback(noPluginPrompt(PLUGIN_OTHER_PROMPT));
          } else {
            return callback(res);
          }
        },
      );
    } else {
      return callback(undefined);
    }
  } else if (notRuntineCallback) {
    notRuntineCallback();
  }
};
