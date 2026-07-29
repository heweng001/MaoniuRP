// 插件文档地址
export const URL: string =
  'https://docs.qq.com/doc/p/426a652d3f2fe5a76ed97e2e232dff78f99253e7';
export const PLUGIN_MESSAGE: string = '插件版本过低，请升级到新版';
export const PLUGIN_PROMPT: string =
  '未检测到插件，一些功能将无法正常使用！若已安装插件,请刷新页面后重试（window操作系统：按CTRL + F5; Mac系统：按Shift + Command + R)';
export const PLUGIN_OTHER_PROMPT: string =
  '检测到您当前插件的版本较低，建议您安装最新版本！';
// 插件id
export const CHROME_EXTENSION_ID: string | null = localStorage.getItem('ai-plugin-id');
// AI地址
export const LOCATION_HREF: string = `https://aifj.maoniux.com`;

export const PRODUCT_EDIT_URL_PREFIX =
  'https://hz-productposting.alibaba.com/product/editing.htm?id=';

export const KEYWORD_SEARCH_URL_PREFIX =
  'https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&CatId=&SearchText=';

export const MA_URL: string =
  process.env.NODE_ENV === 'production'
    ? 'https://ma.maoniux.com'
    : 'https://ma.maoniux.com';

export const AI_URL = 'https://ai.maoniunet.com';
