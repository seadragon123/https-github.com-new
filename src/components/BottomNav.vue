<template>
  <van-tabbar v-model="active" :route="true" active-color="#8B5E3C" inactive-color="#8E8680" :border="false" class="mobile-bottom-nav">
    <van-tabbar-item v-for="tab in tabs" :key="tab.path" :to="tab.path" :icon="tab.icon">
      {{ tab.label }}
    </van-tabbar-item>
  </van-tabbar>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const active = ref(0)

const tabs = [
  { path: '/', icon: 'home-o', label: '首页' },
  { path: '/rooms', icon: 'hotel-o', label: '房间' },
  { path: '/guests', icon: 'contact', label: '客人' },
  { path: '/revenue', icon: 'gold-coin-o', label: '收入' },
  { path: '/bookings', icon: 'description-o', label: '订单' },
]

// Sync active tab with current route
watch(() => route.path, (path) => {
  const idx = tabs.findIndex(t => t.path === path)
  if (idx >= 0) active.value = idx
}, { immediate: true })
</script>

<style scoped>
.van-tabbar {
  max-width: 480px;
  left: 50% !important;
  transform: translateX(-50%);
}
@media (min-width: 768px) {
  .mobile-bottom-nav { display: none !important; }
}
</style>
