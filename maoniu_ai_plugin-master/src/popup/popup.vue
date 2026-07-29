<template>
  <div class="content-wrapper">
    <div class="header">
      <span>AI操盘手-AI助手</span>
    </div>
    <div class="content">
      <div class="setting-row">
        <div class="label">
          <span>AI页面采集</span>
        </div>
        <div class="switch">
          <el-switch v-model="switchValue" active-color="#13ce66"> </el-switch>
        </div>
      </div>
      <!-- <div class="setting-row">
        <span class="label">采集品模板</span>
        <el-select
          style="width: 50%"
          v-model="templateName"
          @change="changeTemplateName"
          placeholder="请选择模板名称"
          popper-append-to-body="false"
          clearable
        >
          <el-option
            v-for="item in options.templates"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          >
          </el-option>
        </el-select>
      </div> -->
      <el-divider></el-divider>
    </div>
  </div>
</template>

<script>
export default {
  name: "popup-content",
  data() {
    return {
      switchValue: true,
      logoUrl: chrome.runtime.getURL("AI.png"),
      localStorageKey: "ai-page-helper-active",
      templateName: "empty",
      templateNameKey: "templateName",
      options: {
        templates: [],
      },
      currentDomain: "",
      defaultTemplateInfo: {
        id: "empty",
        templateName: "",
        brandName: "OEM",
        productGroup: [],
        tradeName: "",
        remark: "",
        video: "no",
        onlyDetailDescription: false,
        prefix: "",
        startNumber: "",
        endNumber: "",
        customAttribute1688: "no",
        productType: "sourcing",
        removeAllLink: false,
        exchangeRate: "1",
        operator: "multiply",
        profits: "100",
      },
    };
  },
  async created() {
    this.initSwitchValue();
    // await this.checkAiLogin();
    // await this.setDefaultTemplateInfo();
  },
  watch: {
    switchValue(val) {
      console.log({ [this.localStorageKey]: val });
      chrome.storage.sync.set({ [this.localStorageKey]: val }, function () {});
    },
  },
  methods: {
    initSwitchValue() {
      let vm = this;
      chrome.storage.sync.get([this.localStorageKey], function (result) {
        vm.switchValue = result[vm.localStorageKey];
      });
      chrome.storage.sync.get([this.templateNameKey], function (result) {
        vm.templateName = result[vm.templateNameKey].id;
      });
    },
    // async checkAiLogin() {
    //   const domainArray = SUPPORT_DOMAIN_ARRAY;
    //   let promiseArray = [];
    //   domainArray.forEach((domain) => {
    //     let promise = new Promise((resolve) => {
    //       // check tab exist`
    //       chrome.tabs.query({ url: `*://${domain}/*` }, (res) => {
    //         console.log(res);
    //         if (!res || res.length === 0) {
    //           resolve({ login: false });
    //         }
    //         // check nick
    //         chrome.cookies.getAll(
    //           {
    //             domain,
    //           },
    //           function (cookies) {
    //             console.log("cookies", cookies);
    //             let nickCookie = cookies.filter((c) => c.name === "nick");
    //             if (Array.isArray(nickCookie) && nickCookie.length > 0) {
    //               resolve({ login: true, domain, nick: nickCookie[0].value });
    //             }
    //             resolve({ login: false });
    //           }
    //         );
    //       });
    //     });
    //     promiseArray.push(promise);
    //   });
    //   let result = await Promise.all(promiseArray);
    //   console.log("check login result", result);
    //   if (isArrayLength(result)) {
    //     const domainInfo = result.find((f) => f.login);
    //     const { nick = "", domain = "", login = false } = domainInfo;
    //     if (nick && domain && login) {
    //       this.currentDomain = domain;
    //       const url = collectProductManage.getTemplateUrl(domain, nick);
    //       await this.getCollectProductTemplates(url);
    //     }
    //   }
    // },
    // getTemplateUrl(domain, nick) {
    //   console.log(domain, "domain");
    //   if (domain === "localhost") {
    //     return `http://localhost:8761/api/v1/collect-product-config/by/${nick}`;
    //   }
    //   return `https://${domain}/api/v1/collect-product-config/by/${nick}`;
    // },
    // getCollectProductTemplates(url) {
    //   console.log(url, "url");
    //   return axios({
    //     url,
    //     method: "get",
    //   })
    //     .then((res) => {
    //       console.log(res);
    //       if (res && res.data) {
    //         this.options.templates = res.data.map((m) => {
    //           return {
    //             value: m.id,
    //             label: m.templateName,
    //           };
    //         });
    //         this.options.templates.unshift({
    //           value: "empty",
    //           label: "为空",
    //         });
    //       }
    //     })
    //     .catch((err) => {
    //       console.log(`获取采集品配置模板数据出错了:${err}`);
    //     });
    // },
    // async changeTemplateName(val) {
    //   let templateInfo = {};
    //   if (val === "empty") {
    //     templateInfo = this.defaultTemplateInfo;
    //   } else {
    //     templateInfo = await this.getTemplateInfo(val);
    //   }
    //   chrome.storage.sync.set(
    //     { [this.templateNameKey]: templateInfo },
    //     function () {}
    //   );
    // },
    // async getTemplateInfo(val, domain) {
    //   const templateInfoUrl = this.getTemplateInfoUrl(val, domain);
    //   if (templateInfoUrl) {
    //     return await this.getTemplateDetailInfo(templateInfoUrl);
    //   }
    //   return null;
    // },
    // getTemplateInfoUrl(val, domain) {
    //   if (domain === "localhost") {
    //     return `http://localhost:8761/api/v1/collect-product-config/${val}`;
    //   }
    //   return `https://${domain}/api/v1/collect-product-config/${val}`;
    // },
    // getTemplateDetailInfo(url) {
    //   return axios({
    //     url,
    //     methods: "get",
    //   })
    //     .then((res) => {
    //       return res.data;
    //     })
    //     .catch((err) => {
    //       console.log(`获取采集品模板名称数据出错了: ${err}`);
    //     });
    // },
    // async setDefaultTemplateInfo() {
    //   if (!this.templateName) {
    //     this.templateName = "empty";
    //   }
    //   if (this.templateName === "empty") {
    //     chrome.storage.sync.set(
    //       { [this.templateNameKey]: this.defaultTemplateInfo },
    //       function () {}
    //     );
    //   } else {
    //     const templateInfo = await this.getTemplateInfo(this.templateName);
    //     chrome.storage.sync.set(
    //       { [this.templateNameKey]: templateInfo },
    //       function () {}
    //     );
    //   }
    // },
  },
};
</script>

<style scoped lang="stylus">
.content-wrapper {
  width: 350px;
  height: 350px;
}
.header{
  background-color:#67C23A;
  color:#FFFFFF;
  /*color: #67C23A;*/
  font-size: 20px;
  font-weight: bold;
  line-height: 50px;
  border-bottom: 1px solid rgba(0, 0, 0, .12);
}
img.logo{
  width: 20px;
}
.content{
 margin-top: 20px;
  font-family: Inter;
  font-style: normal;
  font-weight: 400;
  font-size: 14px;
  line-height: 20px;
}
div.setting-row{
  display: flex;
  align-items: center;
  justify-content: space-between;

}
</style>

<style lang="stylus">
.el-select-dropdown__list {
  height 200px
  overflow-y auto
}
</style>
