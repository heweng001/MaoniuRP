export const isArray = (val: any[]) => {
  return val?.length && Array.isArray(val);
};
export const getNested = (obj: any, ...args: any) => {
  return args.reduce((obj: any, level: any) => obj && obj[level], obj);
};
export const isJson = (val: string) => {
  try {
    JSON.parse(val);
  } catch (e) {
    return false;
  }
  return true;
};
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
