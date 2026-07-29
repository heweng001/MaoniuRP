import { GLOBAL_STATE } from './action-types';

export const globalState = (state: boolean) => ({ type: GLOBAL_STATE, state });
