<template>
  <div
    class="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-sm px-4"
    role="dialog"
    aria-modal="true"
    aria-label="관심사 선택"
    @keydown.escape="handleEscape"
  >
    <div
      ref="panelRef"
      tabindex="-1"
      class="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-secondary/20 shadow-2xl p-6 sm:p-8 outline-none"
    >
      <!-- Header -->
      <h2 class="text-slate-800 dark:text-white text-lg font-bold tracking-tight text-center">
        어떤 주제로 이야기할까요?
      </h2>
      <p class="text-slate-500 dark:text-slate-400 text-xs text-center mt-1.5 leading-relaxed">
        주제를 선택하거나 직접 입력해 보세요
      </p>

      <!-- Quick Select Chips -->
      <div class="flex flex-wrap gap-2 mt-5 justify-center" role="listbox" aria-label="주제 선택">
        <button
          v-for="chip in chips"
          :key="chip"
          role="option"
          :aria-selected="interest === chip"
          class="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
          :class="interest === chip
            ? 'bg-primary text-slate-800 shadow-md shadow-primary/25'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-primary/10 hover:border-primary/30'"
          @click="interest = chip"
        >
          {{ chip }}
        </button>
      </div>

      <!-- Text Input -->
      <div class="mt-5">
        <input
          v-model="interest"
          type="text"
          :placeholder="placeholderText"
          class="w-full px-4 py-3 rounded-xl border border-secondary/20 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
          @keydown.enter="handleStart"
        />
      </div>

      <!-- Start Button -->
      <button
        :disabled="!interest.trim() || isLoading"
        class="w-full mt-5 py-3 rounded-xl text-sm font-bold transition-all duration-200"
        :class="interest.trim() && !isLoading
          ? 'bg-primary text-slate-800 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]'
          : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'"
        @click="handleStart"
      >
        <span v-if="isLoading" class="inline-flex items-center gap-2">
          <span class="inline-flex items-center gap-1" aria-hidden="true">
            <i class="w-1.5 h-1.5 rounded-full bg-slate-600" style="animation: connecting-bounce 1s ease-in-out infinite"></i>
            <i class="w-1.5 h-1.5 rounded-full bg-slate-600" style="animation: connecting-bounce 1s ease-in-out infinite 0.14s"></i>
            <i class="w-1.5 h-1.5 rounded-full bg-slate-600" style="animation: connecting-bounce 1s ease-in-out infinite 0.28s"></i>
          </span>
          {{ loadingStepText }}
        </span>
        <span v-else>시작하기</span>
      </button>

      <!-- Error Message -->
      <p v-if="errorMessage" class="text-red-500 text-xs text-center mt-3" role="alert">
        {{ errorMessage }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";

const props = defineProps({
  isLoading: { type: Boolean, default: false },
  errorMessage: { type: String, default: "" },
  loadingStep: { type: Number, default: 0 },
});

const emit = defineEmits(["start"]);

const panelRef = ref(null);

const chips = [
  "AI가 번역가 일자리를 대체할까?",
  "재택근무 vs 출근, 생산성은?",
  "K-pop 해외 인기, 오래 갈까?",
  "비건 식단, 건강과 환경 모두 이득일까?",
  "1인 여행이 커플 여행보다 좋을까?",
  "부동산 투자, 지금이 적기일까?",
  "주 4일제, 한국에서도 가능할까?",
  "사이드 프로젝트로 월급 외 수익 만들기",
];

const LOADING_STEPS = ["주제 분석 중...", "수업 자료 작성 중...", "마무리 중..."];

const loadingStepText = computed(() => {
  return LOADING_STEPS[props.loadingStep] ?? LOADING_STEPS[0];
});

const STORAGE_KEY = "talky:last_interest";
const lastInterest = localStorage.getItem(STORAGE_KEY) || "";
const interest = ref(lastInterest);

const placeholderText = computed(() =>
  lastInterest && !interest.value
    ? `최근 입력한 관심사: ${lastInterest}`
    : "오늘 대화하고 싶은 주제를 입력하세요"
);

function handleStart() {
  const trimmed = interest.value.trim();
  if (!trimmed || props.isLoading) return;
  localStorage.setItem(STORAGE_KEY, trimmed);
  emit("start", trimmed);
}

function handleEscape() {
  // 팝업이 처음 진입 시 필수로 선택해야 하므로 취소 불가
  // 필요 시 emit('close') 추가 가능
}

onMounted(() => {
  panelRef.value?.focus();
});
</script>
