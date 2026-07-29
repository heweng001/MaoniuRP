import { Table } from 'antd';
import React, { useMemo } from 'react';

import PopularProductTableCell from './popularProductTableCell';

const popularProductTable = (props) => {
  const { value = [], moduleName = '', isHighInquiryProducts = true } = props;

  // console.log(value);

  const tableData = useMemo(() => {
    if (!value) {
      return;
    }
    let i = 0;
    const map = ['zero', 'one', 'two', 'three', 'four'];
    return value.reduce((a, b, currentIndex) => {
      const index = currentIndex % map.length;
      // const lastIndex = index - 1 < 0 ? 0 : index - 1;
      if (!a[i]) {
        a[i] = {};
      }
      a[i][map[index]] = b;

      if (index === map.length - 1) {
        i++;
      }
      return a;
    }, []);
  }, [value]);
  // console.log(moduleName, tableData);

  const columns = [
    {
      dataIndex: 'zero',
      align: 'center',
      render: (v, r) => <PopularProductTableCell value={v}></PopularProductTableCell>,
    },
    {
      dataIndex: 'one',
      align: 'center',
      render: (v, r) => <PopularProductTableCell value={v}></PopularProductTableCell>,
    },
    {
      dataIndex: 'two',
      align: 'center',
      render: (v, r) => <PopularProductTableCell value={v}></PopularProductTableCell>,
    },
    {
      dataIndex: 'three',
      align: 'center',
      render: (v, r) => <PopularProductTableCell value={v}></PopularProductTableCell>,
    },
    {
      dataIndex: 'four',
      align: 'center',
      render: (v, r) => <PopularProductTableCell value={v}></PopularProductTableCell>,
    },
  ];
  return (
    <div>
      {tableData.length > 0 ? (
        <div className="section">
          <Table
            dataSource={tableData}
            columns={columns}
            showHeader={false}
            pagination={false}
          ></Table>
        </div>
      ) : moduleName ? (
        <p>{{ moduleName }}数据为空,暂无相关数据</p>
      ) : (
        <div>
          {isHighInquiryProducts ? (
            <p>类目询盘榜为空, 暂无相关数据。</p>
          ) : (
            <p>类目销量榜为空, 暂无相关数据。</p>
          )}
        </div>
      )}
    </div>
  );
};

export default popularProductTable;
