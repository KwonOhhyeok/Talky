<template>
  <div class="control-bar">
    <button class="circle" @click="$emit('toggleChat')" aria-label="Toggle chat">
      💬
    </button>
    <button class="circle hangup" @click="$emit('hangup')" aria-label="End call">
      📞
    </button>
    <button class="circle" @click="$emit('toggleMenu')" aria-label="Settings">
      ◻◻
    </button>
  </div>
</template>

<script setup>
defineEmits(["hangup", "toggleChat", "toggleMenu"]);
</script>
