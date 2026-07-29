import { Card } from 'antd';
import EChartsReact from 'echarts-for-react';
import React, { Component } from 'react';

interface LineData {
  text?: string;
  legendData?: any[];
  xAxisDAta?: any[];
  yAxis?: any[];
  series?: LineSeries[];
}

interface LineSeries {
  name: string;
  type: string;
  data: any[];
  itemStyle?: object;
}

interface ItemProps {
  dataSource: LineData;
}

const itemStyle = {
  normal: {
    label: {
      show: true, //开启显示
      position: 'top', //在上方显示
      textStyle: {
        //数值样式
        color: '#606266',
        fontSize: 12,
      },
    },
  },
};

export default class Bar extends Component<ItemProps> {
  getOption = () => {
    const { text, legendData, xAxisDAta, yAxis, series = [] } = this.props.dataSource;
    // x上方显示数值
    for (const item of series) {
      item.itemStyle = itemStyle;
    }
    return {
      title: {
        text,
      },
      tooltip: {},
      legend: {
        data: legendData,
      },
      xAxis: {
        data: xAxisDAta,
      },
      yAxis: {
        data: yAxis,
      },
      series,
    };
  };

  render() {
    return (
      <Card>
        <EChartsReact option={this.getOption()} />
      </Card>
    );
  }
}
