import { Table, Typography } from 'antd';
import React, { Component } from 'react';

// import { getNested } from '@/utils/util';
import style from './productCoversionDataTable.less';
const { Title } = Typography;
// const extractPrice = (product) => {
//   let price = getNested(
//     product,
//     'priceInfo',
//     'price',
//     'productRangePrices',
//     'priceRangeText',
//   );
//   if (!price) {
//     price = getNested(product, 'priceInfo', 'price', 'formatLadderPrice');
//   }
//   return price;
// };
// const extractFob = (product) => {
//   const fob =
//     getNested(product, 'priceInfo', 'moq') +
//     ' ' +
//     getNested(product, 'priceInfo', 'price', 'unit');
//   return fob;
// };

class ProductConversionDataTable extends Component {
  // highImpOrClickLData() {
  //   if (this.props.dataSource.clickRateAbnormal) {
  //     return this.props.dataSource.highSearchImpsWordEffect;
  //   } else {
  //     return this.props.dataSource.highClickWordEffect;
  //   }
  // }
  //
  // highImpOrClickLabel() {
  //   if (this.props.dataSource.clickRateAbnormal) {
  //     return '高曝光词及近4周数据（曝光，直通车曝光，点击，直通车点击）';
  //   } else {
  //     return '高点击词及近4周数据（曝光，直通车曝光，点击，直通车点击）';
  //   }
  // }

