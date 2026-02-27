<template>
  <section
    class="absolute inset-0 z-40 bg-white/95 dark:bg-background-dark/95 backdrop-blur-lg p-4 sm:p-6 flex flex-col gap-4 transition-transform duration-300"
    :class="open ? 'translate-y-0' : 'translate-y-full'"
  >
    <div class="flex items-center justify-between">
      <span class="text-slate-800 dark:text-white font-bold">Conversation</span>
      <button
        class="px-3 py-1.5 rounded-lg border border-secondary/20 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-secondary/10 transition-colors"
        @click="$emit('close')"
      >
        Close
      </button>
    </div>
    <div class="flex-1 overflow-y-auto flex flex-col gap-2.5">
      <div v-for="item in renderItems" :key="item.key">
        <div
          v-if="item.type === 'divider'"
          class="flex items-center gap-2.5 text-slate-400 dark:text-slate-500 text-[11px] font-bold tracking-wide"
        >
          <span class="flex-1 h-px bg-secondary/30"></span>
          <span>{{ item.label }}</span>
          <span class="flex-1 h-px bg-secondary/30"></span>
        </div>
        <div
          v-else
          class="rounded-xl p-3 bg-white dark:bg-slate-800 border border-secondary/15 text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300"
          :class="{
            'border-l-[3px] border-l-blue-500': item.entry.speaker === 'user',
            'border-l-[3px] border-l-primary': item.entry.speaker === 'model',
          }"
        >
          <div class="flex items-baseline justify-between gap-2 mb-1">
            <strong class="capitalize text-slate-800 dark:text-slate-200">{{ item.entry.speaker }}</strong>
            <time class="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">{{ item.dateTime }}</time>
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
