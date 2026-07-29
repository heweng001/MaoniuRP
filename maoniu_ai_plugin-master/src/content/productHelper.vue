<template>
  <div class="ai-helper-container" v-if="showBox">
    <el-card class="box-card" shadow="always">
      <div class="header">
        <el-icon size="20" @click="closeBox">
          <Close />
        </el-icon>
      </div>
      <div class="content">
        <div class="tip box-alert">
          <img :src="url" />
          <span>{{ tipMessage }}</span>
        </div>
        <div class="setting-row box-alert">
          <div v-if="loginStatusNick" class="box-alert">
            <span class="label">采集品模板：</span>
            <el-select
              :disabled="!loginStatusNick"
              style="width: 60%"
              v-model="selectedTemplate"
              @change="changeTemplateName"
              placeholder="请选择模板名称"
              popper-append-to-body="false"
              :clearable="false"
            >
              <el-option
                v-for="item in templateOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              >
              </el-option>
            </el-select>
          </div>
          <div v-if="showUnloginState" class="box-alert">
            <el-alert show-icon type="error" :closable="false">
              <template #title>
                <span style="display: flex; gap: 0.25em">
                  操盘手未登录无法采集
                  <el-link
                    href="https://fuwu.alibaba.com/product/use.htm?code=ISVXX5B0105"
                    underline
                    target="__blank"
                  >
                    去登录
                  </el-link>
                </span>
              </template>
            </el-alert>
          </div>
          <div v-else-if="!aliLoginStatus" class="box-alert">
            <el-alert show-icon type="warning" :closable="false">
              <template #title>
                <span style="display: flex; gap: 0.25em">
                  国际站未登录无法采集视频
                  <el-link
                    href="https://login.alibaba.com/"
                    underline
                    target="__blank"
                  >
                    去登录
                  </el-link>
                </span>
              </template>
            </el-alert>
          </div>
        </div>

        <el-collapse-transition>
          <div class="progress-wrapper" v-show="showProgress">
            <el-progress
              :text-inside="true"
              :stroke-width="15"
              :percentage="progress"
            >
              <span>{{ progressContent }} </span>
            </el-progress>
          </div>
        </el-collapse-transition>
        <div class="button-wrapper">
          <!--          <el-button v-if="!isCategoryPage" @click="">找货源</el-button>-->
          <span class="login-status">
            操盘手
            <el-icon v-if="loginStatusNick">
              <CircleCheck color="#67C23A" />
            </el-icon>
            <el-icon v-else>
              <CircleClose color="#F56C6C" />
            </el-icon>
          </span>
          <span class="login-status">
            国际站
            <el-icon v-if="aliLoginStatus">
              <CircleCheck color="#67C23A" />
            </el-icon>
            <el-icon v-else>
              <CircleClose color="#F56C6C" />
            </el-icon>
          </span>
          <el-button
            v-if="!gatherFinish"
            type="primary"
            :loading="gatherButtonLoading"
            :disabled="!loginStatusNick"
            @click="checkAiLoginAndGatherProduct"
          >
            开始采集
          </el-button>
          <el-button v-else @click="jumpToAi">查看采集结果</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import { DEFAULT_TEMPLATE_INFO } from "@/js/const/collect-product";
import { Close, CircleCheck, CircleClose } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus/lib/components";
import { isNumber } from "util";

let port;
const offSetValue = 5;

