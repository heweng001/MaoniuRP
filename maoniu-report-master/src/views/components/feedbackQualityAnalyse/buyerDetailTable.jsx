import { Table } from 'antd';
import React, { Component } from 'react';
// import CopyToClipboard from 'react-copy-to-clipboard';
// import { CopyTwoTone } from '@ant-design/icons';
// import notify from '@/utils/notify';
class BuyerDetailTable extends Component {
  computedDataList() {
    const data = this.props.dataSource;
    if (!data) {
      return [];
    }
    const result = [];
    let cnt = 1;
    data.sort((a, b) => {
      return b.createTime - a.createTime;
    });
    for (const item of data) {
      let replyIn24h = item.replyIn24h;
      if (item.isRFQ) {
        replyIn24h = 'RFQ';
      }
      result.push({
        index: cnt++,
        createTime:
          new Date(item.createTime).toISOString().split(':')[0] +
          ':' +
          new Date(item.createTime).toISOString().split(':')[1],
        ownerName: item.ownerName,
        name: item.name,
        countryName: item.countryName,
        mark: this.transformFlag(item.mark),
        productName: item.productName,
        quantity:
          this.filterUndefined(item.quantity) + ' ' + this.filterUndefined(item.unit),
        blueMark: item.buyerLevel === 'A' ? '是' : '否',
        isRFQ: item.isRFQ,
        replyIn24h,
        buyerSecondReply: item.buyerSecondReply ? '是' : '否',
        email: item.email,
        userNewLevel1: this.getUserNewLevel(item, 'L1+'),
        userNewLevel3: this.getUserNewLevel(item, 'L3'),
        userNewLevel4: this.getUserNewLevel(item, 'L4'),
        id: Math.random(),
      });
    }
    return result;
  }

  tableSpanMethod({ row, columnIndex }) {
    if (row.isRFQ) {
      if (columnIndex === 9) {
        return [1, 2];
      }
      if (columnIndex === 10) {
        return [1, 0];
      }
      return [1, 1];
    }
  }

  filterUndefined(value) {
    if (value) {
      return value;
    }
    return '';
  }

  getUserNewLevel = (item, level) => {
    return item.userNewLevel && item.userNewLevel === level ? '是' : '否';
  };

  transformFlag(mark) {
    if (mark) {
      if (mark === 'FOLLOW_GREEN') {
        return '绿';
      }
      if (mark === 'FOLLOW') {
        return '红';
      }
      if (mark === 'FOLLOW_BLUE') {
        return '蓝';
      }
      if (mark === 'NOT_FOLLOW') {
        return '灰';
      }
    }
    return '';
  }
  // onCopy = (value) => {
  //     notify.success(`${value}`);
  // };

  render() {
    const tableColumn = [
      {
        title: '序号',
        dataIndex: 'index',
        width: '60px',
        align: 'center',
      },
      {
        title: '询盘质量',
        dataIndex: 'mark',
        width: '70px',
        align: 'center',
      },
      {
        title: '买家',
        dataIndex: 'name',
        align: 'center',
        ellipsis: true,
        showSorterTooltip: true,
      },
      {
        title: '国家',
        dataIndex: 'countryName',
        align: 'center',
      },
      {
        title: '产品',
        dataIndex: 'productName',
        align: 'center',
        ellipsis: true,
      },
      {
        title: '数量',
        dataIndex: 'quantity',
        align: 'center',
        ellipsis: true,
        showSorterTooltip: true,
      },
      {
        title: 'L1+',
        dataIndex: 'userNewLevel1',
        width: '60px',
        align: 'center',
      },
      {
        title: 'L3',
        dataIndex: 'userNewLevel3',
        width: '60px',
        align: 'center',
      },
      {
        title: 'L4',
        dataIndex: 'userNewLevel4',
        width: '60px',
        align: 'center',
      },
      {
        title: '负责人',
        dataIndex: 'ownerName',
        align: 'center',
        ellipsis: true,
        showSorterTooltip: true,
      },
      // {
      //   title: "统计'回复时间'",
      //   dataIndex: 'replyIn24h',
      //   align: 'center',
      // },
      // {
      //   title: '买家二次回复',
      //   dataIndex: 'buyerSecondReply',
      //   align: 'center',
      // },
      {
        title: '邮箱',
        dataIndex: 'email',
        align: 'center',
        // ellipsis: true,
        // showSorterTooltip: true,
        // render: (d, r) =>
        //   (
        //       <p>
        //         <CopyToClipboard
        //             text={r.email}
        //             onCopy={this.onCopy}>
        //             <CopyTwoTone />
        //         </CopyToClipboard>
        //       </p>
        //
        //   )
      },
    ];
    return (
      <Table
        pagination={false}
        bordered
        dataSource={this.computedDataList()}
        columns={tableColumn}
        rowKey="id"
      />
    );
  }
}
export default BuyerDetailTable;
