import { Table, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import React from 'react';

interface CampaignInfo {
  [key: string]: any; // 索引签名
  id?: number;
  title?: string;
  impr?: number;
  impsCnt?: number;
  click?: number;
  clickCnt?: number;
  cpc?: number;
  cost?: number;
  mcFbUv?: number;
  mcUv?: number;
  atmFbUv?: number;
  atmUv?: number;
  type?: string;
  onlineStatus?: number;
}

interface PropsType {
  dataSource: CampaignInfo[];
}

/**
 * 近四周推广计划
 */
class CampaignAnalyseData extends React.Component<PropsType> {
  componentDidMount = () => {
    console.log(this.props.dataSource);
  };

  getTableData = () => {
    const { dataSource } = this.props;
    const summaryItem: { [key: string]: string | number | undefined } = { title: '合计' };
    dataSource.forEach((item) => {
      Object.keys(item).forEach((key: string) => {
        if (key === 'title') return;
        if (key === 'type') return;
        let itemValue = item[key];
        if (
          key === 'ctr' ||
          key === 'businessLeadsRate' ||
          key === 'cpf2' ||
          key === 'cpc'
        ) {
          itemValue = Number((itemValue / dataSource.length).toFixed(2));
        }
        if (!summaryItem[key]) {
          summaryItem[key] = itemValue;
        } else {
          summaryItem[key] += itemValue;
        }
      });
    });
    return [...dataSource, summaryItem];
  };
  render() {
    const { dataSource } = this.props;

    const columns: ColumnsType<CampaignInfo> = [
      {
        title: '计划名称',
        // dataIndex: 'title',
        align: 'center',
        ellipsis: true,
        width: '300px',
        showSorterTooltip: true,
        render: (row) => (
          <Typography.Text ellipsis>
            {row.title}
            {row.onlineStatus === 0 ? '(已暂停)' : ''}
          </Typography.Text>
        ),
      },
      {
        title: '计划类型',
        dataIndex: 'type',
        align: 'center',
      },
      {
        title: '花费',
        align: 'center',
        render: (row) => <span>{row.cost?.toFixed(0) || '/'}</span>,
      },
      {
        title: 'P4P曝光',
        // dataIndex: 'impr',
        align: 'center',
        render: (row) => <span>{row?.impsCnt || row?.impr}</span>,
      },
      {
        title: 'P4P点击',
        // dataIndex: 'click',
        align: 'center',
        render: (row) => <span>{row?.clickCnt || row?.click}</span>,
      },
      {
        title: 'P4P点击率',
        align: 'center',
        render: (row) => (
          <span>
            {(row?.ctr?.toFixed(2) || ((row.click / row.impr) * 100).toFixed(2)) + '%'}
          </span>
        ),
      },
      {
        title: '询盘',
        // dataIndex: 'mcFbUv',
        align: 'center',
        render: (row) => <span>{row.mcUv || row.mcFbUv}</span>,
      },
      {
        title: 'TM',
        // dataIndex: 'atmFbUv',
        align: 'center',
        render: (row) => <span>{row.atmUv || row.atmFbUv}</span>,
      },
      {
        title: '商机率',
        align: 'center',
        render: (row) => (
          <span>
            {(row.businessLeadsRate?.toFixed(2) ||
              (((row.mcFbUv + row.atmFbUv) / row.click) * 100).toFixed(0)) + '%'}
          </span>
        ),
      },
      {
        title: '平均点击花费',
        align: 'center',
        render: (row) => (
          <span>{row.cpc.toFixed(2) || (row.cost / row.click).toFixed(2)}</span>
        ),
      },
      {
        title: '直通车转化成本',
        align: 'center',
        render: (row) => (
          <span style={{ fontWeight: 'bold' }}>{row?.cpf2?.toFixed(2)}</span>
        ),
      },
    ];
    return (
      <div>
        <Typography.Title
          style={{
            margin: '.5rem 0',
          }}
          level={4}
        >
          哪个直通车计划转化成本太高要暂停？
        </Typography.Title>
        <Table
          rowKey="title"
          size="small"
          pagination={false}
          columns={columns}
          bordered
          dataSource={this.getTableData()}
        />
      </div>
    );
  }
}
export default CampaignAnalyseData;
