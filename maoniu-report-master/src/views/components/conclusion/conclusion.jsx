import { Button, Input, Typography } from 'antd';
import React, { Component } from 'react';
const { Title } = Typography;
import './conclusion.less';

import {
  CheckCircleFilled,
  DeleteOutlined,
  EditOutlined,
  InfoCircleFilled,
} from '@ant-design/icons';

export default class ReportConclusion extends Component {
  state = {
    showSaveBtn: false,
    showData: false,
    badItems: [],
    goodItems: [],
    compareItems: [],
    show: {
      badItems: true,
      goodItems: true,
      compareItems: true,
      conclusion: true,
    },
    editBadStatus: {},
    editGoodStatus: {},
    editCompareState: {},
    editData: {
      sg: '以下项目操作异常，建议优化',
      nd: '需要您配合',
      kp: '以下项目操作良好，请继续保持',
      rd: '操作记录',
    },
    sgShow: false,
    ndShow: false,
    kpShow: false,
    rdShow: false,
  };

  componentDidMount = () => {
    const { dataSource } = this.props;
    if (dataSource) {
      const items = [];
      for (const [key, value] of Object.entries(dataSource)) {
        if (key !== '_compare' && value) {
          items.push({
            key,
            value,
          });
        }
      }
      const goodItems = items
        .filter((f) => f?.value?.result)
        .filter((f) => f?.value?.message);
      const badItems = items
        .filter((f) => !f?.value?.result)
        .filter((f) => f?.value?.message);
      const compareItems = [];
      const compare = dataSource['_compare'];
      if (compare) {
        for (const [key, value] of Object.entries(compare)) {
          compareItems.push({
            key,
            value,
          });
        }
      }
      this.setState({
        showData: true,
        goodItems,
        badItems,
        compareItems,
      });
    }
  };

  saveChanges = () => {
    const { dataSource } = this.props;
    this.props.saveData('conclusion', dataSource);
    this.setState({ showSaveBtn: false });
  };
  handleEdit = (item, type) => {
    if (type === 'compareItem') {
      this.setState({ editCompareState: { [item.key]: true } });
    }
    if (type === 'badItem') {
      this.setState({ editBadStatus: { [item.key]: true } });
    }
    if (type === 'goodItem') {
      this.setState({ editGoodStatus: { [item.key]: true } });
    }
    this.setState({
      showSaveBtn: true,
    });
  };

  handleDelete = (item, index, type) => {
    const { badItems, goodItems, compareItems } = this.state;
    if (type === 'compareItem') {
      this.deleteItem(compareItems, item, index);
    }
    if (type === 'badItem') {
      this.deleteItem(badItems, item, index);
    }
    if (type === 'goodItem') {
      this.deleteItem(goodItems, item, index);
    }
    this.setState({ showSaveBtn: true });
  };

  deleteItem = (data, item, index) => {
    const { dataSource } = this.props;
    data.splice(index, 1);
    if (dataSource[item.key]) {
      delete dataSource[item.key];
    } else {
      delete dataSource['_compare'][item.key];
    }
  };

  handleToSaveEditValue = (e, item, type, index) => {
    if (!e.target.value) {
      this.handleDelete(item, index, type);
    }
    const {
      compareItems,
      badItems,
      goodItems,
      editCompareState,
      editBadStatus,
      editGoodStatus,
    } = this.state;
    if (type === 'compareItem') {
      this.setState({
        editCompareState: { [item.key]: false },
      });
      this.editItems(compareItems, item, e, editCompareState);
    }
    if (type === 'badItem') {
      this.setState({
        editBadStatus: { [item.key]: false },
      });
      this.editItems(badItems, item, e, editBadStatus);
    }
    if (type === 'goodItem') {
      this.setState({
        editGoodStatus: { [item.key]: false },
      });
      this.editItems(goodItems, item, e, editGoodStatus);
    }
  };

  editItems = (data, item, e) => {
    const { dataSource } = this.props;
    for (const name of data) {
      if (name.key === item.key) {
        if (name?.value?.message) {
          name.value.message = e.target.value;
          dataSource[item.key].message = item.value.message;
        } else {
          name.value = e.target.value;
          dataSource['_compare'][item.key] = item.value;
        }
      }
    }
  };