export default {
  name: "productHelper.vue",
  data() {
    return {
      selectedTemplate: "empty",

      templateNameKey: "templateName",

      aiLoginStatus: false,
      loginStatusNick: "",
      loginStatusDomain: "",

      templateOptions: [
        {
          value: "empty", // 空模板val设为null
          label: "为空",
        },
      ],

      showUnloginState: false,

      defaultTemplateInfo: DEFAULT_TEMPLATE_INFO,

      aliLoginStatus: false,
      aliLoginNickname: "",

      url: chrome.runtime.getURL("AI.png"),
      showBox: false,
      gatherButtonLoading: false,
      isCategoryPage: false,
      categorySupportUrlArray: [
        "alibaba.com/productgrouplist",
        "1688.com/page/offerlist",
        "alibaba.com/productlist",
        "alibaba.com/featureproductlist",
        "alibaba.com/collection_product",
        "aliexpress.com/store",
      ],
      productSupportUrlArray: [
        "alibaba.com/product-detail/",
        "detail.1688.com",
        "aliexpress.com/item",
        "www.aliexpress.us/item",
      ],
      supportPageUrlArray: [
        ".alibaba.com/trade/search",
        "1688.com",
        "www.alibaba.com",
        "aliexpress.com",
      ],
      progress: 0,
      showProgress: false,
      gatherFinish: false,
      domain: "localhost",
      aiCopyEntryIndex: 0,
      productLinkArray: [],
      offSetValue: 10,
      aiLoginResultData: null,
      localStorageKey: "ai-page-helper-active",
    };
  },
  created() {
    chrome.storage.sync.get([this.templateNameKey], (result) => {
      if (result[this.templateNameKey]) {
        this.selectedTemplate = result[this.templateNameKey].id;
      }
    });
  },
  mounted() {
    const vm = this;
    this.setDefaultValue();
    chrome.storage.sync.get(vm.localStorageKey, function (result) {
      if (result[vm.localStorageKey]) {
        vm.initBox();
        vm.initPort();
        if (vm.isSupportDomain()) {
          // 处理静态文档节点
          vm.initLink();
          // 处理动态文档节点
          vm.initMutationObserver();
        }
      } else {
        vm.showBox = false;
      }
      vm.checkAiLoginAndSaveLoginResult();
      vm.checkAliLoginAndSaveLoginState();
    });
  },
  computed: {
    tipMessage() {
      if (this.isCategoryPage) {
        return "此页面支持采集到AI操盘手";
      }
      return "此商品支持采集到AI操盘手";
    },
    aiProductPage() {
      if (this.domain === "localhost") {
        return "http://localhost:8080/product.html#/new-product";
      }
      return `https://${this.domain}/product.html#/new-product`;
    },
    progressContent() {
      if (this.progress !== 100) {
        return `${this.progress}%`;
      }
      return "采集完成";
    },
    supportDomainArray() {
      return [
        ...this.supportPageUrlArray,
        ...this.productSupportUrlArray,
        ...this.categorySupportUrlArray,
      ];
    },
  },
  watch: {
    loginStatusNick() {
      // const url = collectProductManage.getTemplateUrl(
      //   this.loginStatusDomain,
      //   this.loginStatusNick
      // );
      this.getCollectProductTemplates();
      // console.log(this.options);
    },
    templateOptions(val) {
      console.log("watch options: ", JSON.stringify(val));
    },
  },
  methods: {
    async changeTemplateName(val) {
      console.log("templateVal == >", val);
      this.selectedTemplate = val;
      let templateInfo = {};
      if (val === "empty") {
        templateInfo = this.defaultTemplateInfo;
        chrome.storage.sync.set(
          { [this.templateNameKey]: templateInfo },
          function () {}
        );
      } else {
        port.postMessage({
          type: "getCollectProductConfigDetail",
          domain: this.loginStatusDomain,
          id: val,
          reply: "handleCollectProductConfigDetail",
        });
      }
    },

    getCollectProductTemplates() {
      port.postMessage({
        type: "getCollectProductConfig",
        domain: this.loginStatusDomain,
        reply: "handleCollectProductConfig",
      });
    },
    isSupportDomain() {
      for (let domain of this.supportDomainArray) {
        if (location.href.includes(domain)) {
          return true;
        }
      }
      return false;
    },
    closeBox() {
      this.showBox = false;
    },
    initLink: function () {
      let elementsByTagName = document.getElementsByTagName("A");
      this.filterAndRenderDiv(elementsByTagName);
    },
    initMutationObserver: function () {
      const targetNode = document.body;
      const config = { childList: true, subtree: true };
      let vm = this;
      // eslint-disable-next-line no-unused-vars
      const callback = function (mutationsList, observer) {
        for (let mutation of mutationsList) {
          for (let addedNode of mutation.addedNodes) {
            if (addedNode.nodeName === "A") {
              vm.filterAndRenderDiv([addedNode]);
            } else {
              if (addedNode.getElementsByTagName) {
                let aTagElements = addedNode.getElementsByTagName("A");
                if (aTagElements && aTagElements.length > 0) {
                  vm.filterAndRenderDiv(aTagElements);
                }
              }
            }
          }
        }
        vm.reRender();
      };
      const observer = new MutationObserver(callback);
      observer.observe(targetNode, config);
    },
    setDefaultValue() {
      const vm = this;
      chrome.storage.sync.get(vm.localStorageKey, function (result) {
        let value = result[vm.localStorageKey];
        if (value === undefined) {
          chrome.storage.sync.set(
            { [vm.localStorageKey]: true },
            function () {}
          );
        }
      });
    },
    filterAndRenderDiv: function (aTagElements) {
      let productTagList = this.filterSupportElement(aTagElements);
      // productTagList = this.filterWithOutImageTag(productTagList);
      productTagList.forEach((element) => {
        let aiID = this.aiCopyEntryIndex++;
        let top = element.getBoundingClientRect().top;
        let left = element.getBoundingClientRect().left;
        let imageNodes = element.getElementsByTagName("IMG");
        if (imageNodes && imageNodes.length > 0) {
          top = imageNodes[0].getBoundingClientRect().top;
          left = imageNodes[0].getBoundingClientRect().left;
        }
        let href = element.getAttribute("href");
        element.setAttribute("ai-id", aiID);
        let divElement = document.createElement("div");

        divElement.classList.add("cps-copy-entry");
        divElement.innerText = "采集到AI操盘手";
        divElement.setAttribute(
          "style",
          `top: ${top + window.scrollY + offSetValue}px; left: ${
            left + window.scrollX + offSetValue
          }px;opacity: 0;pointer-events: none;`
        );
        divElement.setAttribute("data-url", `${href}`);
        divElement.setAttribute("ai-id", `${aiID}`);
        this.addCopyEntryEventListener(divElement);
        document.body.appendChild(divElement);
        this.addProductElementEventListener(element);
      });
      this.productLinkArray.push(...productTagList);
    },
    addCopyEntryEventListener(divElement) {
      divElement.addEventListener("mouseenter", () => {
        divElement.style.opacity = "1";
        divElement.style["pointer-events"] = "all";
      });
      divElement.addEventListener("mouseleave", () => {
        divElement.style.opacity = "0";
        divElement.style["pointer-events"] = "none";
      });
      divElement.addEventListener("click", (event) => {
        let productUrl = event.target.getAttribute("data-url");
        this.checkLoginAndSaveProduct(productUrl);
      });
    },
    addProductElementEventListener(element) {
      element.addEventListener("mouseenter", (event) => {
        let aiId = event.target.attributes.getNamedItem("ai-id").nodeValue;
        let elements = document.querySelector(`div[ai-id="${aiId}"]`);
        if (elements) {
          elements.style.opacity = "1";
          elements.style["pointer-events"] = "all";
        }
      });
      element.addEventListener("mouseleave", (event) => {
        let aiId = event.target.attributes.getNamedItem("ai-id").nodeValue;
        let elements = document.querySelector(`div[ai-id="${aiId}"]`);
        if (elements) {
          elements.style.opacity = "0";
          elements.style["pointer-events"] = "none";
        }
      });
    },
    filterSupportElement(elements) {
      let productTagList = [];
      for (let element of elements) {
        if (element.hasAttribute("href")) {
          if (this.isProductUrl(element.getAttribute("href"))) {
            productTagList.push(element);
          }
        }
      }
      return productTagList;
    },
    reRender: function () {
      for (let linkElement of this.productLinkArray) {
        let aiId = linkElement.getAttribute("ai-id");
        let elements = document.querySelector(`div[ai-id="${aiId}"]`);
        let newTopValue =
          linkElement.getBoundingClientRect().top + window.scrollY;
        let newLeftValue =
          linkElement.getBoundingClientRect().left + window.scrollX;
        let imageNodes = linkElement.getElementsByTagName("IMG");
        if (imageNodes && imageNodes.length > 0) {
          newTopValue =
            imageNodes[0].getBoundingClientRect().top + window.scrollY;
          newLeftValue =
            imageNodes[0].getBoundingClientRect().left + window.scrollX;
        }
        elements.style.top = `${newTopValue + offSetValue}px`;
        elements.style.left = `${newLeftValue + offSetValue}px`;
      }
    },
    initPort() {
      port = chrome.runtime.connect({ name: "productHelper" });
      port.postMessage("init");
      port.onMessage.addListener((msg) => {
        console.log("productHelper port onMessage listener", msg);
        let { type, data } = msg;
        if (type === "saveLoginResult") {
          const loginItem = data?.find((item) => item.login);
          if (loginItem) {
            this.loginStatusNick = loginItem.nick;
            this.loginStatusDomain = loginItem.domain;
          } else {
            this.showUnloginState = true;
          }
          this.handleCheckAiLoginResultAndSaveLoginResult(data);
        }
        if (type === "saveAliLoginResult") {
          // console.log("saveAliLoginResult", data);
          this.aliLoginStatus = data?.login;
          this.aliLoginNickname = data?.nickname;
        }
        if (type === "gatherProduct") {
          this.handleCheckAiLoginResultAndGatherProduct(data);
        }
        if (type === "gatherProductResponse") {
          this.handleGatherProductResponse(data);
        }
        if (type === "gatherProductProgress") {
          this.handleGatherProductProgress(data);
        }
        if (type === "gatherProductByLinkResponse") {
          this.handleGatherProductByLinkResponse(data);
        }
        if (type === "uploadProductVideo") {
          this.handleUploadProductVideoStatus(data);
        }
        if (type === "collectProductPrompt") {
          this.handleCollectProductPrompt(data);
        }
        if (type == "handleCollectProductConfig") {
          console.log("handleCollectProductConfig", data);
          this.templateOptions.push(
            ...data.map((m) => {
              return {
                value: m.id,
                label: m.templateName,
              };
            })
          );
        }
        if (type === "handleCollectProductConfigDetail") {
          console.log("handleCollectProductConfigDetail", data);
          chrome.storage.sync.set(
            { [this.templateNameKey]: data },
            function () {}
          );
        }
      });
    },
    checkLoginAndSaveProduct(url) {
      let { success, domain, nick } = this.checkLoginResult(
        this.aiLoginResultData
      );
      if (success) {
        this.domain = domain;
        this.gatherProductByLink(url, domain, nick);
      }
    },
    gatherProductByLink(url, domain, nick) {
      ElMessage({
        message: `正在采集到AI操盘手,请稍候`,
      });
      if (url.startsWith("//")) {
        url = "https:" + url;
      }
      port.postMessage({
        type: "gatherProductByLink",
        url,
        domain,
        nick,
        isCategoryPage: false,
      });
    },
    initBox() {
      if (this.isProductPage()) {
        this.showBox = true;
      } else {
        this.showBox = false;
      }
    },
    isProductPage() {
      const url = location.href;
      for (let supportUrl of this.productSupportUrlArray) {
        if (url.includes(supportUrl)) {
          this.isCategoryPage = false;
          return true;
        }
      }
      for (let supportUrl of this.categorySupportUrlArray) {
        if (url.includes(supportUrl)) {
          this.isCategoryPage = true;
          return true;
        }
      }
      return false;
    },
    gatherProductByBox(domain, nick) {
      this.gatherButtonLoading = true;
      this.progress = 0;
      this.showProgress = true;
      const number = this.get1688ProductFooterActiveNumber();
      const origin = location.origin;
      port.postMessage({
        type: "gatherProduct",
        url: location.href,
        domain,
        nick,
        isCategoryPage: this.isCategoryPage,
        number,
        origin,
      });
    },
    get1688ProductFooterActiveNumber() {
      let number = 1;
      try {
        const querySelector = document.querySelector("#bd_1_container_0");
        if (querySelector) {
          const elementById =
            document.getElementById("45753076").nextElementSibling;
          if (elementById) {
            const lastElementChild = elementById.lastElementChild;
            if (lastElementChild) {
              const elementsByTagName = elementById.getElementsByTagName("div");
              if (elementsByTagName) {
                for (const elementsByTagNameElement of elementsByTagName) {
                  const attribute =
                    elementsByTagNameElement.getAttribute("style");
                  if (attribute && attribute.includes("rgb(255, 64, 0)")) {
                    if (isNumber(elementsByTagNameElement.innerText)) {
                      number = elementsByTagNameElement.innerText;
                    }
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.log(`获取当前产品页数出错了:${err}`);
      }
      return number;
    },
    checkAiLoginAndGatherProduct() {
      port.postMessage({ type: "checkAiLogin", reply: "gatherProduct" });
    },
    checkAiLoginAndSaveLoginResult() {
      port.postMessage({ type: "checkAiLogin", reply: "saveLoginResult" });
    },
    checkAliLoginAndSaveLoginState() {
      port.postMessage({ type: "checkAliLogin", reply: "saveAliLoginResult" });
    },
    handleCheckAiLoginResultAndSaveLoginResult(data) {
      this.aiLoginResultData = data;
    },
    handleCheckAiLoginResultAndGatherProduct(data) {
      let { success, domain, nick } = this.checkLoginResult(data);
      if (success) {
        this.domain = domain;
        this.gatherProductByBox(domain, nick);
      }
    },
    checkLoginResult(data) {
      if (Array.isArray(data) && data.length > 0) {
        data = data.filter((item) => item.login === true);
        if (data.length === 0) {
          this.handleNotLoginResult();
          return { success: false };
        }
        if (data.length === 1) {
          let { domain, nick } = data[0];
          return { success: true, domain, nick };
        }
        if (data.length >= 2) {
          this.handleLoginMultiShopsResult();
          return { success: false };
        }
      } else {
        this.handleNotLoginResult();
        return { success: false };
      }
    },
    handleLoginSuccessResult(data) {
      let { domain, nick } = data;
      this.domain = domain;
      ElMessage({
        message: `已成功登录操盘手,domain ${domain},nick: ${nick}`,
        type: "success",
      });
      this.gatherProductByBox(domain, nick);
    },
    handleGatherProductResponse(data) {
      this.progress = 100;
      this.gatherButtonLoading = false;
      this.gatherFinish = true;
      console.log(data);
      let { success, failUrlArray } = data;
      if (success) {
        ElMessage({
          message: `采集产品成功`,
          type: "success",
        });
      } else {
        ElMessage({
          message: `添加过程中出现了异常，共有 ${failUrlArray.length} 款产品未能成功采集`,
          type: "warning",
        });
      }
    },
    handleNotLoginResult() {
      ElMessage({
        message: `未登录,请先登录AI操盘手`,
        type: "error",
      });
    },
    handleGatherProductProgress(data) {
      this.progress = data;
      console.log(this.progress);
    },
    handleGatherProductByLinkResponse(data) {
      console.log(data);
      let { success, failUrlArray } = data;
      if (success) {
        ElMessage({
          message: `采集产品成功`,
          type: "success",
        });
      } else {
        ElMessage({
          message: `添加过程中出现了异常，共有 ${failUrlArray.length} 款产品未能成功采集`,
          type: "warning",
        });
      }
    },
    handleUploadProductVideoStatus(data) {
      if (data) {
        ElMessage({
          message: "采集产品视频成功了",
          type: "success",
        });
      }
    },
    handleCollectProductPrompt(data) {
      ElMessage({
        message: `有${data}个产品采集失败了，可能是因为页面出现了验证码，请手动校验后再继续采集`,
        type: "error",
      });
      this.showProgress = false;
      this.gatherButtonLoading = false;
      this.gatherFinish = false;
    },
    jumpToAi() {
      window.open(this.aiProductPage, "_blank");
    },
    isProductUrl(url) {
      for (let supportUrl of this.productSupportUrlArray) {
        if (url.includes(supportUrl)) {
          return true;
        }
      }
      return false;
    },
    filterWithOutImageTag(productTagList) {
      productTagList = productTagList.filter((element) => {
        let imageNodes = element.getElementsByTagName("IMG");
        if (imageNodes && imageNodes.length > 0) {
          return true;
        }
        return false;
      });
      return productTagList;
    },
    handleLoginMultiShopsResult() {
      ElMessage({
        message: `当前浏览器登录多个AI操盘手账号,为避免不正确的情况出现，请先退出多余账号后刷新此页面`,
        type: "warning",
      });
    },
  },
  components: {
    Close,
    CircleCheck,
    CircleClose,
  },
};
</script>

<style lang="stylus">
div.cps-copy-entry{
  z-index: 2147483647;
  position: absolute !important;
  color: rgb(255, 255, 255) !important;
  font-size: 13px !important;
  white-space: nowrap !important;
  cursor: pointer !important;
  padding: 3px 8px;
  border-radius: 3px !important;
  background: rgba(0, 0, 0, 0.8) !important;
}
.cps-copy-entry:hover{
  color: #67C23A  !important
}

.ai-helper-container{
  z-index 2000
  position: fixed;
  right: 50px;
  bottom: 50px;
  width: 340px;
  .box-card{
    .header{
      position: absolute;
      height 1em;
      right: 14px;
      top: 11px;
      text-align right
      font-size: 21px;
      color: rgb(153, 153, 153);
      background-color transparent
      border none
      cursor: pointer;
    }
    .content{
      padding 1em
      .tip{
        display: flex;
        align-items: center;
        img{
          width  16px
          margin-right 5px
          vertical-align bottom
        }
        span{
          font-size 15px
        }
      }
      .progress-wrapper{
        margin-top: 15px;
      }
      .button-wrapper{
        display flex
        justify-content  space-between
        align-items: center
        margin-top: 20px;
      }

      .login-status {
        display: flex;
        align-items: center
      }

    }
  }
  .box-alert + .box-alert {
    margin-top: 0.35em;
  }
}
</style>
