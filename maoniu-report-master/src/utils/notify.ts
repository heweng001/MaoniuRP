import { message } from 'antd';

const notify = {
  info(msg: string) {
    return message.info(msg);
  },
  success(msg: string) {
    return message.success(msg);
  },
  warning(msg: string) {
    return message.warning(msg);
  },
  error(msg: string) {
    return message.error(msg);
  },
};

export default notify;
