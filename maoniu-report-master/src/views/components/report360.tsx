import { Checkbox, Col, Input, Row } from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import type { CheckboxValueType } from 'antd/es/checkbox/Group';
import React from 'react';

interface OptionType {
  label: string;
  id: string;
  value: string;
  children?: OptionType[];
}

export const options: OptionType[] = [
  { label: '基础操作检查', id: 'conclusion', value: 'conclusion' },
  { label: '周数据详细记录', id: 'wholeDataDetail', value: 'wholeDataDetail' },

  // { label: '橱窗信保', id: 'showcaseTable', value: 'showcaseTable' },
  {
    label: '哪个直通车计划转化成本太高要暂停？',
    id: 'p4pDataAnalyse',
    value: 'p4pDataAnalyse',
  },
  { label: '重点产品是否要调整?', id: 'productAnalyse', value: 'productAnalyse' },
  {
    label: '商机质量到底怎样?',
    id: 'feedbackAnalyse',
    value: 'feedbackAnalyse',
    // children: [
    //   {
    //     label: '询盘明细',
    //     id: 'feedbackDetails',
    //     value: 'feedbackDetails',
    //   },
    // ],
  },
  // { label: '员工绩效', id: 'businessAnalyse', value: 'businessAnalyse' },
  {
    label: '同行top20排行榜',
    id: 'sameIndustryAnalyse',
    value: 'sameIndustryAnalyse',
  },
  // {
  //   label: '热品top20排行榜',
  //   id: 'topSaleRankProduct',
  //   value: 'topSaleRankProduct',
  // },
];

interface ReportProps {
  onlyShow?: string;
}
export default class Report360 extends React.Component<ReportProps> {
  constructor(props: ReportProps | Readonly<ReportProps>) {
    super(props);
  }
  state = {
    checkedList: this.props.onlyShow
      ? [this.props.onlyShow]
      : [
          'conclusion',
          'p4pDataAnalyse',
          'productAnalyse',
          'feedbackAnalyse',
          'wholeDataDetail',
          'sameIndustryAnalyse',
          // 'topSaleRankProduct',
        ],
    keywords: '',
    checkAll: false,
  };

  onChange = (checkedValues: CheckboxValueType[]) => {
    this.setState({
      checkedList: checkedValues,
    });
  };
  onCheckAllChange = (e: CheckboxChangeEvent) => {
    this.setState({
      checkAll: e.target.checked,
    });
    if (e.target.checked) {
      this.setState({
        checkedList: options.map((m) => m.value),
      });
    } else {
      this.setState({
        checkedList: [],
      });
    }
  };

  render() {
    const { keywords, checkAll, checkedList } = this.state;
    const { onlyShow } = this.props;
    return (
      <div>
        {!onlyShow ? (
          <Row>
            <Checkbox onChange={this.onCheckAllChange} checked={checkAll} defaultChecked>
              Check all
            </Checkbox>
          </Row>
        ) : null}

        <Checkbox.Group onChange={this.onChange} value={checkedList}>
          <Row>
            {options
              .filter((item) => !onlyShow || item.id === onlyShow)
              .map((item, index) => (
                <Col span={24} key={item.id}>
                  <p style={{ margin: '.5rem 0' }}>
                    <Checkbox value={item.value}>{item.label}</Checkbox>

                    {item.children?.map((m) => {
                      return (
                        <Checkbox value={m.value} key={m.id}>
                          {m.label}
                        </Checkbox>
                      );
                    })}
                  </p>
                </Col>
              ))}
          </Row>
        </Checkbox.Group>
        <Input
          value={keywords}
          onChange={(event) => this.setState({ keywords: event.target.value })}
          placeholder="请输入关键词"
        />
      </div>
    );
  }
}
