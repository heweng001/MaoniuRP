import { Table } from 'antd';
import React, { Component } from 'react';

class InquiryQualityTable extends Component {
  render() {
    const tableColumn = [
      {
        title: '询盘商机+tm商机',
        dataIndex: 'total',
        align: 'center',
      },
      // {
      //   title: '红旗询盘',
      //   dataIndex: 'red',
      //   align: 'center',
      // },
      // {
      //   title: '绿旗询盘',
      //   dataIndex: 'green',
      //   align: 'center',
      // },
      // {
      //   title: '蓝旗询盘',
      //   dataIndex: 'blue',
      //   align: 'center',
      // },
      // {
      //   title: '灰旗询盘',
      //   dataIndex: 'gray',
      //   align: 'center',
      // },
      // {
      //   title: '二次回复询盘',
      //   dataIndex: 'secondResponse',
      //   align: 'center',
      // },
      {
        title: 'L1+',
        dataIndex: 'userNewLevel1',
        align: 'center',
      },
      {
        title: 'L3',
        dataIndex: 'userNewLevel3',
        align: 'center',
      },
      {
        title: 'L4',
        dataIndex: 'userNewLevel4',
        align: 'center',
      },
    ];
    return (
      <Table
        pagination={false}
        bordered
        dataSource={this.props.dataSource}
        columns={tableColumn}
        rowKey="id"
      />
    );
  }
}
export default InquiryQualityTable;
