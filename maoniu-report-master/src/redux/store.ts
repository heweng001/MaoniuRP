/*
redux最核心的管理对象store
 */
import { applyMiddleware, createStore } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import thunk from 'redux-thunk';

import reducer from './reducer';

// 向外默认暴露store
export default createStore(reducer, composeWithDevTools(applyMiddleware(thunk)));
