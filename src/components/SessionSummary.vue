<template>
  <div class="w-full max-w-sm mx-auto flex flex-col items-center gap-5 px-2 py-4">
    <!-- 완료 아이콘 & 헤더 -->
    <div class="flex flex-col items-center gap-2">
      <div class="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
        <span class="material-symbols-outlined text-4xl text-emerald-500" style="font-variation-settings: 'FILL' 1">check_circle</span>
      </div>
      <h2 class="text-slate-800 dark:text-white text-xl font-bold tracking-tight text-center">오늘 수업 수고했어요!</h2>
      <p class="text-slate-500 dark:text-slate-400 text-sm text-center">
        {{ lessonTopic || '영어 회화 수업' }}을 주제로 대화했어요
      </p>
    </div>

    <!-- 세션 통계 카드 -->
    <div class="w-full rounded-2xl bg-primary/10 border border-primary/20 p-5 grid grid-cols-2 gap-4">
      <div class="flex flex-col items-center gap-1">
        <span class="material-symbols-outlined text-2xl text-primary">timer</span>
        <span class="text-2xl font-bold text-slate-800 dark:text-white">{{ durationFormatted }}</span>
        <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">통화 시간</span>
      </div>
      <div class="flex flex-col items-center gap-1">
        <span class="material-symbols-outlined text-2xl text-secondary">forum</span>
        <span class="text-2xl font-bold text-slate-800 dark:text-white">{{ turnCount }}</span>
        <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">대화 턴</span>
      </div>
    </div>

    <!-- CTA 버튼들 -->
    <div class="w-full flex flex-col gap-2.5">
      <button
        class="w-full py-3 rounded-xl bg-primary text-slate-800 font-bold text-sm transition-all hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98]"
        @click="$emit('viewChat')"
      >
        대화 기록 보기
      </button>
      <button
        class="w-full py-3 rounded-xl bg-white dark:bg-slate-800 border border-secondary/20 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-all hover:bg-secondary/10 active:scale-[0.98]"
        @click="$emit('practiceAgain')"
      >
        같은 주제로 다시 연습
      </button>
      <button
        class="w-full py-3 rounded-xl bg-white dark:bg-slate-800 border border-secondary/20 text-slate-500 dark:text-slate-400 font-semibold text-sm transition-all hover:bg-secondary/10 active:scale-[0.98]"
        @click="$emit('newTopic')"
      >
        새 주제 시작
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  durationSeconds: { type: Number, default: 0 },
  turnCount: { type: Number, default: 0 },
  lessonTopic: { type: String, default: "" },
});

defineEmits(["viewChat", "practiceAgain", "newTopic"]);

const durationFormatted = computed(() => {
  const m = Math.floor(props.durationSeconds / 60);
  const s = props.durationSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
});
</script>
