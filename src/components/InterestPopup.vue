<template>
  <div
    class="fixed inset-0 z-50 grid place-items-center bg-navy/40 backdrop-blur-sm px-4"
    role="dialog"
    aria-modal="true"
    aria-label="관심사 선택"
    @keydown.escape="handleEscape"
  >
    <div
      ref="panelRef"
      tabindex="-1"
      class="w-full max-w-sm bg-white dark:bg-navy rounded-3xl border border-navy/10 dark:border-white/10 shadow-2xl p-6 sm:p-8 outline-none"
    >
      <!-- Header -->
      <h2 class="text-navy dark:text-white text-lg font-bold tracking-tight text-center">
        어떤 주제로 이야기할까요?
      </h2>
      <p class="text-navy/60 dark:text-white/60 text-xs text-center mt-1.5 leading-relaxed">
        주제를 선택하거나 직접 입력해 보세요
      </p>

      <!-- Quick Select Chips -->
      <div class="flex flex-wrap gap-2 mt-5 justify-center" role="listbox" aria-label="주제 선택">
        <button
          v-for="chip in chips"
          :key="chip"
          role="option"
          :aria-selected="selectedChip === chip"
          class="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
          :class="selectedChip === chip
            ? 'bg-blue text-white shadow-md shadow-blue/25'
            : 'bg-navy/5 dark:bg-white/5 text-navy dark:text-white border border-navy/10 dark:border-white/10 hover:bg-blue/10 hover:border-blue/30'"
          @click="handleChipSelect(chip)"
        >
          {{ chip }}
        </button>
      </div>

      <!-- Divider -->
      <div class="flex items-center gap-3 mt-5">
        <div class="flex-1 border-t border-navy/20 dark:border-white/10"></div>
        <span class="text-[10px] font-semibold text-navy/40 dark:text-white/30 uppercase tracking-widest">직접 입력</span>
        <div class="flex-1 border-t border-navy/20 dark:border-white/10"></div>
      </div>

      <!-- Text Input -->
      <div class="mt-3 relative">
        <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy/30 dark:text-white/30 pointer-events-none material-symbols-outlined text-base">edit</span>
        <input
          ref="inputRef"
          v-model="customInput"
          type="text"
          placeholder="주제를 직접 입력하세요 (예: 영화 추천, 요리 레시피)"
          class="w-full pl-9 pr-10 py-3 rounded-xl border border-navy/10 dark:border-white/10 bg-navy/5 dark:bg-white/5 text-navy dark:text-white text-sm placeholder:text-navy/40 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue/40 focus:border-blue/40 transition-all"
          @focus="handleInputFocus"
          @keydown.enter="handleStart"
        />
        <button
          v-if="customInput"
          type="button"
          class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-navy/40 dark:text-white/40 hover:bg-navy/10 dark:hover:bg-white/10 hover:text-navy dark:hover:text-white transition-colors"
          aria-label="입력값 지우기"
          @click="clearCustomInput"
        >
          <span class="material-symbols-outlined text-sm">close</span>
        </button>
      </div>

      <!-- Start Button -->
      <button
        :disabled="!finalTopic || isLoading"
        class="w-full mt-5 py-3 rounded-xl text-sm font-bold transition-all duration-200"
        :class="finalTopic && !isLoading
          ? 'bg-blue text-white shadow-lg shadow-blue/25 hover:shadow-xl hover:shadow-blue/30 active:scale-[0.98]'
          : 'bg-navy/10 dark:bg-white/10 text-navy/30 dark:text-white/30 cursor-not-allowed'"
        @click="handleStart"
      >
        <span v-if="isLoading" class="inline-flex items-center gap-2">
          <span class="inline-flex items-center gap-1" aria-hidden="true">
            <i class="w-1.5 h-1.5 rounded-full bg-white" style="animation: connecting-bounce 1s ease-in-out infinite"></i>
            <i class="w-1.5 h-1.5 rounded-full bg-white" style="animation: connecting-bounce 1s ease-in-out infinite 0.14s"></i>
            <i class="w-1.5 h-1.5 rounded-full bg-white" style="animation: connecting-bounce 1s ease-in-out infinite 0.28s"></i>
          </span>
          {{ loadingStepText }}
        </span>
        <span v-else>시작하기</span>
      </button>

      <!-- Error Message -->
      <p v-if="errorMessage" class="text-red text-xs text-center mt-3" role="alert">
        {{ errorMessage }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";

const props = defineProps({
  isLoading: { type: Boolean, default: false },
  errorMessage: { type: String, default: "" },
  loadingStep: { type: Number, default: 0 },
});

const emit = defineEmits(["start"]);

const panelRef = ref(null);
const inputRef = ref(null);

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

const selectedChip = ref("");
const customInput = ref("");

const finalTopic = computed(() => customInput.value.trim() || selectedChip.value);

function handleChipSelect(chip) {
  selectedChip.value = chip;
  customInput.value = "";
}

function handleInputFocus() {
  selectedChip.value = "";
}

function clearCustomInput() {
  customInput.value = "";
  inputRef.value?.focus();
}

function handleStart() {
  const topic = finalTopic.value;
  if (!topic || props.isLoading) return;
  localStorage.setItem(STORAGE_KEY, topic);
  emit("start", topic);
}

function handleEscape() {
  // 팝업이 처음 진입 시 필수로 선택해야 하므로 취소 불가
  // 필요 시 emit('close') 추가 가능
}

onMounted(() => {
  panelRef.value?.focus();
});
</script>
