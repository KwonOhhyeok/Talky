<template>
  <div class="app-shell">
    <CallScreen />
  </div>
</template>

<script setup>
import CallScreen from "./components/CallScreen.vue";
</script>

<style scoped>
.app-shell {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