  render() {
    return (
      <div className="wrapper">
        <h1>
          {this.state.showSaveBtn ? (
            <Button
              type="primary"
              style={{ verticalAlign: 'middle' }}
              onClick={() => {
                this.saveChanges();
              }}
            >
              保存修改
            </Button>
          ) : null}
        </h1>
        {this.state.showData ? (
          <div id="pdfDom" className="content" style={{ fontSize: '16px' }}>
            {/*操作记录*/}
            {this.props.reportSource === 'AI' && (
              <div
                style={{
                  width: '100%',
                }}
              >
                <Title level={4}>{this.state.editData.rd}</Title>
                {this.state.compareItems.map((item, index) => (
                  <div key={item.key}>
                    {this.state.show['compareItems'] ? (
                      <div>
                        <div key={item.key} className="text item">
                          <div>
                            {this.state.editCompareState[item.key] ? (
                              <Input
                                ref={(input) => {
                                  if (input != null) {
                                    input.focus();
                                  }
                                }}
                                defaultValue={item.value}
                                onBlur={(e) => {
                                  this.handleToSaveEditValue(
                                    e,
                                    item,
                                    'compareItem',
                                    index,
                                  );
                                }}
                              />
                            ) : (
                              <div>
                                <div>
                                  <InfoCircleFilled
                                    style={{ color: '#1e90ff', marginRight: '10px' }}
                                  />
                                  <span
                                    onDoubleClick={() =>
                                      this.handleEdit(item, 'compareItem')
                                    }
                                    dangerouslySetInnerHTML={{ __html: item.value }}
                                  />
                                  <span className="btn_group">
                                    <span className="btn_item">
                                      <EditOutlined
                                        onClick={() => {
                                          this.handleEdit(item, 'compareItem');
                                        }}
                                      />
                                      <DeleteOutlined
                                        style={{
                                          color: 'red',
                                        }}
                                        onClick={() =>
                                          this.handleDelete(item, index, 'compareItem')
                                        }
                                      />
                                    </span>
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            {/*建议优化*/}
            <div
              style={{
                width: '100%',
              }}
            >
              <Title level={4}>{this.state.editData.sg}</Title>
              {this.state.badItems.map((item, index) => (
                <div key={item.key}>
                  {this.state.show['badItems'] ? (
                    <div>
                      <div key={item.key} className="text item">
                        <div>
                          {this.state.editBadStatus[item.key] ? (
                            <Input
                              ref={(input) => {
                                if (input != null) {
                                  input.focus();
                                }
                              }}
                              defaultValue={item.value.message}
                              onBlur={(e) => {
                                this.handleToSaveEditValue(e, item, 'badItem', index);
                              }}
                            />
                          ) : (
                            <span>
                              <span>
                                <InfoCircleFilled
                                  style={{ color: '#e6a23c', marginRight: '10px' }}
                                />
                                <span
                                  onDoubleClick={() => this.handleEdit(item, 'badItem')}
                                  dangerouslySetInnerHTML={{ __html: item.value.message }}
                                />
                                <span className="btn_group">
                                  <span className="btn_item">
                                    <EditOutlined
                                      onClick={() => {
                                        this.handleEdit(item, 'badItem');
                                      }}
                                    />
                                    <DeleteOutlined
                                      style={{
                                        color: 'red',
                                      }}
                                      onClick={() =>
                                        this.handleDelete(item, index, 'badItem')
                                      }
                                    />
                                  </span>
                                </span>
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            {/*操作良好*/}
            <div
              style={{
                width: '100%',
              }}
            >
              <Title level={4}>{this.state.editData.kp}</Title>
              {this.state.goodItems.map((item, index) => (
                <div key={item.key}>
                  {this.state.show['goodItems'] ? (
                    <div>
                      <div key={Math.random()} className="text item">
                        <div>
                          {this.state.editGoodStatus[item.key]}
                          {this.state.editGoodStatus[item.key] ? (
                            <Input
                              ref={(input) => {
                                if (input != null) {
                                  input.focus();
                                }
                              }}
                              defaultValue={item.value.message}
                              onBlur={(e) => {
                                this.handleToSaveEditValue(e, item, 'goodItem', index);
                              }}
                            />
                          ) : (
                            <span>
                              <span>
                                <CheckCircleFilled
                                  style={{ color: '#67c23a', marginRight: '10px' }}
                                />
                                <span
                                  onDoubleClick={() => this.handleEdit(item, 'goodItem')}
                                  dangerouslySetInnerHTML={{ __html: item.value.message }}
                                />
                                <span className="btn_group">
                                  <span className="btn_item">
                                    <EditOutlined
                                      onClick={() => {
                                        this.handleEdit(item, 'goodItem');
                                      }}
                                    />
                                    <DeleteOutlined
                                      style={{
                                        color: 'red',
                                      }}
                                      onClick={() => {
                                        this.handleDelete(item, index, 'goodItem');
                                      }}
                                    />
                                  </span>
                                </span>
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }
}
