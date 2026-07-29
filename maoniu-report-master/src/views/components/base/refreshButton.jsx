import './deleteButton.less';

import { Button } from 'antd';
import React, { Component } from 'react';
class RefreshButton extends Component {
  handleToRefresh() {
    this.props.refreshModel();
  }

  render() {
    return (
      <div className="btn_group">
        <Button
          onClick={() => {
            this.handleToRefresh();
          }}
          type="primary"
          className="dpn"
        >
          刷新
        </Button>
      </div>
    );
  }
}
export default RefreshButton;
