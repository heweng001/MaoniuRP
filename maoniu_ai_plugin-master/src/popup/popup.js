import {createApp} from 'vue';
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import popup from "./popup.vue";


let app = createApp(popup);
app.use(ElementPlus)
app.mount("#app");
