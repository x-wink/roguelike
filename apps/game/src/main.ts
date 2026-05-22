import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './ui/App.vue'
import './assets/styles/global.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#vue-ui')
