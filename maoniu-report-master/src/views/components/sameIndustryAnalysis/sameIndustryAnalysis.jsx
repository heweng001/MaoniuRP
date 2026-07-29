import './index.css';

import { SearchOutlined } from '@ant-design/icons';
import { Select, Space, Table, Tooltip, Typography } from 'antd';
import React from 'react';
import { useEffect, useState } from 'react';

import number4 from '../../assets/number-4.png';
import number5 from '../../assets/number-5.png';
import top1 from '../../assets/top1.svg';
import top2 from '../../assets/top2.svg';
import top3 from '../../assets/top3.svg';

function parseToNumber(iquiries) {
  if (!iquiries) {
    return NaN;
  }
  const data = parseFloat(
    iquiries
      .toString()
      .replace(',', '')
      .replace('+', '')
      .replace('$', '')
      .replace(' ', ''),
  );
  return data;
}

function calculateAvgData(array, fixNumber = 2) {
  const data = array.filter((d) => !isNaN(d));
  const sum = data.reduce((a, b) => {
    return a + b;
  }, 0);
  if (sum) {
    if (fixNumber === -1) {
      return parseInt(sum / data.length);
    }
    return parseFloat(sum / data.length).toFixed(fixNumber);
  }
  return NaN;
}

// 优秀同行

