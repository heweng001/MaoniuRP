import { Card } from 'antd';
import React from 'react';

import { KEYWORD_SEARCH_URL_PREFIX, PRODUCT_EDIT_URL_PREFIX } from '@/constant';
import { isArray } from '@/utils/util';

export default class EmphasisKeywords extends React.Component {
  state = {
    emphasisKeywords: [],
  };

  componentDidMount = () => {
    const { dataSource } = this.props;
    if (isArray(dataSource)) {
      this.convertEmphasisKeywordList();
    }
  };
  convertEmphasisKeywordList = () => {
    let data = this.props.dataSource;
    if (!data) {
      return [];
    }
    // 重点关键词
    let totalKeyword = [...data];
    totalKeyword
      .sort((a, b) => Number(b.heat) - Number(a.heat))
      .forEach((item) => {
        Object.assign(item, {
          productEditUrl: `${PRODUCT_EDIT_URL_PREFIX}${item.rankProductId}`,
        });
      });
    let beforePageFour = totalKeyword.filter((o) => o.rank > 0 && o.rank < 4);
    let rest = totalKeyword.filter((o) => !o.rank || o.rank === 0 || o.rank >= 4);
    beforePageFour = this.getTheSameProductImg(beforePageFour);
    beforePageFour = beforePageFour.sort((a, b) => b.count - a.count);
    let resultList = [];
    for (const item of beforePageFour) {
      resultList.push(item.data);
    }
    this.setState({
      emphasisKeywords: [...resultList, ...rest],
    });
  };
  getTheSameProductImg = (data) => {
    let obj = {};
    let arr = [];
    data.forEach((item, i) => {
      const rankProductImg = item.rankProductImg;
      let index = obj[rankProductImg];
      if (index !== undefined) {
        arr[index].push(i);
      } else {
        obj[rankProductImg] = arr.length;
        arr.push([i]);
      }
    });
    const results = [];
    arr.forEach((item) => {
      item.forEach((i) => {
        results.push({ data: data[i], count: item.length });
      });
    });
    return results;
  };
  getFormatRank = (item) => {
    const { rank, rankIndex } = item;
    if (rank > 0) {
      return `${rank}页 ${rankIndex}位`;
    }
    return '查无排名';
  };
  getEmphasisKeywordSize = () => {
    return this.state.emphasisKeywords.length;
  };
  getOnPageKeywordSize = () => {
    return this.state.emphasisKeywords.filter((f) => f.rank === 1).length;
  };
  getBeforePageThreeKeywordSize = () => {
    return this.state.emphasisKeywords.filter((f) => f.rank > 0 && f.rank < 4).length;
  };
  getCardTitle = () => {
    return (
      <p>
        <span>标记重点关键词数量个{this.getEmphasisKeywordSize()}</span>
        <span>
          其中首页关键词数{this.getOnPageKeywordSize()}个，占比为
          {((this.getOnPageKeywordSize() / this.getEmphasisKeywordSize()) * 100).toFixed(
            0,
          )}
          %，
        </span>
        <span>
          前三页关键词数{this.getBeforePageThreeKeywordSize()}个，占比为
          {(
            (this.getBeforePageThreeKeywordSize() / this.getEmphasisKeywordSize()) *
            100
          ).toFixed(0)}
          %
        </span>
      </p>
    );
  };
  render() {
    const { emphasisKeywords } = this.state;
    const gridStyle = {
      width: '20%',
      textAlign: 'center',
    };
    return (
      <Card title={this.getCardTitle()}>
        {emphasisKeywords.map((m) => (
          <Card.Grid style={gridStyle} key={m.keyword}>
            {m.rankProductImg && (
              <p>
                <a href={m.productEditUrl} target="_blank" rel="noreferrer">
                  <img
                    style={{
                      maxHeight: '100px',
                      maxWidth: '100px',
                    }}
                    src={m.rankProductImg}
                    alt="暂无图片"
                  />
                </a>
              </p>
            )}
            {m.keyword && (
              <p>
                <a
                  href={KEYWORD_SEARCH_URL_PREFIX + m.keyword}
                  target="_blank"
                  rel="noreferrer"
                >
                  {m.keyword}
                </a>
              </p>
            )}
            <span
              style={{
                marginRight: '5px',
              }}
            >
              热度: {m.heat}
            </span>
            {m.rank || m.rankIndex ? <span>{this.getFormatRank(m)}</span> : '查无排名'}
          </Card.Grid>
        ))}
      </Card>
    );
  }
}
