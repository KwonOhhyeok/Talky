<template>
  <section
    class="absolute inset-0 z-40 bg-white dark:bg-navy backdrop-blur-lg p-4 sm:p-6 flex flex-col gap-4 transition-transform duration-300"
    :class="open ? 'translate-y-0' : 'translate-y-full'"
    role="dialog"
    aria-modal="true"
    aria-label="대화 기록"
    @keydown.escape="$emit('close')"
  >
    <div class="flex items-center justify-between">
      <span class="text-navy dark:text-white font-bold">대화 기록</span>
      <button
        class="px-3 py-1.5 rounded-lg border border-navy/10 dark:border-white/10 bg-white dark:bg-navy text-navy dark:text-white text-xs font-bold hover:bg-navy/10 dark:hover:bg-white/10 transition-colors"
        @click="$emit('close')"
      >
        닫기
      </button>
    </div>

    <!-- 빈 상태 -->
    <div v-if="!renderItems.length" class="flex-1 flex flex-col items-center justify-center gap-3 text-center">
      <span class="material-symbols-outlined text-4xl text-navy/20 dark:text-white/20">chat_bubble_outline</span>
      <p class="text-navy/50 dark:text-white/50 text-sm">아직 대화 기록이 없어요.<br/>통화를 시작하면 여기에 표시됩니다.</p>
    </div>

    <div v-else class="flex-1 overflow-y-auto flex flex-col gap-2.5" style="overscroll-behavior: contain">
      <div v-for="item in renderItems" :key="item.key">
        <div
          v-if="item.type === 'divider'"
          class="flex items-center gap-2.5 text-navy/40 dark:text-white/40 text-[11px] font-bold tracking-wide"
        >
          <span class="flex-1 h-px bg-navy/10 dark:bg-white/10"></span>
          <span>{{ item.label }}</span>
          <span class="flex-1 h-px bg-navy/10 dark:bg-white/10"></span>
        </div>
        <div
          v-else
          class="rounded-xl p-3 bg-white dark:bg-navy/60 border border-navy/10 dark:border-white/10 text-xs sm:text-sm leading-relaxed text-navy dark:text-white"
          :class="{
            'border-l-[3px] border-l-blue': item.entry.speaker === 'user',
            'border-l-[3px] border-l-teal': item.entry.speaker === 'model',
          }"
        >
          <div class="flex items-baseline justify-between gap-2 mb-1">
            <strong class="text-navy dark:text-white">{{ speakerLabel(item.entry.speaker) }}</strong>
            <time class="text-[11px] text-navy/40 dark:text-white/40 whitespace-nowrap">{{ item.dateTime }}</time>
          </div>
          <div lang="en">{{ item.entry.text }}</div>
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

defineEmits(["close"]);

function speakerLabel(speaker) {
  if (speaker === "model") return "Jesica 선생님";
  if (speaker === "user") return "나";
  return speaker;
}

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
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(new Date(ts));
}

function formatDateTime(ts) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ts));
}
</script>
