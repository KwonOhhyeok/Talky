<template>
  <div class="control-bar">
    <button class="circle" @click="$emit('toggleChat')" aria-label="Toggle chat">
      <span aria-hidden="true">💬</span>
    </button>
    <button
      class="circle hangup"
      :class="{ live: callActive }"
      @click="$emit('toggleCall')"
      :aria-label="callActive ? 'Stop call' : 'Start call'"
    >
      <span aria-hidden="true">📞</span>
    </button>
    <button class="circle" @click="$emit('toggleMenu')" aria-label="Settings">
      <span aria-hidden="true">⚙️</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  callActive: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["toggleCall", "toggleChat", "toggleMenu"]);
</script>
