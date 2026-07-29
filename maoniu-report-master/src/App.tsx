import './App.css';

import { ArrowUpOutlined, CreditCardTwoTone, PieChartTwoTone } from '@ant-design/icons';
import { BackTop, Spin, Tooltip } from 'antd';
import React from 'react';
import { connect } from 'react-redux';

import { globalState } from '@/redux/actions';
import store from '@/redux/store';
import { sleep } from '@/utils/util';

import Report from './views/report/report';

class App extends React.Component<any> {
  state = {
    loading: false,
  };

  onClick = async (e: any) => {
    e.stopPropagation();
    await this.setState({
      loading: true,
    });
    this.props.globalState(!store.getState().globalState);
    await sleep(100);
    await this.setState({
      loading: false,
    });
  };
  render() {
    const { loading } = this.state;
    return (
      <Spin spinning={loading}>
        <div className="container">
          <div className="content">
            <Report />
          </div>
          <BackTop>
            <Tooltip
              title={
                store.getState().globalState
                  ? '关闭部分数据图形化展示'
                  : '开启部分数据图形化展示'
              }
            >
              {store.getState().globalState ? (
                <CreditCardTwoTone
                  className="echarts_btn"
                  onClick={(e) => this.onClick(e)}
                />
              ) : (
                <PieChartTwoTone
                  className="echarts_btn"
                  onClick={(e) => this.onClick(e)}
                />
              )}
            </Tooltip>
            <ArrowUpOutlined className="back_top" />
          </BackTop>
        </div>
      </Spin>
    );
  }
}

export default connect(null, { globalState })(App);
