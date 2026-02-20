<template>
  <section class="chat-panel" :class="{ open }">
    <div class="panel-header">
      <span>Conversation</span>
      <button class="secondary-btn" @click="$emit('close')">Close</button>
    </div>
    <div class="log-list">
      <div v-for="item in renderItems" :key="item.key">
        <div v-if="item.type === 'divider'" class="log-date-divider">
          <span>{{ item.label }}</span>
        </div>
        <div v-else class="log-item" :class="item.entry.speaker">
          <div class="log-meta">
            <strong>{{ item.entry.speaker }}</strong>
            <time class="log-time">{{ item.dateTime }}</time>
          </div>
          <div>{{ item.entry.text }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  log: {
    type: Array,
    default: () => [],
  },
});

const renderItems = computed(() => {
  const reversed = [...props.log].reverse();
  const items = [];
  let previousDateKey = "";

  for (let i = 0; i < reversed.length; i += 1) {
    const entry = reversed[i];
    if (!entry || typeof entry.text !== "string") continue;
    const speaker =
      typeof entry.speaker === "string" && entry.speaker
        ? entry.speaker
        : "unknown";
    const ts = Number(entry?.ts) || Date.now();
    const dateKey = toDateKey(ts);
    if (dateKey !== previousDateKey) {
      items.push({
        type: "divider",
        key: `divider-${dateKey}-${i}`,
        label: formatDateOnly(ts),
      });
      previousDateKey = dateKey;
    }
    items.push({
      type: "entry",
      key: `entry-${i}-${ts}`,
      entry: { ...entry, speaker },
      dateTime: formatDateTime(ts),
    });
  }

  return items;
});

function toDateKey(ts) {
  const date = new Date(ts);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateOnly(ts) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(new Date(ts));
}

function formatDateTime(ts) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(ts));
}

defineEmits(["close"]);
</script>
