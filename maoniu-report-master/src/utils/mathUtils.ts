const mathUtils = {
  median: (nums: any[]) => {
    nums.sort((a, b) => a - b);
    if (nums.length % 2 === 0) {
      return (nums[nums.length / 2 - 1] + nums[nums.length / 2]) / 2;
    } else {
      return nums[(nums.length - 1) / 2];
    }
  },
  parseToPercent: (value: number) => {
    if (value) {
      const values = value * 100;
      return parseFloat(String(values)).toFixed(2) + '%';
    }
    if (value === 0) {
      return '0%';
    }
    return '/';
  },
  numberFormat(value: number) {
    if (!isNaN(value)) {
      if (Number.isInteger(value)) {
        return value;
      } else {
        return parseFloat(String(value)).toFixed(2);
      }
    }
    return '/';
  },
};

export default mathUtils;
