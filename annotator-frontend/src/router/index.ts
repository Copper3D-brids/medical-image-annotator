// Composables
import {
  createRouter,
  createWebHistory,
  createWebHashHistory,
} from "vue-router";
import SegmentationLayout from "@/layouts/segmentation-layout/Default.vue";
import CalculationLayout from "@/layouts/calculation-layout/Default.vue";

const routes = [
  {
    path: "/",
    component: SegmentationLayout,
    children: [
      {
        path: "",
        name: "MainPage",
        // route level code-splitting
        // this generates a separate chunk (about.[hash].js) for this route
        // which is lazy-loaded when the route is visited.
        component: () => import("@/views/MainPage.vue"),
      },
    ],
  },
];


// use for the github repo

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// export default router;

// const router = createRouter({
//   history: createWebHashHistory(),
//   linkActiveClass: "active",
//   routes,
// });
// export default router;

// console.log(process.env.BASE_URL);

// const router = createRouter({
//   history: createWebHistory(),
//   routes,
// });

export default router;
