import { Col, Row, Table } from 'antd';
import React, { Component } from 'react';
const formatPercent = (val) => {
  const { inquiries, total } = val;
  return ((inquiries / total) * 100).toFixed(2) + '%';
};
class FeedbackProductTable extends Component {
  leftTableData() {
    const leftTableList = this.computedDataList()?.slice(
      0,
      this.getHalfInt(this.computedDataList()),
    );
    return leftTableList;
  }

  rightTableData() {
    const rightTableList = this.computedDataList()?.slice(
      this.getHalfInt(this.computedDataList()),
    );
    return rightTableList;
  }

  computedDataList() {
    let data = this.props.dataSource?.groups?.filter(
      (item) => !item?.parentName?.includes('>>'),
    );
    if (data) {
      const totalInquiries = this.props.dataSource?.totalInquiries;
      for (const item of data) {
        item.total = totalInquiries;
        item.id = Math.random();
        item.ids = Math.random();
      }
      data = data.filter((i) => i.inquiries !== 0);
      return data;
    } else {
      return [];
    }
  }

  getHalfInt(data) {
    let half = data.length / 2;
    if (!Number.isInteger(half)) {
      half = Math.ceil(half);
    }
    return half;
  }

  render() {
    const leftTableColumn = [
      {
        title: '产品分组',
        dataIndex: 'parentName',
        align: 'center',
      },
      {
        title: '询盘数',
        dataIndex: 'inquiries',
        align: 'center',
      },
      {
        title: '询盘占比',
        dataIndex: 'inquiryPercent',
        align: 'center',
        render: (dom, record) => <span>{formatPercent(record)}</span>,
      },
    ];
    const rightTableColumn = [
      {
        title: '产品分组',
        dataIndex: 'parentName',
        align: 'center',
      },
      {
        title: '询盘数',
        dataIndex: 'inquiries',
        align: 'center',
      },
      {
        title: '询盘占比',
        dataIndex: 'inquiryPercent',
        align: 'center',
        render: (dom, record) => <span>{formatPercent(record)}</span>,
      },
    ];
    return (
      <div>
        <Row>
          <Col span={12}>
            <Table
              pagination={false}
              bordered
              dataSource={this.leftTableData()}
              columns={leftTableColumn}
              rowKey="id"
            />
          </Col>
          <Col span={12}>
            <Table
              pagination={false}
              bordered
              dataSource={this.rightTableData()}
              columns={rightTableColumn}
              rowKey="ids"
            />
          </Col>
        </Row>
      </div>
    );
  }
}
export default FeedbackProductTable;
