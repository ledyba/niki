import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import IndexPage from '../views/IndexPage.vue'
import dayjs from 'dayjs';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: () => {
      const now = dayjs();
      const year = now.year();
      const month = now.month() + 1;
      return `/${('0000'+year).slice(-4)}/${('00'+month).slice(-2)}`;
    }
  },
  {
    path: '/:year/:month',
    name: 'MonthList',
    component: IndexPage
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
