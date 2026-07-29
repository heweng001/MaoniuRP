import { Checkbox, Col, Input, Row } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { CheckboxValueType } from 'antd/es/checkbox/Group';
import React from 'react';

const options = [
  { label: '叶子类目Top同行', id: 'sameIndustryAnalyse', value: 'sameIndustryAnalyse' },
  { label: '高询盘产品', id: 'highInquiryProductList', value: 'highInquiryProductList' },
  {
    label: '类目询盘榜',
    id: 'popularProductHighInquiry',
    value: 'popularProductHighInquiry',
  },
  {
    label: '类目销量榜',
    id: 'popularProductHotSelling',
    value: 'popularProductHotSelling',
  },
];

export default class IndustryReport extends React.Component {
  state = {
    checkedList: options.map((m) => m.value),
    keywords: '',
    sameIndustryService: true,
    sameIndustryUrl: '',
    checkAll: true,
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
        sameIndustryService: true,
      });
    } else {
      this.setState({
        checkedList: [],
        sameIndustryService: false,
      });
    }
  };

  render() {
    const { keywords, sameIndustryService, sameIndustryUrl, checkedList, checkAll } =
      this.state;
    return (
      <div>
        <Row>
          <Checkbox onChange={this.onCheckAllChange} checked={checkAll} defaultChecked>
            Check all
          </Checkbox>
        </Row>
        <Checkbox.Group
          style={{ width: '100%' }}
          onChange={this.onChange}
          value={checkedList}
        >
          <Row>
            {options.map((item) => (
              <Col span={6} key={item.id}>
                <p style={{ margin: '1rem 0' }}>
                  <Checkbox value={item.value}>{item.label}</Checkbox>
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
        <p style={{ margin: '1rem 0' }}>
          <Checkbox
            value={sameIndustryService}
            checked={sameIndustryService}
            defaultChecked
            onChange={(event) =>
              this.setState({ sameIndustryService: event.target.checked })
            }
          >
            同行分析
          </Checkbox>
        </p>
        <Input.TextArea
          style={{ height: 120 }}
          value={sameIndustryUrl}
          onChange={(event) => this.setState({ sameIndustryUrl: event.target.value })}
          placeholder="请输入对标同行首页网址，一行一个，最多五个。"
        />
      </div>
    );
  }
}
