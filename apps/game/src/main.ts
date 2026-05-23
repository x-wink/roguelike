import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './ui/App.vue'
import './assets/styles/global.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#vue-ui')

if (import.meta.env.DEV) {
  // 延迟一个 tick 确保 pinia 已初始化，再挂到 window 供控制台调用
  Promise.resolve().then(async () => {
    const [{ useGameStore }, { useMetaStore }] = await Promise.all([
      import('./store/game'),
      import('./store/meta'),
    ])
    ;(window as unknown as Record<string, unknown>).__debug = {
      game: useGameStore(),
      meta: useMetaStore(),
    }
    console.info('[dev] __debug 已挂载：__debug.game / __debug.meta')
  })
}
