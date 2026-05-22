import { createRouter, createWebHistory } from 'vue-router'
import IconArena from '~icons/lucide/swords'
import IconStats from '~icons/lucide/bar-chart-2'
import IconSkills from '~icons/lucide/zap'
import IconBuffs from '~icons/lucide/sparkles'
import IconEffects from '~icons/lucide/flask-conical'
import IconFonts from '~icons/lucide/type'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('@/ui/views/Landing.vue') },
    { path: '/game', redirect: '/game/home' },
    { path: '/game/home', component: () => import('@/ui/views/game/GameHome.vue') },
    { path: '/game/map', redirect: '/game/home' },
    { path: '/game/battle', component: () => import('@/ui/views/game/GameBattle.vue') },
    { path: '/game/relic-pick', component: () => import('@/ui/views/game/GameRelicPick.vue') },
    { path: '/game/skill-pick', component: () => import('@/ui/views/game/GameSkillPick.vue') },
    { path: '/game/rest', component: () => import('@/ui/views/game/GameRest.vue') },
    { path: '/game/event', component: () => import('@/ui/views/game/GameEvent.vue') },
    { path: '/game/shop', component: () => import('@/ui/views/game/GameShop.vue') },
    { path: '/game/result', component: () => import('@/ui/views/game/GameResult.vue') },
    { path: '/game/story', component: () => import('@/ui/views/game/StoryScene.vue') },
    {
      path: '/debug',
      children: [
        {
          path: 'arena',
          component: () => import('@/ui/views/debug/Arena.vue'),
          meta: { label: '对战', icon: IconArena },
        },
        {
          path: 'stats',
          component: () => import('@/ui/views/debug/Stats.vue'),
          meta: { label: '属性', icon: IconStats },
        },
        {
          path: 'skills',
          component: () => import('@/ui/views/debug/Skills.vue'),
          meta: { label: '技能', icon: IconSkills },
        },
        {
          path: 'buffs',
          component: () => import('@/ui/views/debug/Buffs.vue'),
          meta: { label: 'Buff', icon: IconBuffs },
        },
        {
          path: 'effects',
          component: () => import('@/ui/views/debug/BuffEffects.vue'),
          meta: { label: '效果', icon: IconEffects },
        },
        {
          path: 'fonts',
          component: () => import('@/ui/views/debug/Fonts.vue'),
          meta: { label: '字体', icon: IconFonts },
        },
      ],
    },
  ],
})

export default router