const SameIndustryAnalysis = ({ dataSource, handleSelectedCategory }) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [industryList, setIndustryList] = useState([]);

  useEffect(() => {
    getDataList();
  }, [dataSource]);

  const getDataList = () => {
    const IndustryList = [];
    dataSource.forEach((item) => {
      item.effectDataCategoryGrouped &&
        setSelectedCategory(item.effectDataCategoryGrouped[0].category);
      handleSelectedCategory(item.effectDataCategoryGrouped[0].category);
      item.effectData &&
        IndustryList.push({
          list:
            item.effectDataCategoryGrouped?.[0]?.value?.slice(0, 20) ||
            item.effectData.map((item, index) =>
              Object.assign(item, { index: index + 1 }),
            ),
          categoryGrouped: item.effectDataCategoryGrouped,
          keyword: item.keyword,
        });
    });
    setIndustryList(IndustryList);
  };

  function unescapeHTML(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText;
  }

  const summary = (records) => {
    const totalProductCountList = [];
    const pageViewsList = [];
    const iquiriesList = [];
    const transactionNumberList = [];
    const transactionPriceList = [];
    const displayStarLevelList = [];
    const supplierYearList = [];
    records.forEach((item) => {
      totalProductCountList.push(parseToNumber(item.totalProductCount));
      pageViewsList.push(parseToNumber(item.pageViews));
      iquiriesList.push(parseToNumber(item.iquiries));
      transactionNumberList.push(parseToNumber(item.transactionNumber));
      transactionPriceList.push(parseToNumber(item.transactionPrice));
      displayStarLevelList.push(parseToNumber(item.displayStarLevel));
      supplierYearList.push(parseToNumber(item.supplierYear));
    });
    const totalProductCount = calculateAvgData(totalProductCountList, 0);
    const pageViews = calculateAvgData(pageViewsList, 0);
    const iquiries = calculateAvgData(iquiriesList, 0);
    const transactionNumber = calculateAvgData(transactionNumberList, -1);
    const transactionPrice = calculateAvgData(transactionPriceList, 0);
    const displayStarLevel = calculateAvgData(displayStarLevelList, -1);
    const supplierYear = calculateAvgData(supplierYearList, -1);
    const percent = ((iquiries / pageViews) * 100).toFixed(2);
    return (
      <Table.Summary.Row>
        <Table.Summary.Cell colSpan={2} align="center">
          同行平均统计
        </Table.Summary.Cell>
        <Table.Summary.Cell align="center">{totalProductCount}</Table.Summary.Cell>
        <Table.Summary.Cell align="center">{pageViews}</Table.Summary.Cell>
        <Table.Summary.Cell align="center">{iquiries}</Table.Summary.Cell>
        <Table.Summary.Cell align="center">{percent + '%'}</Table.Summary.Cell>
        <Table.Summary.Cell align="center">{transactionNumber}</Table.Summary.Cell>
        <Table.Summary.Cell align="center">{'$' + transactionPrice}</Table.Summary.Cell>
        <Table.Summary.Cell align="center">{displayStarLevel}</Table.Summary.Cell>
        <Table.Summary.Cell align="center">{supplierYear}</Table.Summary.Cell>
      </Table.Summary.Row>
    );
  };

  const columns = [
    {
      title: '排名',
      dataIndex: '',
      align: 'center',
      width: 80,
      render: (text, record, index) => {
        const rankings = {
          1: { src: top1, width: 32, alt: '类目top1', data: '类目top1' },
          2: { src: top2, width: 32, alt: '类目top2', data: '类目top2' },
          3: { src: top3, width: 32, alt: '类目top3', data: '类目top3' },
          4: { src: number4, width: 20, alt: '类目top4', data: '类目top4' },
          5: { src: number5, width: 20, alt: '类目top5', data: '类目top5' },
        };

        const rank = index + 1;
        const ranking = rankings[rank];

        return ranking ? (
          <Tooltip title={ranking.data}>
            <img src={ranking.src} width={ranking.width} alt={ranking.alt} />
          </Tooltip>
        ) : (
          `第${rank}名`
        );
      },
    },
    {
      title: '公司名称',
      dataIndex: '',
      align: 'center',
      render: (v, r) => (
        <div className="company-cell">
          <a href={r.home} target="_blank" rel="noreferrer">
            {r.companyName}
          </a>
          <Tooltip title="同行360分析">
            <SearchOutlined
              onClick={() => {
                if (window.parent) {
                  window.parent.postMessage(
                    {
                      module: 'superman-report',
                      type: 'industry-hot-inquiries',
                      value: r.home,
                    },
                    '*',
                  );
                }
              }}
              className="company-cell-search"
              style={{ marginLeft: '0.25rem' }}
            ></SearchOutlined>
          </Tooltip>
        </div>
      ),
    },
    {
      title: '主营产品',
      dataIndex: 'mainProducts',
      align: 'center',
      render: (v, r) => <span>{unescapeHTML(v)}</span>,
    },
    {
      title: '产品总数',
      dataIndex: 'totalProductCount',
      align: 'center',
    },
    {
      title: '类目访问',
      dataIndex: 'pageViews',
      align: 'center',
    },
    {
      title: '类目询盘',
      dataIndex: 'iquiries',
      align: 'center',
    },
    {
      title: '询盘率',
      align: 'center',
      render: (v, r) => (
        <span>
          {parseFloat(
            (parseToNumber(r.iquiries) / parseToNumber(r.pageViews)) * 100,
          ).toFixed(2) + '%'}
        </span>
      ),
    },
    {
      title: '全店线上订单量',
      dataIndex: 'transactionNumber',
      align: 'center',
    },
    {
      title: '全店线上订单金额',
      dataIndex: 'transactionPrice',
      align: 'center',
      width: 80,
    },
    {
      title: '商家星等级',
      dataIndex: 'displayStarLevel',
      align: 'center',
    },
    {
      title: '供应商年限',
      dataIndex: 'supplierYear',
      align: 'center',
    },
  ];

  return (
    <>
      {industryList?.length &&
        industryList.map((item) => (
          <div key={Math.random()}>
            <Typography.Title level={4}>
              {item?.categoryGrouped?.length && (
                <span
                  style={{
                    fontWeight: 'normal',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  访客，询盘为该店铺在
                  <Space>
                    <Select
                      size="small"
                      style={{ width: '200px' }}
                      value={selectedCategory}
                      onChange={(val) => {
                        setSelectedCategory(val);
                        handleSelectedCategory(val);
                        item.list = item.categoryGrouped
                          ?.find((item) => item.category === val)
                          ?.value?.slice(0, 20);
                      }}
                    >
                      {item?.categoryGrouped?.map((item) => (
                        <Select.Option key={item.category} value={item.category}>
                          {item.category}
                        </Select.Option>
                      ))}
                    </Select>
                  </Space>
                  类目下近 6
                  个月数据。如需查询全店所有类目询盘数，可点击公司名称右侧放大镜查询。
                </span>
              )}
            </Typography.Title>

            <Table
              dataSource={item.list}
              bordered
              pagination={false}
              summary={summary}
              columns={columns}
              rowKey={Math.random}
            />
          </div>
        ))}
    </>
  );
};

export default SameIndustryAnalysis;
