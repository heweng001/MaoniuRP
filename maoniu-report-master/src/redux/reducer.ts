/*
用来根据老的state和指定的action生成并返回新的state的函数
 */
import { combineReducers } from 'redux';

import { GLOBAL_STATE } from './action-types';

function globalState(state = false, action: any) {
  switch (action.type) {
    case GLOBAL_STATE:
      return action.state;
    default:
      return state;
  }
}

export default combineReducers({
  globalState,
});