  render() {
    const tableColumn = [
      {
        title: '产品信息',
        dataIndex: 'subject',
        align: 'center',
        render: (dom, record) => (
          <div>
            <a href={this.props.dataSource.detailURL} target="_blank" rel="noreferrer">
              <img src={record.imageURL} alt="" />
            </a>
            <p style={{ color: '#8a8484' }}>产品ID:{this.props.dataSource.id}</p>
          </div>
        ),
      },
      {
        title: '产品数据(近四周)',
        dataIndex: 'subject',
        align: 'center',
        render: (dom, record) => (
          <div className={style['product-data']}>
            <p>
              <span className="mgr-5">FOB: {this.props.dataSource.price}</span>
              <span className="mgr-5">MOQ: {this.props.dataSource.moq}</span>
            </p>
            <p>
              <span className="mgr-5">曝光: {this.props.dataSource.sumProdShowNum}</span>
              <span className="mgr-5">点击: {this.props.dataSource.sumProdClickNum}</span>
              <span className="mgr-5">
                访问人数: {this.props.dataSource.sumProdVisitorCnt}
              </span>
            </p>
            <p>
              <span className="mgr-5">
                询盘个数: {this.props.dataSource.sumProdFbNum}
              </span>
              <span className="mgr-5">TM人数: {this.props.dataSource.tmUv}</span>
              <span className="mgr-5">订单个数: {this.props.dataSource.crtOrd}</span>
            </p>
            <p>
              <span className="mgr-5">点击率: {this.props.dataSource.clickRate}</span>
              <span className="mgr-5">
                点击询盘率: {this.props.dataSource.clickFbRate}
              </span>
              <span className="mgr-5">
                访客询盘率: {this.props.dataSource.visitFbRate}
              </span>
            </p>
          </div>
        ),
      },
      {
        title: (dom, record) => (
          <div>
            <p style={{ textAlign: 'center' }}>效果来源词及词近4周数据</p>
            <p style={{ textAlign: 'center' }}>
              (点击，直通车点击，访问人数，店内询盘人数，店内TM人数)
            </p>
          </div>
        ),
        dataIndex: '',
        render: (dom, record) => (
          <div>
            {this.props.dataSource.effectSourceWords ? (
              <div>
                {this.props.dataSource.effectSourceWords.map((item) => (
                  <p key={Math.random()}>
                    <a
                      href={`https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&CatId=&SearchText=${item.searchKeyword}`}
                    >
                      {item.searchKeyword}{' '}
                    </a>{' '}
                    ({item.searchClicks},{item.p4pClickCnt},{item.detailUv},{item.fbUv},
                    {item.tmUv})
                  </p>
                ))}
              </div>
            ) : (
              ''
            )}
          </div>
        ),
      },
    ];
    const tableColumnsBefore = [
      {
        title: '产品信息',
        dataIndex: 'subject',
        align: 'center',
        render: (dom, record) => (
          <div>
            <a href={this.props.dataSource.detailURL} target="_blank" rel="noreferrer">
              <img src={record.imageURL} alt="" />
            </a>
            <p style={{ color: '#8a8484' }}>产品ID:{this.props.dataSource.id}</p>
          </div>
        ),
      },
      {
        title: '产品数据',
        dataIndex: 'subject',
        align: 'center',
        children: [
          {
            title: '',
            dataIndex: '',
            align: 'center',
            children: [
              {
                title: '近4周',
                dataIndex: 'sumShowCnt',
                align: 'center',
                children: [
                  {
                    title: (dom, record) => (
                      <p>
                        <span className="mgr-5">FOB: {this.props.dataSource.price}</span>
                        <span className="mgr-5">MOQ: {this.props.dataSource.moq}</span>
                      </p>
                    ),
                    render: (dom, record) => (
                      <div className={style['product-data']}>
                        <p>
                          <span className="mgr-5">
                            曝光: {this.props.dataSource.sumProdShowNum}
                          </span>
                          <span className="mgr-5">
                            点击: {this.props.dataSource.sumProdClickNum}
                          </span>
                          <span className="mgr-5">
                            访问人数: {this.props.dataSource.sumProdVisitorCnt}
                          </span>
                        </p>
                        <p>
                          <span className="mgr-5">
                            询盘个数: {this.props.dataSource.sumProdFbNum}
                          </span>
                          <span className="mgr-5">
                            TM人数: {this.props.dataSource.tmUv}
                          </span>
                          <span className="mgr-5">
                            订单个数: {this.props.dataSource.crtOrd}
                          </span>
                        </p>
                        <p>
                          <span className="mgr-5">
                            点击率: {this.props.dataSource.clickRate}
                          </span>
                          <span className="mgr-5">
                            点击询盘率: {this.props.dataSource.clickFbRate}
                          </span>
                        </p>
                        <p>
                          <span className="mgr-5">
                            访客询盘率: {this.props.dataSource.visitFbRate}
                          </span>
                        </p>
                      </div>
                    ),
                    align: 'center',
                  },
                ],
              },
              {
                title: '前4周',
                dataIndex: 'sumClickCnt',
                align: 'center',
                children: [
                  {
                    title: (dom, record) => (
                      <p>
                        <span className="mgr-5">FOB: {this.props.dataSource.price}</span>
                        <span className="mgr-5">MOQ: {this.props.dataSource.moq}</span>
                      </p>
                    ),
                    render: (dom, record) => (
                      <div className={style['product-data']}>
                        <p>
                          <span className="mgr-5">
                            曝光: {this.props.dataSource.beforeWeeks.sumProdShowNum}
                          </span>
                          <span className="mgr-5">
                            点击: {this.props.dataSource.beforeWeeks.sumProdClickNum}
                          </span>
                          <span className="mgr-5">
                            访问人数:{' '}
                            {this.props.dataSource.beforeWeeks.sumProdVisitorCnt}
                          </span>
                        </p>
                        <p>
                          <span className="mgr-5">
                            询盘个数: {this.props.dataSource.beforeWeeks.sumProdFbNum}
                          </span>
                          <span className="mgr-5">
                            TM人数: {this.props.dataSource.beforeWeeks.tmUv}
                          </span>
                          <span className="mgr-5">
                            订单个数: {this.props.dataSource.beforeWeeks.crtOrd}
                          </span>
                        </p>
                        <p>
                          <span className="mgr-5">
                            点击率: {this.props.dataSource.beforeWeeks.clickRate}
                          </span>
                          <span className="mgr-5">
                            点击询盘率: {this.props.dataSource.beforeWeeks.clickFbRate}
                          </span>
                        </p>
                        <p>
                          <span className="mgr-5">
                            访客询盘率: {this.props.dataSource.beforeWeeks.visitFbRate}
                          </span>
                        </p>
                      </div>
                    ),
                    align: 'center',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        title: (dom, record) => (
          <div>
            <p style={{ textAlign: 'center' }}>效果来源词及词近4周数据</p>
            <p style={{ textAlign: 'center' }}>
              (点击，直通车点击，访问人数，店内询盘人数，店内TM人数)
            </p>
          </div>
        ),
        dataIndex: '',
        align: 'center',
        render: (dom, record) => (
          <div>
            {this.props.dataSource.effectSourceWords ? (
              <div>
                {this.props.dataSource.effectSourceWords.map((item) => (
                  <p key={Math.random()}>
                    <a
                      href={`https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&CatId=&SearchText=${item.searchKeyword}`}
                    >
                      {item.searchKeyword}{' '}
                    </a>{' '}
                    ({item.searchClicks},{item.p4pClickCnt},{item.detailUv},{item.fbUv},
                    {item.tmUv})
                  </p>
                ))}
              </div>
            ) : (
              ''
            )}
          </div>
        ),
      },
    ];
    return (
      <div style={{ textAlign: 'left' }} className={style['container']}>
        <Title level={5}>
          #{this.props.index + 1}
          {this.props.dataSource.label}
        </Title>
        <span style={{ marginLeft: '10px' }}>
          {' '}
          产品标题: {this.props.dataSource.subject}
        </span>
        <Table
          pagination={false}
          bordered
          rowKey="id"
          columns={!this.props.dataSource.fbDrop3 ? tableColumn : tableColumnsBefore}
          dataSource={[this.props.dataSource]}
        />
        {/*<div>*/}
        {/*    {this.props.dataSource.clickRateAbnormal || this.props.dataSource.fbRateAbnormal*/}
        {/*        ?             <div>*/}
        {/*            <div style={{ marginBottom: '20px' }} className={style['borderLeft']}>*/}
        {/*                {' '}*/}
        {/*                {this.highImpOrClickLabel()}*/}
        {/*            </div>*/}
        {/*            <Row>*/}
        {/*                {this.highImpOrClickLData().map((item) => <Col key={Math.random()} span={8}>*/}
        {/*                    <p*/}
        {/*                        className={[*/}
        {/*                            style['one-cell-height'],*/}
        {/*                            style['one-cell-line-height'],*/}
        {/*                            style['border-style']*/}
        {/*                        ].join(' ')}*/}
        {/*                    >*/}
        {/*    <span>*/}
        {/*      <a*/}
        {/*          href={`https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&CatId=&SearchText=${item.searchKeyword}`}*/}
        {/*          target="_blank"*/}
        {/*          rel="noreferrer"*/}
        {/*      >*/}
        {/*        {item.searchKeyword}*/}
        {/*      </a>*/}
        {/*        ({item.p4pExposureCnt},{item.searchClicks},{item.p4pClickCnt})*/}
        {/*    </span>*/}
        {/*                    </p>*/}
        {/*                    <Row>*/}
        {/*                        {item.favorProductInfo && item.favorProductInfo.length > 0*/}
        {/*                            ?                         <Space>*/}
        {/*                                {item.favorProductInfo.map((item) => <Col*/}
        {/*                                    className={style['border-style']}*/}
        {/*                                    span={24}*/}
        {/*                                    key={Math.random()}*/}
        {/*                                    style={{ marginLeft: '25px' }}*/}
        {/*                                >*/}
        {/*                                    <div*/}
        {/*                                        className={[*/}
        {/*                                            style['four-cellHeight'],*/}
        {/*                                            style['four-cell-line-height'],*/}
        {/*                                            style['text-align-center']*/}
        {/*                                        ].join(' ')}*/}
        {/*                                    >*/}
        {/*                                        <a href={item.favorProductUrl} target="_blank" rel="noreferrer">*/}
        {/*                                            <img*/}
        {/*                                                src={item.favorProductImage}*/}
        {/*                                                alt={''}*/}
        {/*                                                style={{*/}
        {/*                                                    maxWidth: '100%',*/}
        {/*                                                    maxHeight: '100%',*/}
        {/*                                                    marginTop: '10px'*/}
        {/*                                                }}*/}
        {/*                                            />*/}
        {/*                                        </a>*/}
        {/*                                    </div>*/}
        {/*                                    <div>*/}
        {/*                                        <div>*/}
        {/*                                            <p className="">{extractPrice(item)}</p>*/}
        {/*                                            <p*/}
        {/*                                                className={[*/}
        {/*                                                    style['one-cell-height'],*/}
        {/*                                                    style['one-cell-line-height']*/}
        {/*                                                ].join(' ')}*/}
        {/*                                            >*/}
        {/*                                                MOQ:{extractFob(item)}*/}
        {/*                                            </p>*/}
        {/*                                        </div>*/}
        {/*                                    </div>*/}
        {/*                                </Col>)}*/}
        {/*                            </Space>*/}
        {/*                            :                         <div>*/}
        {/*        <span*/}
        {/*            className={[*/}
        {/*                style['five-cell-line-height'],*/}
        {/*                style['five-cellHeight']*/}
        {/*            ].join(' ')}*/}
        {/*            style={{ marginLeft: '100px', fontSize: '22px', color: '#b3b3b3' }}*/}
        {/*        >*/}
        {/*            暂无数据*/}
        {/*        </span>*/}
        {/*                            </div>*/}
        {/*                        }*/}
        {/*                        <Col />*/}
        {/*                    </Row>*/}
        {/*                </Col>)}*/}
        {/*            </Row>*/}
        {/*        </div>*/}
        {/*        : null}*/}
        {/*</div>*/}
      </div>
    );
  }
}

export default ProductConversionDataTable;
