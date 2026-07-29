import './cacheDetail.less';

import { Button, Form, Input, Modal, Select, Space, Table, Tag } from 'antd';
import { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import moment from 'moment';
import PropTypes from 'prop-types';
import React from 'react';

import ReportApi from '@/api/report';
import notify from '@/utils/notify';
import { isArray, isJson } from '@/utils/util';

type params = {
  [key: string]: any;
};
const { Option } = Select;

interface DataType {
  creator?: string;
  shopName?: string;
  createdDate: string;
  ip: string;
  reportSource: string;
  version: string;
  reportType: string;
  keyword: string;
  industryCategory: string;
  inquiryNum: string;
  completeReport: string;
  success: boolean;
}
interface itemProps {
  startDetailReport: any;
  endDetailReport: any;
  getDetailReport: any;
  reportSource: string;
  reportType: string;
  creator: string;
  shopName: string;
}

export default class CacheDetail extends React.Component<itemProps> {
  static propTypes = {
    getDetailReport: PropTypes.func.isRequired,
    reportSource: PropTypes.string.isRequired,
    creator: PropTypes.string.isRequired,
    shopName: PropTypes.string.isRequired,
  };

  state = {
    isModalOpen: false,
    form: {
      shopName: '',
      reportSource: '',
      success: '',
      creator: '',
    },
    data: [],
    pagination: {
      current: 1,
      pageSize: 20,
      total: 0,
    },
    successRateInfo: {},
    ipCountInfo: {},
  };
  componentDidMount = () => {};
  search = async () => {
    const {
      form,
      pagination: { current, pageSize: size },
    } = this.state;
    const params = {
      ...form,
      current,
      size,
      reportType: this.props.reportType,
    };
    const { creator, shopName } = this.props;
    if (this.isFormMarketing()) {
      if (!params.creator) {
        params.creator = creator;
      }
    } else {
      if (!params.shopName) {
        params.shopName = shopName;
      }
    }

    return ReportApi.getReportList(params)
      .then((res) => {
        const {
          data: { current, total, records, size },
        } = res;
        this.setState({
          data: records,
          pagination: {
            current,
            total,
            pageSize: size,
          },
        });
      })
      .catch((err) => {
        notify.error(`获取缓存明细数据失败了: ${err}`);
      });
  };
  getReportSuccessRate = async () => {
    return ReportApi.getReportSuccessRate()
      .then((res) => {
        this.setState({
          successRateInfo: res.data,
        });
      })
      .catch((err) => {
        notify.error(`获取诊断记录成功率失败了: ${err}`);
      });
  };
  getRecentHourIpCount = async () => {
    return ReportApi.getRecentHourIpCount()
      .then((res) => {
        this.setState({
          ipCountInfo: res.data,
        });
      })
      .catch((err) => {
        notify.error(`获取近期使用IP失败了: ${err}`);
      });
  };
  reset = async () => {
    await this.setState({
      form: {
        shopName: '',
        reportSource: '',
        success: '',
      },
      pagination: {
        current: 1,
        pageSize: 20,
        total: 0,
      },
    });
    await this.search();
  };
  showModal = async () => {
    this.setState({
      isModalOpen: true,
    });
    const { creator, shopName } = this.props;
    if (this.isFormMarketing()) {
      await this.setState({
        form: { ...this.state.form, creator },
      });
    } else {
      await this.setState({
        form: { ...this.state.form, shopName },
      });
    }
    await this.search();
    if (this.isFormMarketing()) {
      await this.getReportSuccessRate();
      await this.getRecentHourIpCount();
    }
  };

  handleOk = () => {
    this.setState({
      isModalOpen: false,
    });
  };
  handleTableChange = async (pagination: TablePaginationConfig) => {
    await this.setState({
      pagination,
    });
    await this.search();
  };
  getColumnsValue = (val: string) => {
    return isJson(val) && isArray(JSON.parse(val)) ? JSON.parse(val)[0] : '';
  };
  handleDetailReport = async (id: number) => {
    this.handleOk();
    this.props.startDetailReport();
    return ReportApi.getReportDetail(id)
      .then((res) => {
        this.props.getDetailReport(res.data);
      })
      .catch((err) => {
        notify.error(`获取报告内容失败了:${err.response.data?.message}`);
      })
      .finally(() => {
        this.props.endDetailReport();
      });
  };
  isFormMarketing = () => {
    return this.props.reportSource === 'MARKETING';
  };

  render() {
    const { isModalOpen, form, data, pagination, successRateInfo, ipCountInfo }: params =
      this.state;
    let columns: ColumnsType<DataType> = [
      {
        title: '生成者',
        dataIndex: 'creator',
        align: 'center',
      },
      {
        title: '店铺名',
        dataIndex: 'shopName',
        align: 'center',
        ellipsis: true,
        showSorterTooltip: true,
      },
      {
        title: '生成时间',
        dataIndex: 'createdDate',
        align: 'center',
        render: (createdDate) => moment(createdDate).format('MM-DD HH:mm'),
      },
      {
        title: 'IP',
        dataIndex: 'ip',
        align: 'center',
        ellipsis: true,
        showSorterTooltip: true,
      },
      // {
      //   title: '来源',
      //   dataIndex: 'reportSource',
      //   align: 'center',
      //   render: (reportSource) => (
      //     <span>{reportSource === 'AI' ? '操盘手' : '外贸超人'}</span>
      //   ),
      // },
      {
        title: '版本',
        dataIndex: 'version',
        align: 'center',
        render: (version) => <Tag color="success">{version}</Tag>,
      },
      {
        title: '报告类型',
        dataIndex: 'reportType',
        align: 'center',
        render: (reportType) => (
          <span>
            {reportType === 'diagnosisReport' || reportType === 'report360'
              ? '我的店铺360复盘'
              : reportType === 'industryReport'
              ? '询盘top20店铺明细表'
              : reportType === 'productReport'
              ? '询盘top20产品明细表'
              : ''}
          </span>
        ),
      },
      {
        title: '关键词',
        dataIndex: 'keyword',
        align: 'center',
        ellipsis: true,
        showSorterTooltip: true,
        render: (keyword) => this.getColumnsValue(keyword),
      },
      {
        title: '行业类目',
        dataIndex: 'industryCategory',
        align: 'center',
        ellipsis: true,
        showSorterTooltip: true,
        render: (industryCategory) => this.getColumnsValue(industryCategory),
      },
      // {
      //   title: '询盘数',
      //   dataIndex: 'inquiryNum',
      //   align: 'center',
      // },
      // {
      //   title: '完整度',
      //   dataIndex: 'completeReport',
      //   align: 'center',
      //   render: (completeReport) =>
      //     completeReport === 'incomplete' ? (
      //       <Tag color="warning">不完整</Tag>
      //     ) : (
      //       <Tag color="success">完整</Tag>
      //     ),
      // },
      {
        title: '状态',
        dataIndex: 'success',
        align: 'center',
        render: (success) =>
          success ? <Tag color="success">成功</Tag> : <Tag color="error">失败</Tag>,
      },
      // {
      //   title: '其他信息',
      //   dataIndex: 'name',
      //   align: 'center',
      //   ellipsis: true,
      //   showSorterTooltip: true,
      // },
      {
        title: '报告内容',
        dataIndex: '',
        align: 'center',
        render: (row) => (
          <span
            style={{
              color: '#1890ff',
              cursor: 'pointer',
            }}
            onClick={() => this.handleDetailReport(row.id)}
          >
            查看报告
          </span>
        ),
      },
    ];
    if (this.isFormMarketing()) {
      columns = columns.filter((f) => f.title !== '店铺名');
    } else {
      columns = columns.filter((f) => f.title !== '生成者');
    }
    return (
      <>
        <Modal
          title="缓存明细"
          width="80%"
          open={isModalOpen}
          onOk={this.handleOk}
          onCancel={this.handleOk}
          maskClosable={false}
          keyboard={false}
          mask={false}
          footer={[]}
        >
          <div className="container">
            {this.isFormMarketing() && (
              <>
                <h2>诊断记录成功率</h2>
                <div>
                  <span>近期(天): {successRateInfo.dayRate}</span>
                  <span>近期(周): {successRateInfo.weekRate}</span>
                  <span>近期(月): {successRateInfo.monthRate}</span>
                  <span>总成功率: {successRateInfo.totalRate}</span>
                </div>
                <div
                  style={{
                    marginTop: '1rem',
                  }}
                >
                  <span>数量(天): {successRateInfo.dayNumber}</span>
                  <span>数量(周): {successRateInfo.weekNumber}</span>
                  <span>数量(月): {successRateInfo.monthNumber}</span>
                  <span>总数量: {successRateInfo.totalNumber}</span>
                </div>
                {Object.values(ipCountInfo)?.length ? (
                  <div
                    style={{
                      textAlign: 'center',
                    }}
                  >
                    <h2>IP使用次数(近一小时)</h2>
                    {Object.entries(ipCountInfo).map((item, index) => (
                      <span key={index}>
                        {item[0]}: {item[1]}
                      </span>
                    ))}
                  </div>
                ) : (
                  ''
                )}
              </>
            )}
            <h2>诊断记录</h2>
            <div className="nav">
              <Form size="small" layout="inline">
                {this.isFormMarketing() ? (
                  <Form.Item label="生成用户" name="creator">
                    <Input
                      value={form.creator}
                      onChange={(event) =>
                        this.setState({
                          form: { ...form, creator: event.target.value },
                        })
                      }
                      placeholder="生成用户"
                      allowClear
                    />
                  </Form.Item>
                ) : (
                  <Form.Item label="店铺名" name="shopName">
                    <Input
                      value={form.shopName}
                      onChange={(event) =>
                        this.setState({
                          form: { ...form, shopName: event.target.value },
                        })
                      }
                      placeholder="生成用户"
                      allowClear
                    />
                  </Form.Item>
                )}
                <Form.Item label="来源" name="reportScore">
                  <Select
                    style={{ width: '11.25rem' }}
                    onChange={(value) =>
                      this.setState({
                        form: { ...form, reportSource: value },
                      })
                    }
                    value={form.reportSource}
                    placeholder="请选择"
                    allowClear
                  >
                    <Option value="AI">操盘手</Option>
                    <Option value="MARKETING">外贸超人</Option>
                  </Select>
                </Form.Item>
                <Form.Item label="状态" name="success">
                  <Select
                    style={{ width: '11.25rem' }}
                    onChange={(value) =>
                      this.setState({
                        form: { ...form, success: value },
                      })
                    }
                    value={form.success}
                    placeholder="请选择"
                    allowClear
                  >
                    <Option value="1">成功</Option>
                    <Option value="0">失败</Option>
                  </Select>
                </Form.Item>
                <Form.Item>
                  <Space>
                    <Button type="primary" onClick={this.search}>
                      查询
                    </Button>
                    <Button onClick={this.reset}>重置</Button>
                  </Space>
                </Form.Item>
              </Form>
            </div>
            <div className="content_table">
              <Table
                columns={columns}
                dataSource={data}
                pagination={pagination}
                onChange={this.handleTableChange}
                size="small"
                rowKey="id"
                bordered
              />
            </div>
          </div>
        </Modal>
      </>
    );
  }
}
