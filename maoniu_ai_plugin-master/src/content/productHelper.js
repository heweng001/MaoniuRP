import { createApp } from "vue";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import productHelper from "./productHelper.vue";

const div = document.createElement("div");
div.setAttribute("id", "ai-product-helper");
document.body.insertBefore(div, document.body.firstChild);

let app = createApp(productHelper);
app.use(ElementPlus);
app.mount("#ai-product-helper");
