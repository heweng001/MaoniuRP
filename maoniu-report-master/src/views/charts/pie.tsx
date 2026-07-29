import { Card } from 'antd';
import EChartsReact from 'echarts-for-react';
import React, { Component } from 'react';

interface PieData {
  text?: string;
  subtext?: string;
  legendData?: any[];
  seriesName?: string;
  seriesData?: SeriesData[];
}

interface SeriesData {
  name?: string;
  value?: string;
}

interface ItemProps {
  dataSource: PieData;
}

export default class Pie extends Component<ItemProps> {
  getOption = () => {
    const { text, subtext, legendData, seriesName, seriesData } = this.props.dataSource;
    return {
      title: {
        text,
        subtext,
        x: 'center',
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b} : {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        data: legendData,
      },
      series: [
        {
          name: seriesName,
          type: 'pie',
          radius: '55%',
          center: ['50%', '60%'],
          data: seriesData,
          itemStyle: {
            emphasis: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          label: {
            normal: {
              show: true,
              formatter: '{b}: {c}({d}%)',
            },
          },
        },
      ],
    };
  };

  render() {
    return (
      <Card>
        <EChartsReact option={this.getOption()} style={{ height: 300 }} />
      </Card>
    );
  }
}
