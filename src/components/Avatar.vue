<template>
  <div class="avatar-container">
    <div class="avatar-circle" :class="{ speaking }">
      <div class="avatar-icon"></div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  speaking: {
    type: Boolean,
    default: false,
  },
});
</script>
