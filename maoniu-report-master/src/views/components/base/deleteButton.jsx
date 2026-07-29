import './deleteButton.less';

import { Button } from 'antd';
import React, { Component } from 'react';
class DeleteButton extends Component {
  handleToDelete() {
    this.props.deleteModel();
  }

  render() {
    return (
      <span className="btn_group">
        <Button
          onClick={() => {
            this.handleToDelete();
          }}
          danger
          type="primary"
          className="dpn"
        >
          删除
        </Button>
      </span>
    );
  }
}
export default DeleteButton;
