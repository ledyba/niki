import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Home from '../views/Index.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Index',
    component: Home
  },
  {
    path: '/:year/:month',
    name: 'MonthList',
    component: Home
  },
//  {
//    path: '/about',
//    name: 'About',
//    // route level code-splitting
//    // this generates a separate chunk (about.[hash].js) for this route
//    // which is lazy-loaded when the route is visited.
//    component: () => import(/* webpackChunkName: "about" */ '../views/About.vue')
//  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
