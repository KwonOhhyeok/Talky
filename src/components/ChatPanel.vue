<template>
  <section class="chat-panel" :class="{ open }">
    <div class="panel-header">
      <span>Conversation</span>
      <button class="secondary-btn" @click="$emit('close')">Close</button>
    </div>
    <div class="log-list">
      <div
        v-for="(entry, index) in log"
        :key="index"
        class="log-item"
        :class="entry.speaker"
      >
        <strong>{{ entry.speaker }}</strong>
        <div>{{ entry.text }}</div>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  log: {
    type: Array,
    default: () => [],
  },
});

defineEmits(["close"]);
</script>
