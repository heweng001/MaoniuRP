import React, { Component } from 'react';

import SameProductKeyCard from './sameProductKeyCard';
export default class SameProductKeyAnalysis extends Component {
  render() {
    return (
      <>
        {this.props.dataSource?.map((item) => (
          <SameProductKeyCard
            key={Math.random()}
            dataSource={item.shopData}
            shopUrl={item.shopUrl}
          />
        ))}
      </>
    );
  }
}
