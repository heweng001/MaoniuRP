type params = {
  [key: string]: any;
};

const reportUtils = {
  getEffectiveFbList(feedbackSubjectList: any, effectiveFbConfig: any) {
    // console.log(feedbackSubjectList, effectiveFbConfig);
    if (feedbackSubjectList) {
      let data = feedbackSubjectList;
      if (effectiveFbConfig) {
        const {
          isShowFlagMark,
          isShowSecondResponseRate,
          isUserNewLevel1,
          isUserNewLevel3,
          isUserNewLevel4,
        }: params = effectiveFbConfig;
        // 是否勾选
        if (
          isShowFlagMark ||
          isShowSecondResponseRate ||
          isUserNewLevel1 ||
          isUserNewLevel3 ||
          isUserNewLevel4
        ) {
          data = data.filter((i: any) => {
            // L1+
            if (
              isUserNewLevel1 &&
              i.userNewLevel &&
              (i.userNewLevel === 'L1+' ||
                i.userNewLevel === 'L1' ||
                i.userNewLevel === 'L2')
            ) {
              return true;
            }
            // L3
            if (isUserNewLevel3 && i.userNewLevel && i.userNewLevel === 'L3') {
              return true;
            }
            // L4
            if (isUserNewLevel4 && i.userNewLevel && i.userNewLevel === 'L4') {
              return true;
            }
            // 二次回复
            if (isShowSecondResponseRate && i.buyerSecondReply) {
              return true;
            }
            // 红旗
            if (isShowFlagMark && i.mark === 'FOLLOW') {
              return true;
            }
            return false;
          });
        }
        if (effectiveFbConfig?.count) {
          data = data.filter((i: any) => i.quantity >= effectiveFbConfig.count);
        }
        if (effectiveFbConfig?.chooseCountry?.length) {
          data = data.filter((i: any) =>
            effectiveFbConfig.chooseCountry.some((s: any) => s === i.countryName),
          );
        }
        return data;
      } else {
        return data.filter((i: any) => i.buyerLevel === 'A' || i.buyerSecondReply);
      }
    }
    return [];
  },
};
export default reportUtils;
