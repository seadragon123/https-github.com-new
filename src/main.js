import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import './style.css'

// Vant 按需引入
import { 
  Tabbar, TabbarItem,
  Dialog, Toast, Empty, 
  Progress, Skeleton,
  ActionSheet, Notify
} from 'vant'
import 'vant/lib/index.css'

const app = createApp(App)
app.use(router)

app.use(Tabbar)
app.use(TabbarItem)
app.use(Dialog)
app.use(Toast)
app.use(Empty)
app.use(Progress)
app.use(Skeleton)
app.use(ActionSheet)
app.use(Notify)

app.mount('#app')
